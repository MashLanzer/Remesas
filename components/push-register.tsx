"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { savePushToken } from "@/app/actions";

// Registra el dispositivo para notificaciones push (solo en el APK nativo).
// Pide permiso, obtiene el token de FCM y lo guarda. Al tocar una notificación,
// navega a la pantalla indicada en sus datos (url).
export function PushRegister() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { PushNotifications } = await import(
          "@capacitor/push-notifications"
        );
        let perm = await PushNotifications.checkPermissions();
        if (
          perm.receive === "prompt" ||
          perm.receive === "prompt-with-rationale"
        ) {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== "granted") return;
        await PushNotifications.register();

        const reg = await PushNotifications.addListener(
          "registration",
          (t) => {
            void savePushToken(t.value);
          }
        );
        const tap = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (a) => {
            const url = (a.notification?.data as { url?: string })?.url;
            if (url) window.location.href = url;
          }
        );
        cleanup = () => {
          void reg.remove();
          void tap.remove();
        };
      } catch {
        /* nada */
      }
    })();
    return () => cleanup?.();
  }, []);

  return null;
}
