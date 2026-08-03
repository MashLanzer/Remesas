import "server-only";
import admin from "firebase-admin";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";

// Envío de notificaciones push (FCM) desde el servidor. Tolerante: si faltan los
// secretos (FIREBASE_SERVICE_ACCOUNT / SUPABASE_SERVICE_ROLE_KEY), no hace nada.

function getApp(): admin.app.App | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  if (admin.apps.length) return admin.app();
  try {
    const cred = JSON.parse(raw);
    return admin.initializeApp({ credential: admin.credential.cert(cred) });
  } catch {
    return null;
  }
}

// Cliente Supabase con service_role: lee los tokens de CUALQUIER usuario
// (fuera de RLS) para poder avisar al destinatario correcto.
function adminSb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !SUPABASE_URL) return null;
  return createSbClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type PushPayload = { title: string; body: string; url?: string };

export type NotifyPayload = {
  type: string;
  title: string;
  body?: string;
  url?: string;
  operatorId?: string | null;
};

// Notificación COMPLETA: guarda la fila in-app (campana) para cada destinatario
// Y manda el push. Un solo lugar por evento. Tolerante: si falta el service_role
// no guarda in-app; si falta Firebase, no manda push; nunca rompe la acción.
export async function notify(
  userIds: (string | null | undefined)[],
  payload: NotifyPayload
): Promise<void> {
  const ids = Array.from(new Set(userIds.filter(Boolean) as string[]));
  if (ids.length === 0) return;

  // 1) In-app (tabla notifications) con el cliente admin (fuera de RLS).
  try {
    const sb = adminSb();
    if (sb) {
      await sb.from("notifications").insert(
        ids.map((id) => ({
          recipient_id: id,
          operator_id: payload.operatorId ?? null,
          type: payload.type,
          title: payload.title,
          body: payload.body ?? null,
          url: payload.url ?? null,
        }))
      );
    }
  } catch {
    /* nada */
  }

  // 2) Push al teléfono.
  await sendPushToUsers(ids, {
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url,
  });
}

// Envía a todos los dispositivos de los usuarios indicados. Fire-and-forget:
// nunca lanza (los errores se tragan) para no romper la acción que lo llama.
export async function sendPushToUsers(
  userIds: (string | null | undefined)[],
  payload: PushPayload
): Promise<void> {
  try {
    const ids = Array.from(new Set(userIds.filter(Boolean) as string[]));
    if (ids.length === 0) return;
    const app = getApp();
    const sb = adminSb();
    if (!app || !sb) return;

    const { data } = await sb
      .from("push_tokens")
      .select("token")
      .in("user_id", ids);
    const tokens = ((data as { token: string }[]) ?? [])
      .map((r) => r.token)
      .filter(Boolean);
    if (tokens.length === 0) return;

    const res = await admin.messaging(app).sendEachForMulticast({
      tokens,
      notification: { title: payload.title, body: payload.body },
      data: payload.url ? { url: payload.url } : {},
      android: {
        priority: "high",
        notification: { sound: "default", channelId: "default" },
      },
    });

    // Limpia tokens inválidos (desinstalados / caducados).
    const dead: string[] = [];
    res.responses.forEach((r, i) => {
      const code = r.error?.code;
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token" ||
        code === "messaging/invalid-argument"
      ) {
        dead.push(tokens[i]);
      }
    });
    if (dead.length > 0) {
      await sb.from("push_tokens").delete().in("token", dead);
    }
  } catch {
    /* nunca romper por un fallo de push */
  }
}

// Aviso de un aporte a la vaquita: al organizador y al operador. Usa el cliente
// admin para resolver a quién avisar a partir del token público.
export async function notifyVaquitaContribution(
  token: string,
  name: string,
  amount: number
): Promise<void> {
  try {
    const sb = adminSb();
    if (!sb) return;
    const { data } = await sb
      .from("vaquitas")
      .select("id, organizer_client_id, operator_id, title, beneficiary_name, goal_usd")
      .eq("share_token", token)
      .maybeSingle();
    const v = data as {
      id: string;
      organizer_client_id: string;
      operator_id: string;
      title: string | null;
      beneficiary_name: string;
      goal_usd: number | null;
    } | null;
    if (!v) return;
    const label = v.title || v.beneficiary_name;
    await notify([v.organizer_client_id], {
      type: "vaquita_aporte",
      title: "Nuevo aporte a tu vaquita 👥",
      body: `${name} aportó $${amount} a ${label}.`,
      url: `/c/vaquita/${v.id}`,
      operatorId: v.operator_id,
    });
    await notify([v.operator_id], {
      type: "vaquita_aporte_confirmar",
      title: "Aporte de vaquita por confirmar 👥",
      body: `${name} aportó $${amount} · ${label}.`,
      url: "/vaquitas",
      operatorId: v.operator_id,
    });

    // ¿Este aporte alcanzó la meta? (aviso una sola vez, al cruzarla)
    const goal = Number(v.goal_usd) || 0;
    if (goal > 0) {
      const { data: sumRow } = await sb
        .from("vaquita_contributions")
        .select("amount_usd")
        .eq("vaquita_id", v.id);
      const raised = ((sumRow as { amount_usd: number }[]) ?? []).reduce(
        (s, x) => s + Number(x.amount_usd),
        0
      );
      const prev = raised - amount;
      if (prev < goal && raised >= goal) {
        await notify([v.organizer_client_id], {
          type: "vaquita_meta",
          title: "🎉 ¡Meta alcanzada!",
          body: `Tu vaquita para ${v.beneficiary_name} llegó a la meta.`,
          url: `/c/vaquita/${v.id}`,
        });
      }
    }
  } catch {
    /* nada */
  }
}

// Aviso de un anuncio del negocio a su audiencia (clientes y/o repartidores).
// Usa el cliente admin para resolver los destinatarios (fuera de RLS).
export async function notifyAnnouncement(
  operatorId: string,
  audience: "clientes" | "repartidores" | "ambos",
  a: { emoji?: string | null; title: string; body?: string | null }
): Promise<void> {
  try {
    const sb = adminSb();
    if (!sb || !operatorId) return;
    const title = `${a.emoji ? a.emoji + " " : "📣 "}${a.title}`;
    const body = a.body || undefined;

    if (audience === "clientes" || audience === "ambos") {
      const { data } = await sb
        .from("profiles")
        .select("id")
        .eq("operator_id", operatorId)
        .eq("role", "cliente");
      const ids = ((data as { id: string }[]) ?? []).map((r) => r.id);
      await notify(ids, { type: "anuncio", title, body, url: "/c", operatorId });
    }
    if (audience === "repartidores" || audience === "ambos") {
      const { data } = await sb
        .from("profiles")
        .select("id")
        .eq("operator_id", operatorId)
        .eq("role", "repartidor")
        .eq("member_status", "active");
      const ids = ((data as { id: string }[]) ?? []).map((r) => r.id);
      await notify(ids, { type: "anuncio", title, body, url: "/", operatorId });
    }
  } catch {
    /* nada */
  }
}
