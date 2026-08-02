"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/lang-provider";
import { getDeliveryLocation } from "@/app/actions";
import { PROVINCE_CENTROIDS, CUBA_CENTER } from "@/lib/cuba-geo";

// Mapa real con Leaflet + OpenStreetMap (sin claves). Muestra el destino
// (provincia) y, si el repartidor comparte su ubicación durante la entrega, un
// marcador en vivo que se actualiza por sondeo. Leaflet se importa de forma
// dinámica (solo en el cliente) para evitar problemas de SSR.

type LatLng = { lat: number; lng: number };

const houseIcon = (html: string) => html;

// Geocodifica una dirección con Nominatim (OpenStreetMap, sin clave). Devuelve
// null si no hay resultado o falla la red.
async function geocode(query: string): Promise<LatLng | null> {
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
      encodeURIComponent(query);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const arr = (await res.json()) as { lat: string; lon: string }[];
    if (!arr.length) return null;
    const lat = parseFloat(arr[0].lat);
    const lng = parseFloat(arr[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export function LiveMap({
  remittanceId,
  province,
  address,
  live,
}: {
  remittanceId?: string | null;
  province?: string | null;
  address?: string | null;
  live: boolean; // true durante la etapa de reparto (sondea la ubicación)
}) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  // Refs a objetos de Leaflet (tipados de forma laxa por el import dinámico).
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const liveMarkerRef = useRef<any>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [hasLive, setHasLive] = useState(false);

  const dest: LatLng =
    (province && PROVINCE_CENTROIDS[province.trim()]) || CUBA_CENTER;

  // Inicializa el mapa una vez.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(containerRef.current, {
        center: [dest.lat, dest.lng],
        zoom: province && PROVINCE_CENTROIDS[province.trim()] ? 9 : 6,
        zoomControl: true,
        attributionControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      const destIcon = L.divIcon({
        className: "",
        html: houseIcon(
          '<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50% 50% 50% 0;background:#14b877;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35)"><span style="transform:rotate(45deg);font-size:16px">🏠</span></div>'
        ),
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });
      destMarkerRef.current = L.marker([dest.lat, dest.lng], {
        icon: destIcon,
      }).addTo(map);

      mapRef.current = map;
      // Recalcula el tamaño por si el contenedor se montó oculto (sheet).
      setTimeout(() => map.invalidateSize(), 100);

      // Ubica la dirección exacta (si hay); si aparece, mueve el destino ahí.
      if (address && address.trim()) {
        const q = [address.trim(), province?.trim(), "Cuba"]
          .filter(Boolean)
          .join(", ");
        geocode(q).then((g) => {
          if (cancelled || !g || !mapRef.current || !destMarkerRef.current) return;
          destMarkerRef.current.setLatLng([g.lat, g.lng]);
          if (!liveMarkerRef.current) mapRef.current.setView([g.lat, g.lng], 14);
        });
      }
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sondea la ubicación en vivo mientras esté en reparto.
  useEffect(() => {
    if (!live || !remittanceId) return;
    let stop = false;
    async function tick() {
      const loc = await getDeliveryLocation(remittanceId as string);
      if (stop || !loc || !mapRef.current || !LRef.current) return;
      const L = LRef.current;
      const map = mapRef.current;
      setHasLive(true);
      setUpdatedAt(loc.updated_at);
      const pos: [number, number] = [loc.lat, loc.lng];
      if (!liveMarkerRef.current) {
        const liveIcon = L.divIcon({
          className: "",
          html: '<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);font-size:15px">🚚</div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        liveMarkerRef.current = L.marker(pos, { icon: liveIcon }).addTo(map);
        // Encuadra destino + repartidor la primera vez.
        try {
          const bounds = L.latLngBounds([pos, [dest.lat, dest.lng]]);
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
        } catch {
          map.setView(pos, 13);
        }
      } else {
        liveMarkerRef.current.setLatLng(pos);
      }
    }
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      stop = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, remittanceId]);

  return (
    <div>
      <div
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded-xl border border-border"
        style={{ background: "#e5e7eb" }}
      />
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        {live && hasLive ? (
          <>
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-600" />
            {t("Repartidor en vivo")}
            {updatedAt
              ? ` · ${new Date(updatedAt).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : ""}
          </>
        ) : live ? (
          t("Esperando la ubicación del repartidor…")
        ) : (
          t("Destino de tu envío")
        )}
      </p>
    </div>
  );
}
