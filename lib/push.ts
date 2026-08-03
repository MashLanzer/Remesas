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
      .select("id, organizer_client_id, operator_id, title, beneficiary_name")
      .eq("share_token", token)
      .maybeSingle();
    const v = data as {
      id: string;
      organizer_client_id: string;
      operator_id: string;
      title: string | null;
      beneficiary_name: string;
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
  } catch {
    /* nada */
  }
}
