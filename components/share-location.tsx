"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, Loader2 } from "lucide-react";
import { updateDeliveryLocation } from "@/app/actions";

// Control del repartidor para compartir su ubicación en vivo durante la
// entrega. Usa la geolocalización del dispositivo (pide permiso) y envía la
// posición cada pocos segundos mientras esté activo. Lado negocio: en español.
export function ShareLocation({ remittanceId }: { remittanceId: string }) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const watchRef = useRef<number | null>(null);
  const lastRef = useRef(0);

  function clear() {
    if (watchRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
    }
    watchRef.current = null;
  }

  useEffect(() => clear, []);

  function start() {
    if (!("geolocation" in navigator)) {
      setError("Este dispositivo no permite ubicación.");
      return;
    }
    setError(null);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastRef.current < 4000) return; // no saturar
        lastRef.current = now;
        updateDeliveryLocation(
          remittanceId,
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy
        );
        setSent(true);
      },
      () => {
        setError("No pudimos obtener tu ubicación. Revisa los permisos.");
        stop();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    watchRef.current = id as unknown as number;
    setSharing(true);
  }

  function stop() {
    clear();
    setSharing(false);
    setSent(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={sharing ? stop : start}
        className={
          "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition active:scale-[0.98] " +
          (sharing
            ? "bg-blue-600 text-white"
            : "border border-border text-foreground")
        }
      >
        {sharing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Compartiendo ubicación ·
            tocar para detener
          </>
        ) : (
          <>
            <Navigation className="h-4 w-4" /> Compartir mi ubicación en vivo
          </>
        )}
      </button>
      {sharing && sent && (
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          El cliente ve tu ubicación en el mapa de su pedido.
        </p>
      )}
      {error && (
        <p className="mt-1 text-center text-[11px] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
