"use client";

import { useMemo, useRef, useState } from "react";
import { Download, ImageIcon, Send, Users, Wallet, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { PaperPlane } from "@/components/paper-plane";
import { shareNodeAsImage } from "@/lib/share-image";
import { usd } from "@/lib/utils";

type SentOrder = {
  amount_usd: number;
  at: string; // fecha de entrega o creación
  beneficiary_name: string | null;
};

export function AccountSummary({
  orders,
  brand = "Giro",
  clientName,
}: {
  orders: SentOrder[];
  brand?: string;
  clientName?: string | null;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  const now = new Date();
  const yearKey = now.getFullYear();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;

  const stats = useMemo(() => {
    let total = 0;
    let thisYear = 0;
    let thisMonth = 0;
    const benefs = new Set<string>();
    const byMonth = new Map<string, { label: string; total: number; count: number }>();
    for (const o of orders) {
      const amt = Number(o.amount_usd) || 0;
      total += amt;
      const d = new Date(o.at);
      if (!Number.isNaN(d.getTime())) {
        if (d.getFullYear() === yearKey) thisYear += amt;
        if (`${d.getFullYear()}-${d.getMonth()}` === monthKey) thisMonth += amt;
        const k = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
        if (!byMonth.has(k)) {
          const l = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
          byMonth.set(k, { label: l.charAt(0).toUpperCase() + l.slice(1), total: 0, count: 0 });
        }
        const m = byMonth.get(k)!;
        m.total += amt;
        m.count += 1;
      }
      if (o.beneficiary_name) benefs.add(o.beneficiary_name.trim().toLowerCase());
    }
    const months = Array.from(byMonth.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, v]) => v)
      .slice(0, 12);
    return { total, thisYear, thisMonth, count: orders.length, benefs: benefs.size, months };
  }, [orders, yearKey, monthKey]);

  async function sharePhoto() {
    const node = cardRef.current;
    if (!node) return;
    setBusy(true);
    try {
      const res = await shareNodeAsImage(node, {
        title: "Resumen de envíos",
        fileName: `resumen-${Date.now()}.png`,
      });
      if (res.status === "fallback" && res.dataUrl) setImgUrl(res.dataUrl);
    } catch {
      /* nada */
    } finally {
      setBusy(false);
    }
  }

  if (orders.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Aún no tienes envíos entregados. Cuando envíes a tu familia, aquí verás tu
        resumen y podrás descargarlo.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tarjeta compartible */}
      <div
        ref={cardRef}
        className={
          "relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 p-6 text-white shadow-2xl" +
          (imgUrl ? " hidden" : "")
        }
      >
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <PaperPlane className="h-6 w-6 -translate-x-px text-white drop-shadow" />
            <span className="text-xl font-extrabold tracking-tight">{brand}</span>
            <span className="ml-auto rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
              Mi resumen
            </span>
          </div>
          {clientName && (
            <p className="mt-3 text-sm font-semibold text-white/90">{clientName}</p>
          )}
          <p className="mt-3 text-xs text-white/80">Total enviado a mi familia</p>
          <p className="text-4xl font-extrabold">{usd(stats.total)}</p>
          <div className="mt-4 flex gap-4 border-t border-white/20 pt-4 text-sm">
            <div>
              <p className="text-lg font-extrabold">{stats.count}</p>
              <p className="text-[11px] text-white/80">envíos</p>
            </div>
            <div>
              <p className="text-lg font-extrabold">{usd(stats.thisYear)}</p>
              <p className="text-[11px] text-white/80">este año</p>
            </div>
            <div>
              <p className="text-lg font-extrabold">{stats.benefs}</p>
              <p className="text-[11px] text-white/80">familiares</p>
            </div>
          </div>
          <p className="mt-5 text-center text-xs text-white/70">
            Con {brand} ✈️ · gracias por cuidar a los tuyos ❤️
          </p>
        </div>
      </div>

      {imgUrl && (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl} alt="Resumen" className="w-full rounded-3xl shadow-xl" />
          <p className="text-center text-xs text-muted-foreground">
            Mantén presionada la imagen para guardarla o enviarla.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {imgUrl ? (
          <>
            <button
              onClick={() => setImgUrl(null)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition active:scale-[0.98]"
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>
            <a
              href={imgUrl}
              download="resumen-envios.png"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
            >
              <Download className="h-4 w-4" /> Descargar
            </a>
          </>
        ) : (
          <button
            onClick={sharePhoto}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-70"
          >
            <ImageIcon className="h-4 w-4" />
            {busy ? "Generando…" : "Descargar / compartir resumen"}
          </button>
        )}
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-3 gap-2">
        <Tile icon={Wallet} label="Este mes" value={usd(stats.thisMonth)} />
        <Tile icon={Send} label="Envíos" value={String(stats.count)} />
        <Tile icon={Users} label="Familiares" value={String(stats.benefs)} />
      </div>

      {/* Por mes */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Por mes
        </h2>
        <Card className="divide-y divide-border p-0">
          {stats.months.map((m) => (
            <div key={m.label} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground">
                  {m.count} envío{m.count !== 1 ? "s" : ""}
                </p>
              </div>
              <p className="tabular text-sm font-bold text-foreground">
                {usd(m.total)}
              </p>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Send;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-1 p-3 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <p className="tabular truncate text-sm font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </Card>
  );
}
