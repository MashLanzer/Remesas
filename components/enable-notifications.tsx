"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import {
  savePushSubscription,
  savePushToken,
  removePushSubscription,
} from "@/app/actions";

// Clave VAPID PÚBLICA (segura de exponer). La privada vive solo en el servidor.
const VAPID_PUBLIC_KEY =
  "BIq6-1ksSmu2M_8T64D3Q3W_hxi8VhJW7tSNkQV1V8HP0Z23pBMk_D2N4WFOib0Pro5vLuxFOpQ01yWlWODf2kE";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "off" | "on" | "denied" | "working";

export function EnableNotifications() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    (async () => {
      // ¿Nativo (APK)? Push por FCM si el plugin está disponible.
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) {
          // El estado real se gestiona en enableNative(); mostramos el botón.
          setState("off");
          return;
        }
      } catch {
        /* sin Capacitor: seguimos con web */
      }

      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        setState(sub ? "on" : "off");
      } catch {
        setState("off");
      }
    })();
  }, []);

  async function enableNative(): Promise<boolean> {
    try {
      // Accedemos al plugin por el global de Capacitor (no importamos el paquete
      // npm, así el build web no depende de que esté instalado). Estará presente
      // cuando el APK se recompile con @capacitor/push-notifications + Firebase.
      const cap = (
        window as unknown as {
          Capacitor?: {
            isNativePlatform?: () => boolean;
            Plugins?: Record<string, unknown>;
          };
        }
      ).Capacitor;
      if (!cap?.isNativePlatform?.()) return false;
      const PN = cap.Plugins?.PushNotifications as
        | {
            requestPermissions: () => Promise<{ receive: string }>;
            register: () => Promise<void>;
            addListener: (
              ev: string,
              cb: (t: { value: string }) => void
            ) => void;
          }
        | undefined;
      if (!PN) return false; // plugin no instalado todavía → intentar web
      const perm = await PN.requestPermissions();
      if (perm.receive !== "granted") {
        setState("denied");
        return true;
      }
      PN.addListener("registration", async (t: { value: string }) => {
        await savePushToken(t.value);
        setState("on");
      });
      await PN.register();
      return true;
    } catch {
      return false;
    }
  }

  async function enable() {
    setState("working");
    // 1) Nativo (APK)
    if (await enableNative()) return;

    // 2) Web / PWA
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("off");
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  if (state === "denied") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <BellOff className="h-5 w-5" />
        </span>
        <p className="text-xs text-muted-foreground">
          Notificaciones bloqueadas. Actívalas desde los ajustes de tu navegador
          o teléfono para saber cuándo llega tu remesa.
        </p>
      </div>
    );
  }

  if (state === "on") {
    return (
      <button
        onClick={disable}
        className="flex w-full items-center gap-3 rounded-2xl border border-income/25 bg-income/5 p-3.5 text-left transition active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-income/10 text-income">
          <BellRing className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">
            Notificaciones activadas
          </span>
          <span className="block text-xs text-muted-foreground">
            Te avisamos cuando tu remesa cambie de estado. Toca para desactivar.
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={state === "working"}
      className="flex w-full items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-3.5 text-left transition active:scale-[0.99] disabled:opacity-70"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {state === "working" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">
          Activar notificaciones
        </span>
        <span className="block text-xs text-muted-foreground">
          Entérate al instante cuando tu envío va en camino y cuando se entrega.
        </span>
      </span>
    </button>
  );
}
