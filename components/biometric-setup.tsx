"use client";

import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { useDialog } from "@/components/confirm";
import { useT } from "@/components/lang-provider";
import { pinEnabled } from "@/lib/pin";
import {
  biometricSupported,
  biometricEnabled,
  registerBiometric,
  disableBiometric,
} from "@/lib/biometric";

// Control de "Desbloqueo con huella o rostro" para Ajustes. Es un COMPLEMENTO
// del PIN: requiere tener un PIN activo (que queda como respaldo). Usa WebAuthn
// con el autenticador de plataforma del dispositivo.
export function BiometricSetup() {
  const { notify } = useDialog();
  const t = useT();
  const [mounted, setMounted] = useState(false);
  // null = aún comprobando; false = el dispositivo NO tiene biometría.
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEnabled(biometricEnabled());
    setHasPin(pinEnabled());
    biometricSupported().then(setSupported);
  }, []);

  async function enable() {
    if (!pinEnabled()) {
      notify(t("Primero activa un PIN; la biometría lo complementa."));
      return;
    }
    setBusy(true);
    const ok = await registerBiometric();
    setBusy(false);
    if (ok) {
      setEnabled(true);
      notify(t("Biometría activada"));
    } else {
      notify(t("No se pudo activar la biometría."));
    }
  }

  function disable() {
    disableBiometric();
    setEnabled(false);
    notify(t("Biometría desactivada"));
  }

  // Mientras comprueba (null) o si el dispositivo no tiene biometría (false),
  // no se muestra nada: no tiene sentido ofrecer algo que no existe aquí.
  if (!mounted || !supported) return null;

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
            <Fingerprint
              className={"h-5 w-5 " + (enabled ? "text-income" : "")}
            />
          </span>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">
              {t("Huella o rostro")}
            </p>
            <p className="text-xs text-muted-foreground">
              {enabled
                ? t("Activado · desbloquea sin el PIN")
                : t("Desbloqueo rápido, con el PIN de respaldo")}
            </p>
          </div>
        </div>
        {enabled ? (
          <button
            onClick={disable}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-destructive transition active:scale-95"
          >
            {t("Quitar")}
          </button>
        ) : (
          <button
            onClick={enable}
            disabled={busy || !hasPin}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition active:scale-95 disabled:opacity-50"
          >
            {busy ? t("Activando…") : t("Activar")}
          </button>
        )}
      </div>
    </div>
  );
}
