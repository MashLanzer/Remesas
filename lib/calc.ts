// Lógica de negocio central: comisión, conversión, reparto y saldo entre socios.
// Se mantiene en funciones puras para poder reusarla en el formulario (cliente)
// y en el servidor, y para que sea fácil de testear.

import type { Remittance, Settlement } from "./types";

/**
 * Comisión automática según las reglas del negocio:
 *  - Envío de $100 o más  -> 10% del monto.
 *  - Envío de menos de $100 -> $5 fijos.
 * El resultado es editable después en el formulario.
 */
export function calcCommission(amountUsd: number): number {
  const amount = Number(amountUsd) || 0;
  if (amount <= 0) return 0;
  if (amount >= 100) return round2(amount * 0.1);
  return 5;
}

/** Total que se le cobra al cliente = monto del envío + comisión. */
export function calcTotalReceived(amountUsd: number, commission: number): number {
  return round2((Number(amountUsd) || 0) + (Number(commission) || 0));
}

/** Monto que recibe la familia en moneda local = monto USD * tasa. */
export function calcLocalAmount(amountUsd: number, rate: number): number {
  return round2((Number(amountUsd) || 0) * (Number(rate) || 0));
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
  const totalReceived = calcTotalReceived(inputs.amountUsd, commission);
  const localAmount = calcLocalAmount(inputs.amountUsd, inputs.exchangeRate);
  const totalProfit = calcTotalProfit(commission, inputs.exchangeProfit);
  const { myShare, partnerShare } = calcShares(totalProfit, inputs.mySplitPercent);
  return { commission, totalReceived, localAmount, totalProfit, myShare, partnerShare };
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
  remittances: Pick<Remittance, "amount_usd" | "partner_share" | "status">[],
  settlements: Pick<Settlement, "amount" | "direction">[]
): number {
  let owedToPartner = 0;

  for (const r of remittances) {
    // Se cuenta lo entregado (capital del amigo) + su parte de ganancia.
    owedToPartner += (Number(r.amount_usd) || 0) + (Number(r.partner_share) || 0);
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
