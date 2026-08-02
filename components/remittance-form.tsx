"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Plus,
  Sparkles,
  Bookmark,
  Calculator,
  ChevronDown,
} from "lucide-react";
import { Field, Input, Select, Textarea, Button, Card } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import {
  calcCommission,
  computeRemittance,
  transferFactor,
  type CommissionRules,
} from "@/lib/calc";
import { usd, localAmount, cn } from "@/lib/utils";
import {
  createRemittance,
  updateRemittance,
  quickAddClient,
  quickAddBeneficiary,
} from "@/app/actions";
import {
  DELIVERY_CURRENCIES,
  PAYMENT_METHODS,
  type Beneficiary,
  type Client,
  type ExchangeRate,
  type Profile,
  type Remittance,
} from "@/lib/types";

const AMOUNT_PRESETS = [50, 100, 200, 500];
const STALE_DAYS = 3;
const DUP_WINDOW_MS = 60 * 60000; // 1 hora
const TPL_KEY = "giro_send_templates";

type COpt = { id: string; name: string };
type BOpt = {
  id: string;
  name: string;
  province: string | null;
  client_id: string | null;
  preferred_currency: string | null;
};
type SendTpl = { amount: number; currency: string; commission: number };

export function RemittanceForm({
  clients,
  beneficiaries,
  rates,
  defaultSplit,
  initial,
  prefill,
  rules,
  defaultCurrency = "CUP",
  defaultPayment,
  defaultClientId,
  defaultBeneficiaryId,
  repartidores = [],
  isOperador = true,
  recentRemesas = [],
  transferBonusPct,
}: {
  clients: Client[];
  beneficiaries: Beneficiary[];
  rates: ExchangeRate[];
  defaultSplit: number;
  initial?: Remittance;
  prefill?: Remittance;
  rules?: CommissionRules;
  transferBonusPct?: number | null;
  defaultCurrency?: string;
  defaultPayment?: string | null;
  defaultClientId?: string;
  defaultBeneficiaryId?: string;
  repartidores?: Profile[];
  isOperador?: boolean;
  recentRemesas?: { client_id: string | null; amount_usd: number; created_at: string }[];
}) {
  const isEdit = !!initial;
  const source = initial ?? prefill;

  const ratesByCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rates) m[r.currency] = Number(r.rate);
    return m;
  }, [rates]);
  const marketByCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rates) if (r.market_rate) m[r.currency] = Number(r.market_rate);
    return m;
  }, [rates]);

  const currencyOptions = useMemo(() => {
    const hidden = new Set(
      rates.filter((r) => r.active === false).map((r) => r.currency)
    );
    return DELIVERY_CURRENCIES.filter(
      (c) => !hidden.has(c) || c === source?.delivery_currency
    );
  }, [rates, source?.delivery_currency]);

  // Listas locales (para altas al vuelo).
  const [clientOpts, setClientOpts] = useState<COpt[]>(
    clients.map((c) => ({ id: c.id, name: c.name }))
  );
  const [benefOpts, setBenefOpts] = useState<BOpt[]>(
    beneficiaries.map((b) => ({
      id: b.id,
      name: b.name,
      province: b.province ?? null,
      client_id: b.client_id ?? null,
      preferred_currency: b.preferred_currency ?? null,
    }))
  );

  const [clientId, setClientId] = useState(
    source?.client_id ?? defaultClientId ?? ""
  );
  const [beneficiaryId, setBeneficiaryId] = useState(
    source?.beneficiary_id ?? defaultBeneficiaryId ?? ""
  );
  const [amount, setAmount] = useState(source ? String(source.amount_usd) : "");
  const [commission, setCommission] = useState(
    source ? String(source.commission) : ""
  );
  const [commissionTouched, setCommissionTouched] = useState(!!source);
  const [currency, setCurrency] = useState<string>(
    source?.delivery_currency ?? defaultCurrency
  );
  const [rate, setRate] = useState(
    source
      ? String(source.exchange_rate)
      : String(ratesByCurrency[defaultCurrency] ?? "")
  );
  const [exchangeProfit, setExchangeProfit] = useState(
    source && Number(source.exchange_profit) ? String(source.exchange_profit) : ""
  );
  const [split, setSplit] = useState(
    String(source?.my_split_percent ?? defaultSplit ?? 50)
  );
  // Forma de entrega (0056). Solo CUP tiene transferencia. La tasa que se
  // guarda YA incluye el bono (al alternar se ajusta el campo de tasa), así que
  // al guardar no se recalcula: lo que ve el operador es lo que se guarda.
  const [method, setMethod] = useState<"efectivo" | "transferencia">(
    (source?.delivery_method as "efectivo" | "transferencia") ?? "efectivo"
  );

  const amountNum = parseFloat(amount) || 0;
  const effectiveCommission = commissionTouched
    ? parseFloat(commission) || 0
    : calcCommission(amountNum, rules);

  const summary = computeRemittance({
    amountUsd: amountNum,
    commission: effectiveCommission,
    exchangeRate: parseFloat(rate) || 0,
    exchangeProfit: parseFloat(exchangeProfit) || 0,
    mySplitPercent: parseFloat(split) || 0,
  });

  // Beneficiarios del cliente elegido primero.
  const assocBenefs = benefOpts.filter(
    (b) => clientId && b.client_id === clientId
  );
  const otherBenefs = benefOpts.filter(
    (b) => !(clientId && b.client_id === clientId)
  );

  function onCurrencyChange(c: string) {
    setCurrency(c);
    // Al cambiar de moneda se vuelve a efectivo y a la tasa base de esa moneda.
    setMethod("efectivo");
    const r = ratesByCurrency[c];
    if (r != null) setRate(String(r));
  }

  // Alterna la forma de entrega ajustando la tasa por el bono (solo CUP): al
  // pasar a transferencia sube +%, al volver a efectivo lo quita. Así el campo
  // de tasa siempre muestra el número real que se va a guardar.
  function onMethodChange(m: "efectivo" | "transferencia") {
    if (m === method) return;
    const factor = transferFactor(transferBonusPct);
    const cur = parseFloat(rate) || 0;
    if (factor > 0 && cur > 0) {
      const next = m === "transferencia" ? cur * factor : cur / factor;
      setRate(String(Math.round(next * 10000) / 10000));
    }
    setMethod(m);
  }

  // Al elegir beneficiario, aplica su moneda preferida si la tiene.
  function applyBeneficiary(id: string) {
    setBeneficiaryId(id);
    const b = benefOpts.find((x) => x.id === id);
    if (
      b?.preferred_currency &&
      b.preferred_currency !== currency &&
      (currencyOptions as string[]).includes(b.preferred_currency)
    ) {
      onCurrencyChange(b.preferred_currency);
    }
  }

  function onClientChange(v: string) {
    setClientId(v);
    const a = benefOpts.filter((b) => b.client_id === v);
    if (a.length === 1) applyBeneficiary(a[0].id);
  }

  // Posible duplicado: mismo cliente y monto en la última hora.
  const dupWarn = useMemo(() => {
    if (isEdit || !clientId || amountNum <= 0) return false;
    const now = Date.now();
    return recentRemesas.some(
      (r) =>
        r.client_id === clientId &&
        Math.abs(r.amount_usd - amountNum) < 0.01 &&
        now - new Date(r.created_at).getTime() < DUP_WINDOW_MS
    );
  }, [recentRemesas, clientId, amountNum, isEdit]);

  // Plantillas de envío (guardadas en el dispositivo).
  const [tpls, setTpls] = useState<SendTpl[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TPL_KEY);
      if (raw) setTpls(JSON.parse(raw));
    } catch {
      /* nada */
    }
  }, []);
  function persistTpls(next: SendTpl[]) {
    setTpls(next);
    try {
      localStorage.setItem(TPL_KEY, JSON.stringify(next));
    } catch {
      /* nada */
    }
  }
  function saveTemplate() {
    if (amountNum <= 0) return;
    persistTpls(
      [
        { amount: amountNum, currency, commission: effectiveCommission },
        ...tpls,
      ].slice(0, 8)
    );
  }
  function applyTemplate(t: SendTpl) {
    setAmount(String(t.amount));
    onCurrencyChange(t.currency);
    setCommissionTouched(true);
    setCommission(String(t.commission));
  }

  // Calculadora inversa: desde lo que recibe la familia.
  const [invOpen, setInvOpen] = useState(false);
  const [invLocal, setInvLocal] = useState("");
  function solveFromLocal() {
    const L = parseFloat(invLocal) || 0;
    const rNum = parseFloat(rate) || 0;
    if (L <= 0 || rNum <= 0) return;
    let amt = L / rNum;
    for (let i = 0; i < 6; i++) {
      const comm = commissionTouched
        ? parseFloat(commission) || 0
        : calcCommission(amt, rules);
      amt = L / rNum + comm;
    }
    setAmount(String(Number(amt.toFixed(2))));
  }

  // Aviso de tasa desactualizada.
  const rateObj = rates.find((r) => r.currency === currency);
  const rateStaleDays = rateObj
    ? Math.floor((Date.now() - new Date(rateObj.updated_at).getTime()) / 86400000)
    : null;
  const rateStale = rateStaleDays != null && rateStaleDays >= STALE_DAYS;

  // Sugerencia de ganancia por cambio desde el mercado.
  const market = marketByCurrency[currency] ?? 0;
  const rateNum = parseFloat(rate) || 0;
  const suggestedSpread =
    market > rateNum && rateNum > 0 && summary.deliveredUsd > 0
      ? Number(((summary.deliveredUsd * (market - rateNum)) / market).toFixed(2))
      : 0;

  // Altas al vuelo.
  const [addClient, setAddClient] = useState(false);
  const [addBenef, setAddBenef] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [bName, setBName] = useState("");
  const [bProv, setBProv] = useState("");
  const [bPhone, setBPhone] = useState("");

  async function saveNewClient() {
    if (!cName.trim()) return;
    setBusy(true);
    try {
      const c = await quickAddClient(cName, cPhone || null);
      if (c) {
        setClientOpts((p) => [{ id: c.id, name: c.name }, ...p]);
        setClientId(c.id);
      }
    } finally {
      setBusy(false);
      setAddClient(false);
      setCName("");
      setCPhone("");
    }
  }
  async function saveNewBenef() {
    if (!bName.trim()) return;
    setBusy(true);
    try {
      const b = await quickAddBeneficiary({
        name: bName,
        province: bProv || null,
        phone: bPhone || null,
        clientId: clientId || null,
      });
      if (b) {
        setBenefOpts((p) => [
          {
            id: b.id,
            name: b.name,
            province: b.province,
            client_id: b.client_id,
            preferred_currency: null,
          },
          ...p,
        ]);
        setBeneficiaryId(b.id);
      }
    } finally {
      setBusy(false);
      setAddBenef(false);
      setBName("");
      setBProv("");
      setBPhone("");
    }
  }

  const goRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={isEdit ? updateRemittance : createRemittance}
      className="space-y-4"
    >
      {isEdit && <input type="hidden" name="id" value={initial!.id} />}
      {!isEdit && <input ref={goRef} type="hidden" name="go" defaultValue="" />}

      {/* Plantillas de envío */}
      {tpls.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
          {tpls.map((t, i) => (
            <div
              key={i}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 py-1.5 pl-3 pr-1.5 text-xs font-semibold text-foreground"
            >
              <button
                type="button"
                onClick={() => applyTemplate(t)}
                className="transition active:scale-95"
              >
                {usd(t.amount)} · {t.currency}
              </button>
              <button
                type="button"
                onClick={() => persistTpls(tpls.filter((_, idx) => idx !== i))}
                aria-label="Borrar plantilla"
                className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Datos del envío */}
      <Card className="space-y-4">
        <Field label="Fecha">
          <Input type="date" name="date" defaultValue={initial?.date ?? today()} />
        </Field>

        <Field label="Cliente (quien paga)">
          <div className="flex gap-2">
            <Select
              name="client_id"
              value={clientId}
              onChange={(e) => onClientChange(e.target.value)}
              className="flex-1"
            >
              <option value="">— Sin cliente —</option>
              {clientOpts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <QuickAddBtn onClick={() => setAddClient(true)} />
          </div>
        </Field>

        <Field label="Beneficiario (quien recibe en Cuba)">
          <div className="flex gap-2">
            <Select
              name="beneficiary_id"
              value={beneficiaryId}
              onChange={(e) => applyBeneficiary(e.target.value)}
              className="flex-1"
            >
              <option value="">— Sin beneficiario —</option>
              {assocBenefs.length > 0 ? (
                <>
                  <optgroup label="De este cliente">
                    {assocBenefs.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                        {b.province ? ` · ${b.province}` : ""}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Otros">
                    {otherBenefs.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                        {b.province ? ` · ${b.province}` : ""}
                      </option>
                    ))}
                  </optgroup>
                </>
              ) : (
                benefOpts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.province ? ` · ${b.province}` : ""}
                  </option>
                ))
              )}
            </Select>
            <QuickAddBtn onClick={() => setAddBenef(true)} />
          </div>
        </Field>

        {isOperador && repartidores.length > 0 && (
          <Field
            label="Repartidor en Cuba"
            hint="Quién entrega esta remesa. Verá solo sus remesas asignadas."
          >
            <Select name="deliverer_id" defaultValue={source?.deliverer_id ?? ""}>
              <option value="">— Sin asignar —</option>
              {repartidores.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name || "Repartidor"}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field
          label="Monto del envío (USD)"
          hint="Lo que paga el cliente. La comisión se descuenta de aquí."
        >
          <Input
            type="number"
            name="amount_usd"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <div className="mt-2 flex gap-2">
            {AMOUNT_PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className={cn(
                  "flex-1 rounded-lg border py-1.5 text-xs font-semibold transition active:scale-95",
                  amountNum === v
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                ${v}
              </button>
            ))}
          </div>
          {dupWarn && (
            <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs font-medium text-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Ya registraste una remesa igual a este cliente hace poco. ¿Duplicado?
            </p>
          )}
        </Field>

        <Field
          label="Comisión (USD)"
          hint={`Automática: ${rules?.commission_percent ?? 10}% si ≥ $${
            rules?.commission_threshold ?? 100
          }, o $${rules?.commission_flat ?? 5} fijos. Puedes editarla.`}
        >
          <Input
            type="number"
            name="commission"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={commissionTouched ? commission : String(effectiveCommission)}
            onChange={(e) => {
              setCommissionTouched(true);
              setCommission(e.target.value);
            }}
          />
          {amountNum > 0 && (
            <button
              type="button"
              onClick={saveTemplate}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary transition active:scale-95"
            >
              <Bookmark className="h-3.5 w-3.5" /> Guardar como plantilla de envío
            </button>
          )}
        </Field>

        <Field label="Método de pago recibido">
          <Select
            name="payment_method"
            defaultValue={source?.payment_method ?? defaultPayment ?? ""}
          >
            <option value="">— Selecciona —</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {/* Entrega en Cuba */}
      <Card className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Entrega en Cuba
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Moneda">
            <Select
              name="delivery_currency"
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
            >
              {currencyOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tasa de cambio" hint="Editable">
            <Input
              type="number"
              name="exchange_rate"
              inputMode="decimal"
              step="0.0001"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </Field>
        </div>

        {/* Forma de entrega: solo CUP tiene transferencia (tasa +%). */}
        {currency === "CUP" && (
          <>
            <input type="hidden" name="delivery_method" value={method} />
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { m: "efectivo" as const, label: "💴 Efectivo" },
                  { m: "transferencia" as const, label: "🏦 Transferencia" },
                ]
              ).map(({ m, label }) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onMethodChange(m)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition active:scale-[0.98]",
                    method === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="-mt-1 text-[11px] text-muted-foreground">
              Transferencia = efectivo +{Number(transferBonusPct ?? 10)}% (ajusta
              la tasa sola). Puedes editarla a mano.
            </p>
          </>
        )}

        {rateStale && (
          <Link
            href="/tasas"
            className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Tasa de {currency} sin actualizar hace {rateStaleDays} días · revísala
          </Link>
        )}

        <div className="rounded-xl bg-muted p-3 text-center">
          <p className="text-xs text-muted-foreground">Entregar a la familia</p>
          <p className="text-lg font-semibold text-foreground">
            {localAmount(summary.localAmount)} {currency}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {usd(summary.deliveredUsd)} después de comisión
          </p>
        </div>

        {/* Calculadora inversa */}
        <div>
          <button
            type="button"
            onClick={() => setInvOpen((v) => !v)}
            className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground transition active:scale-95"
          >
            <Calculator className="h-3.5 w-3.5" />
            Calcular desde lo que recibe la familia
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition", invOpen && "rotate-180")}
            />
          </button>
          {invOpen && (
            <div className="mt-2 flex items-end gap-2">
              <Field label={`Recibe en ${currency}`}>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Ej: 40000"
                  value={invLocal}
                  onChange={(e) => setInvLocal(e.target.value)}
                />
              </Field>
              <button
                type="button"
                onClick={solveFromLocal}
                className="mb-0.5 shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-95"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>

        <Field
          label="Ganancia por cambio (spread, USD)"
          hint="Opcional. Solo si el diferencial de la tasa deja ganancia extra."
        >
          <Input
            type="number"
            name="exchange_profit"
            inputMode="decimal"
            step="0.01"
            placeholder="0"
            value={exchangeProfit}
            onChange={(e) => setExchangeProfit(e.target.value)}
          />
          {suggestedSpread > 0 &&
            suggestedSpread.toFixed(2) !==
              (parseFloat(exchangeProfit) || 0).toFixed(2) && (
              <button
                type="button"
                onClick={() => setExchangeProfit(String(suggestedSpread))}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-income/10 px-3 py-1.5 text-xs font-semibold text-income transition active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Sugerido por el mercado: {usd(suggestedSpread)} · usar
              </button>
            )}
        </Field>
      </Card>

      {/* Reparto y estado */}
      <Card className="space-y-4">
        <Field
          label={`Tu parte de la ganancia (%) — el resto es de Cuba`}
          hint={`Tú ${split || 0}% · Cuba ${100 - (parseFloat(split) || 0)}%`}
        >
          <Input
            type="number"
            name="my_split_percent"
            inputMode="decimal"
            step="1"
            min="0"
            max="100"
            value={split}
            onChange={(e) => setSplit(e.target.value)}
          />
        </Field>

        <Field label="Estado">
          <Select name="status" defaultValue={initial?.status ?? "pendiente"}>
            <option value="pendiente">Pendiente</option>
            <option value="entregado">Entregado</option>
            <option value="liquidado">Liquidado</option>
          </Select>
        </Field>

        {isOperador && (
          <Field label="¿El cliente ya te pagó?">
            <Select
              name="client_paid"
              defaultValue={source?.client_paid === false ? "false" : "true"}
            >
              <option value="true">Sí, ya cobrado</option>
              <option value="false">No, aún debe</option>
            </Select>
          </Field>
        )}

        <Field
          label="Comprobante de pago del cliente (foto)"
          hint={
            initial?.receipt_url
              ? "Ya hay una foto guardada. Sube otra para reemplazarla."
              : "Captura de Zelle, CashApp, etc."
          }
        >
          <input
            type="file"
            name="receipt"
            accept="image/*"
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
          />
        </Field>

        <Field
          label="Comprobante de entrega (foto, opcional)"
          hint={
            initial?.delivery_proof_url
              ? "Ya hay una foto guardada. Sube otra para reemplazarla."
              : "Foto de la entrega en Cuba."
          }
        >
          <input
            type="file"
            name="delivery_proof"
            accept="image/*"
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
          />
        </Field>

        <Field label="Notas">
          <Textarea
            name="notes"
            rows={2}
            placeholder="Referencia, detalles…"
            defaultValue={source?.notes ?? ""}
          />
        </Field>
      </Card>

      {/* Resumen en vivo */}
      <Card className="overflow-hidden p-0">
        <div className="hero-gradient p-4 text-white">
          <p className="text-xs font-medium text-white/75">Cobras al cliente</p>
          <p className="tabular text-3xl font-extrabold">
            {usd(summary.totalReceived)}
          </p>
        </div>
        <div className="space-y-2 p-4">
          <SummaryRow label="− Comisión" value={usd(effectiveCommission)} />
          <SummaryRow
            label="= Se entrega a la familia"
            value={usd(summary.deliveredUsd)}
          />
          <div className="my-1 border-t border-border" />
          <SummaryRow label="Ganancia total" value={usd(summary.totalProfit)} />
          <SummaryRow label="Tu parte" value={usd(summary.myShare)} tone="positive" />
          <SummaryRow label="Parte de Cuba" value={usd(summary.partnerShare)} />
        </div>
      </Card>

      {/* Barra fija: resumen + guardar */}
      <div className="sticky bottom-20 z-10 rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Cobras{" "}
            <span className="font-bold text-foreground">
              {usd(summary.totalReceived)}
            </span>
          </span>
          <span className="text-muted-foreground">
            Tu parte{" "}
            <span className="font-bold text-income">{usd(summary.myShare)}</span>
          </span>
        </div>
        {isEdit ? (
          <Button type="submit" className="w-full">
            Guardar cambios
          </Button>
        ) : (
          <div className="flex gap-2">
            <button
              type="submit"
              onClick={() => {
                if (goRef.current) goRef.current.value = "";
              }}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition active:scale-[0.98]"
            >
              Guardar
            </button>
            <button
              type="submit"
              onClick={() => {
                if (goRef.current) goRef.current.value = "share";
              }}
              className="flex-[1.2] rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
            >
              Guardar y compartir
            </button>
          </div>
        )}
      </div>

      {/* Alta rápida de cliente */}
      <Sheet open={addClient} onClose={() => setAddClient(false)} title="Nuevo cliente">
        <div className="space-y-3">
          <Field label="Nombre">
            <Input
              autoFocus
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </Field>
          <Field label="Teléfono (opcional)">
            <Input
              value={cPhone}
              onChange={(e) => setCPhone(e.target.value)}
              placeholder="+1…"
              inputMode="tel"
            />
          </Field>
          <Button
            type="button"
            className="w-full"
            onClick={saveNewClient}
            disabled={busy || !cName.trim()}
          >
            {busy ? "Guardando…" : "Añadir y seleccionar"}
          </Button>
        </div>
      </Sheet>

      {/* Alta rápida de beneficiario */}
      <Sheet
        open={addBenef}
        onClose={() => setAddBenef(false)}
        title="Nuevo beneficiario"
      >
        <div className="space-y-3">
          {clientId && (
            <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
              Se asociará al cliente seleccionado.
            </p>
          )}
          <Field label="Nombre">
            <Input
              autoFocus
              value={bName}
              onChange={(e) => setBName(e.target.value)}
              placeholder="Nombre del beneficiario"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Provincia (opcional)">
              <Input
                value={bProv}
                onChange={(e) => setBProv(e.target.value)}
                placeholder="La Habana…"
              />
            </Field>
            <Field label="Teléfono (opcional)">
              <Input
                value={bPhone}
                onChange={(e) => setBPhone(e.target.value)}
                placeholder="+53…"
                inputMode="tel"
              />
            </Field>
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={saveNewBenef}
            disabled={busy || !bName.trim()}
          >
            {busy ? "Guardando…" : "Añadir y seleccionar"}
          </Button>
        </div>
      </Sheet>
    </form>
  );
}

function QuickAddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Añadir nuevo"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-primary transition active:scale-95"
    >
      <Plus className="h-4 w-4" />
    </button>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "positive";
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          (strong ? "font-semibold " : "font-medium ") +
          (tone === "positive" ? "text-income" : "text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
