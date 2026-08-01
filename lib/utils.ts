import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { calcCommission, type CommissionRules } from "./calc";

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

/**
 * Cotización completa de un paquete: cuánto PAGA el cliente y cuánto RECIBE la
 * familia, con la comisión ya descontada (como ocurre de verdad al aceptar el
 * pedido: la comisión se resta del monto, no se suma aparte). Así el número que
 * ve el cliente es el real y no una promesa inflada.
 *   pays      = lo que paga el cliente (USD) = el monto del envío.
 *   commission= comisión automática según las reglas del negocio.
 *   receives  = lo que recibe la familia en la moneda de entrega (neto). null si
 *               no hay tasa activa para esa moneda (no se puede estimar).
 */
export function packageQuote(
  amountUsd: number | null | undefined,
  currency: string | null | undefined,
  rates: { currency: string; rate: number; active?: boolean }[],
  rules?: CommissionRules
): { pays: number; commission: number; receives: number | null } {
  const pays = Number(amountUsd) || 0;
  const commission = rules ? calcCommission(pays, rules) : 0;
  const deliveredUsd = Math.max(0, pays - commission);
  if (!currency) return { pays, commission, receives: null };
  if (currency === "USD") return { pays, commission, receives: deliveredUsd };
  const r = rates.find((x) => x.currency === currency);
  if (!r || r.active === false) return { pays, commission, receives: null };
  const rate = Number(r.rate) || 0;
  if (rate <= 0) return { pays, commission, receives: null };
  return { pays, commission, receives: deliveredUsd * rate };
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
