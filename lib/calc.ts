// Lógica de negocio central: comisión, conversión, reparto y saldo entre socios.
// Se mantiene en funciones puras para poder reusarla en el formulario (cliente)
// y en el servidor, y para que sea fácil de testear.

import type { DeliveryMethod, Remittance, Settlement } from "./types";

export interface CommissionRules {
  commission_threshold: number;
  commission_percent: number;
  commission_flat: number;
}

const DEFAULT_RULES: CommissionRules = {
  commission_threshold: 100,
  commission_percent: 10,
  commission_flat: 5,
};

/**
 * Comisión automática según las reglas del negocio (configurables):
 *  - Envío >= umbral  -> cobro por TRAMOS: se cobra el % de cada bloque
 *    completo del tamaño del umbral; el resto (bloque incompleto) no cobra.
 *    Con umbral 100 y 10% => $10 por cada $100 completo:
 *    $110 -> $10, $150 -> $10, $200 -> $20, $250 -> $20.
 *  - Envío <  umbral  -> monto fijo.
 * El resultado es editable después en el formulario.
 */
export function calcCommission(
  amountUsd: number,
  rules: CommissionRules = DEFAULT_RULES
): number {
  const amount = Number(amountUsd) || 0;
  if (amount <= 0) return 0;
  const threshold = Number(rules.commission_threshold) || 0;
  if (threshold > 0 && amount >= threshold) {
    // Cobro por tramos: $10 por cada bloque completo de $100 (el resto no paga).
    const blocks = Math.floor(amount / threshold);
    const perBlock = (threshold * (Number(rules.commission_percent) || 0)) / 100;
    return round2(blocks * perBlock);
  }
  return round2(Number(rules.commission_flat) || 0);
}

/**
 * Total que se le cobra al cliente = el monto del envío.
 * La comisión NO se suma aparte: se descuenta de ese monto (ver calcDelivered).
 */
export function calcTotalReceived(amountUsd: number): number {
  return round2(Number(amountUsd) || 0);
}

/**
 * Lo que realmente se entrega a la familia en USD = monto del envío − comisión.
 * La comisión sale del dinero que manda el cliente, no es un cargo extra.
 */
export function calcDelivered(amountUsd: number, commission: number): number {
  // La comisión nunca puede superar al monto: si pasa, se entrega 0 (no negativo).
  return round2(Math.max(0, (Number(amountUsd) || 0) - (Number(commission) || 0)));
}

/** Monto que recibe la familia en moneda local = (USD entregado) * tasa. */
export function calcLocalAmount(deliveredUsd: number, rate: number): number {
  return round2((Number(deliveredUsd) || 0) * (Number(rate) || 0));
}

// ===== Formas de entrega: efectivo vs transferencia (0056) =====
//
// La transferencia solo aplica a CUP y vale más que el efectivo:
//   transferencia = efectivo * (1 + transfer_bonus_pct/100).
// Para el resto de monedas (USD, MLC, EUR) la forma no cambia el monto.

type RateLike = { currency: string; rate: number; active?: boolean };

/** Factor de la transferencia: 1 + pct/100 (nunca < 1). */
export function transferFactor(pct: number | null | undefined): number {
  const p = Number(pct) || 0;
  return p > 0 ? 1 + p / 100 : 1;
}

/** ¿Esta moneda tiene variante de transferencia? Hoy: solo CUP. */
export function methodApplies(currency: string | null | undefined): boolean {
  return currency === "CUP";
}

/**
 * Convierte el USD entregado a la moneda y forma elegidas.
 *   - USD: el mismo importe (la forma no aplica).
 *   - CUP + transferencia: efectivo * (1 + pct/100).
 *   - resto: importe * tasa.
 * Devuelve null si no hay tasa activa para esa moneda (no se puede estimar).
 */
export function convertDelivered(
  deliveredUsd: number | null | undefined,
  currency: string | null | undefined,
  method: DeliveryMethod,
  rates: RateLike[],
  transferBonusPct?: number | null
): number | null {
  const usd = Math.max(0, Number(deliveredUsd) || 0);
  if (!currency) return null;
  if (currency === "USD") return round2(usd);
  const r = rates.find((x) => x.currency === currency);
  if (!r || r.active === false) return null;
  const rate = Number(r.rate) || 0;
  if (rate <= 0) return null;
  const base = usd * rate;
  const amount =
    currency === "CUP" && method === "transferencia"
      ? base * transferFactor(transferBonusPct)
      : base;
  return round2(amount);
}

/** Ganancia total = comisión + ganancia por diferencial de cambio (spread). */
export function calcTotalProfit(commission: number, exchangeProfit: number): number {
  return round2((Number(commission) || 0) + (Number(exchangeProfit) || 0));
}

/**
 * Reparto de la ganancia entre los dos socios.
 * mySplitPercent = % que le toca al socio que cobra (por defecto 50).
 */
export function calcShares(
  totalProfit: number,
  mySplitPercent: number
): { myShare: number; partnerShare: number } {
  const pct = clamp(Number(mySplitPercent) || 0, 0, 100);
  const myShare = round2((totalProfit * pct) / 100);
  const partnerShare = round2(totalProfit - myShare);
  return { myShare, partnerShare };
}

/**
 * Calcula todos los derivados de una remesa a partir de las entradas del usuario.
 * Es la función que usa el formulario para mostrar el resumen en vivo.
 */
export interface RemittanceInputs {
  amountUsd: number;
  commission: number;
  exchangeRate: number;
  exchangeProfit: number;
  mySplitPercent: number;
}

export function computeRemittance(inputs: RemittanceInputs) {
  const commission = Number(inputs.commission) || 0;
  // El cliente paga el monto completo; la comisión se descuenta de ahí.
  const totalReceived = calcTotalReceived(inputs.amountUsd);
  const deliveredUsd = calcDelivered(inputs.amountUsd, commission);
  const localAmount = calcLocalAmount(deliveredUsd, inputs.exchangeRate);
  const totalProfit = calcTotalProfit(commission, inputs.exchangeProfit);
  const { myShare, partnerShare } = calcShares(totalProfit, inputs.mySplitPercent);
  return {
    commission,
    deliveredUsd,
    totalReceived,
    localAmount,
    totalProfit,
    myShare,
    partnerShare,
  };
}

/**
 * Saldo de la cuenta entre socios.
 *
 * Modelo: el amigo en Cuba adelanta la entrega (su capital) y le corresponde
 * su parte de la ganancia. Por cada remesa, quien cobra en EE.UU. le queda
 * debiendo al amigo: (monto entregado en USD) + (parte de la ganancia del amigo).
 * Las liquidaciones (pagos que se envían a Cuba) reducen esa deuda.
 *
 * Devuelve un número:
 *   > 0  -> le debes ESE monto (USD) a tu amigo en Cuba.
 *   < 0  -> tu amigo te debe a ti.
 */
export function calcPartnerBalance(
  remittances: Pick<
    Remittance,
    "amount_usd" | "commission" | "partner_share" | "status"
  >[],
  settlements: Pick<Settlement, "amount" | "direction">[]
): number {
  let owedToPartner = 0;

  for (const r of remittances) {
    // El amigo adelanta capital solo cuando ENTREGA. Las pendientes (aún sin
    // entregar) no cuentan todavía en el saldo.
    if (r.status === "pendiente") continue;
    // Capital que adelanta el amigo = lo entregado a la familia (monto − comisión).
    // A eso se suma su parte de la ganancia.
    const delivered = Math.max(
      0,
      (Number(r.amount_usd) || 0) - (Number(r.commission) || 0)
    );
    owedToPartner += delivered + (Number(r.partner_share) || 0);
  }

  for (const s of settlements) {
    const amt = Number(s.amount) || 0;
    if (s.direction === "us_to_cuba") {
      // Enviaste dinero a Cuba: baja lo que le debes.
      owedToPartner -= amt;
    } else {
      // El amigo te envió a ti: sube lo que le debes (o te pone a favor).
      owedToPartner += amt;
    }
  }

  return round2(owedToPartner);
}

// === Helpers ===

export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
