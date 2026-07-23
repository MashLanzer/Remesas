import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un número como USD: 1234.5 -> "$1,234.50" */
export function usd(amount: number | null | undefined): string {
  const n = Number(amount ?? 0);
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formatea un monto en moneda local con separador de miles, sin símbolo. */
export function localAmount(amount: number | null | undefined): string {
  const n = Number(amount ?? 0);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Estimación EN VIVO de lo que recibe la familia por un paquete: el monto en
 *  USD multiplicado por la tasa actual de esa moneda. Así el "recibe X" se
 *  reacomoda solo cuando cambia la tasa (nadie pierde por un número fijo viejo).
 *  Devuelve null si no hay tasa activa para la moneda (no se puede estimar). */
export function packageReceives(
  amountUsd: number | null | undefined,
  currency: string | null | undefined,
  rates: { currency: string; rate: number; active?: boolean }[]
): number | null {
  const amt = Number(amountUsd) || 0;
  if (!currency) return null;
  if (currency === "USD") return amt;
  const r = rates.find((x) => x.currency === currency);
  if (!r || r.active === false) return null;
  const rate = Number(r.rate) || 0;
  if (rate <= 0) return null;
  return amt * rate;
}

/** Formatea una fecha ISO a formato legible es-ES. */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
