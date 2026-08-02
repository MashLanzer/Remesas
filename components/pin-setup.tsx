"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useDialog } from "@/components/confirm";
import { PIN_KEY, PIN_SESSION, hashPin } from "@/lib/pin";

// Control de "Bloqueo con PIN" para la sección de Ajustes. Activa, cambia o
// quita un PIN de 4 dígitos guardado en el dispositivo.
export function PinSetup() {
  const { notify } = useDialog();
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState(false);
  const [current, setCurrent] = useState("");
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      setEnabled(!!localStorage.getItem(PIN_KEY));
    } catch {
      /* nada */
    }
  }, []);

  function reset() {
    setForm(false);
    setCurrent("");
    setPin1("");
    setPin2("");
    setMsg(null);
  }

  async function save() {
    setMsg(null);
    if (enabled) {
      const stored = localStorage.getItem(PIN_KEY);
      if (!stored || (await hashPin(current)) !== stored) {
        setMsg("PIN actual incorrecto.");
        return;
      }
    }
    if (!/^\d{4}$/.test(pin1)) {
      setMsg("El PIN debe ser de 4 dígitos.");
      return;
    }
    if (pin1 !== pin2) {
      setMsg("Los PIN no coinciden.");
      return;
    }
    try {
      localStorage.setItem(PIN_KEY, await hashPin(pin1));
      sessionStorage.setItem(PIN_SESSION, "1");
    } catch {
      /* nada */
    }
    setEnabled(true);
    reset();
    notify("PIN guardado");
  }

  async function disable() {
    // Pide el PIN actual antes de quitarlo.
    if (!form) {
      setForm(true);
      return;
    }
    const stored = localStorage.getItem(PIN_KEY);
    if (!stored || (await hashPin(current)) !== stored) {
      setMsg("PIN actual incorrecto.");
      return;
    }
    try {
      localStorage.removeItem(PIN_KEY);
      sessionStorage.removeItem(PIN_SESSION);
    } catch {
      /* nada */
    }
    setEnabled(false);
    reset();
    notify("Bloqueo desactivado");
  }

  if (!mounted) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
            {enabled ? (
              <ShieldCheck className="h-5 w-5 text-income" />
            ) : (
              <ShieldOff className="h-5 w-5" />
            )}
          </span>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Bloqueo con PIN</p>
            <p className="text-xs text-muted-foreground">
              {enabled ? "Activado · se pide al abrir" : "Protege la app al abrir"}
            </p>
          </div>
        </div>
        {!form && (
          <button
            onClick={() => setForm(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition active:scale-95"
          >
            {enabled ? "Cambiar" : "Activar"}
          </button>
        )}
      </div>

      {form && (
        <div className="mt-3 space-y-2">
          {enabled && (
            <PinField
              value={current}
              onChange={setCurrent}
              placeholder="PIN actual"
            />
          )}
          <PinField value={pin1} onChange={setPin1} placeholder="Nuevo PIN (4 dígitos)" />
          <PinField value={pin2} onChange={setPin2} placeholder="Repite el PIN" />
          {msg && <p className="text-xs font-medium text-destructive">{msg}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={reset}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-semibold text-foreground transition active:scale-[0.98]"
            >
              Cancelar
            </button>
            <button
              onClick={save}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
            >
              Guardar
            </button>
          </div>
          {enabled && (
            <button
              onClick={disable}
              className="w-full py-1 text-center text-xs font-semibold text-destructive"
            >
              Quitar el bloqueo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PinField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="password"
      inputMode="numeric"
      maxLength={4}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
      placeholder={placeholder}
      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-center text-lg font-bold tracking-[0.4em] text-foreground outline-none focus:border-primary"
    />
  );
}
