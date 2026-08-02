import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  calcCommission,
  convertDelivered,
  methodApplies,
  type CommissionRules,
} from "./calc";
import type { DeliveryMethod } from "./types";

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
 *   pays          = lo que paga el cliente (USD) = el monto del envío.
 *   commission    = comisión automática según las reglas del negocio.
 *   deliveredUsd  = USD que queda para la familia (para convertir a cualquier
 *                   moneda/forma en la tienda). En precio fijo es lo que se envía.
 *   receives      = lo que recibe la familia en la moneda de entrega en EFECTIVO
 *                   (neto). null si no hay tasa activa para esa moneda.
 *   receivesTransfer = igual pero por TRANSFERENCIA (solo CUP). null si no aplica.
 */
export function packageQuote(
  amountUsd: number | null | undefined,
  currency: string | null | undefined,
  rates: { currency: string; rate: number; active?: boolean }[],
  rules?: CommissionRules,
  fixed?: { send_usd?: number | null; receives?: number | null } | null,
  transferBonusPct?: number | null
): {
  pays: number;
  commission: number;
  deliveredUsd: number;
  receives: number | null;
  receivesTransfer: number | null;
} {
  const pays = Number(amountUsd) || 0;
  // Precio fijo: los números del operador mandan (sin comisión ni tasa). La
  // comisión implícita es lo que paga menos lo que se envía. Sin variante de
  // transferencia: el número fijo es el que recibe la familia, punto.
  if (fixed && fixed.send_usd != null && fixed.receives != null) {
    const sendUsd = Number(fixed.send_usd) || 0;
    return {
      pays,
      commission: Math.round((pays - sendUsd) * 100) / 100,
      deliveredUsd: sendUsd,
      receives: Number(fixed.receives) || 0,
      receivesTransfer: null,
    };
  }
  const commission = rules ? calcCommission(pays, rules) : 0;
  const deliveredUsd = Math.max(0, pays - commission);
  const receives = convertDelivered(deliveredUsd, currency, "efectivo", rates);
  const receivesTransfer = methodApplies(currency)
    ? convertDelivered(deliveredUsd, currency, "transferencia", rates, transferBonusPct)
    : null;
  return { pays, commission, deliveredUsd, receives, receivesTransfer };
}

/**
 * Opción de entrega que se muestra en la tienda: una (moneda + forma) con el
 * monto ya convertido desde el USD entregado. Se usa para el switch global.
 */
export type DeliveryOption = {
  key: string; // id único, ej. "CUP-transferencia"
  currency: string;
  method: DeliveryMethod;
  label: string; // ej. "CUP transferencia"
  amount: number; // monto ya convertido
};

const CURRENCY_ORDER = ["USD", "CUP", "MLC", "EUR"];

/**
 * Todas las formas en que la familia podría recibir un USD entregado, con su
 * monto, según las tasas activas. Incluye la variante de transferencia para CUP.
 * El orden pone primero la moneda nativa del paquete (la más relevante).
 */
export function deliveryOptions(
  deliveredUsd: number,
  nativeCurrency: string | null | undefined,
  rates: { currency: string; rate: number; active?: boolean }[],
  transferBonusPct?: number | null
): DeliveryOption[] {
  const currencies = Array.from(
    new Set([
      "USD",
      ...rates.filter((r) => r.active !== false).map((r) => r.currency),
    ])
  );
  const opts: DeliveryOption[] = [];
  for (const currency of currencies) {
    const methods: DeliveryMethod[] = methodApplies(currency)
      ? ["efectivo", "transferencia"]
      : ["efectivo"];
    for (const method of methods) {
      const amount = convertDelivered(
        deliveredUsd,
        currency,
        method,
        rates,
        transferBonusPct
      );
      if (amount == null) continue;
      opts.push({
        key: `${currency}-${method}`,
        currency,
        method,
        label: methodApplies(currency)
          ? `${currency} ${method === "transferencia" ? "transferencia" : "efectivo"}`
          : currency,
        amount,
      });
    }
  }
  // Orden: moneda nativa primero, luego el orden canónico; efectivo antes que
  // transferencia dentro de la misma moneda.
  const rank = (o: DeliveryOption) => {
    const isNative = o.currency === nativeCurrency ? 0 : 1;
    const ci = CURRENCY_ORDER.indexOf(o.currency);
    const mi = o.method === "efectivo" ? 0 : 1;
    return [isNative, ci < 0 ? 99 : ci, mi] as const;
  };
  return opts.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
  });
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
