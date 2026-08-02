"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, X, Plus, Trash2, User, Users } from "lucide-react";
import { Field, Input, Select, Textarea, Button } from "@/components/ui";
import {
  createOrder,
  createOrdersMulti,
  listSavedBeneficiaries,
  addSavedBeneficiary,
  deleteSavedBeneficiary,
} from "@/app/actions";
import { localAmount, usd } from "@/lib/utils";
import { transferFactor } from "@/lib/calc";
import { useT } from "@/components/lang-provider";
import {
  DELIVERY_CURRENCIES,
  type ClientSavedBeneficiary,
  type DeliveryMethod,
  type ExchangeRate,
} from "@/lib/types";

type Benef = { name: string; phone: string | null; province: string | null };
type Saved = ClientSavedBeneficiary;

const SAVED_KEY = "giro_c_benefs";

export type OrderInitial = {
  amount?: string;
  currency?: string;
  name?: string;
  phone?: string;
  province?: string;
  note?: string;
};

export function OrderForm({
  rates,
  onDone,
  pointsBalance = 0,
  redeemMin = 100,
  pointValue = 0.05,
  beneficiaries = [],
  initial,
  transferBonusPct,
}: {
  rates: ExchangeRate[];
  onDone?: () => void;
  pointsBalance?: number;
  redeemMin?: number;
  pointValue?: number;
  beneficiaries?: Benef[];
  initial?: OrderInitial;
  transferBonusPct?: number | null;
}) {
  const tr = useT();
  const ratesByCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rates) m[r.currency] = Number(r.rate);
    return m;
  }, [rates]);

  const available = useMemo(
    () =>
      DELIVERY_CURRENCIES.filter(
        (c) => rates.find((r) => r.currency === c)?.active !== false
      ),
    [rates]
  );

  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [currency, setCurrency] = useState<string>(
    initial?.currency ?? available[0] ?? "CUP"
  );
  const [bName, setBName] = useState(initial?.name ?? "");
  const [bPhone, setBPhone] = useState(initial?.phone ?? "");
  const [bProv, setBProv] = useState(initial?.province ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [method, setMethod] = useState<DeliveryMethod>("efectivo");

  // Modo "varios beneficiarios": un pedido por cada uno, misma moneda/forma.
  type Recipient = { name: string; phone: string; province: string; amount: string };
  const emptyRec = (): Recipient => ({ name: "", phone: "", province: "", amount: "" });
  const [multi, setMulti] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([emptyRec()]);
  function updateRec(i: number, patch: Partial<Recipient>) {
    setRecipients((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }
  function addRec(r?: Recipient) {
    setRecipients((rs) => [...rs, r ?? emptyRec()]);
  }
  function removeRec(i: number) {
    setRecipients((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs));
  }

  // Beneficiarios guardados (con apodo) en la NUBE (0059). Se cargan de la
  // cuenta; si había una libreta vieja en el teléfono se importa una vez.
  const [saved, setSaved] = useState<Saved[]>([]);
  const [apodo, setApodo] = useState("");
  useEffect(() => {
    (async () => {
      let list = await listSavedBeneficiaries();
      if (list.length === 0) {
        try {
          const raw = localStorage.getItem(SAVED_KEY);
          const old = raw ? (JSON.parse(raw) as Saved[]) : [];
          if (Array.isArray(old) && old.length > 0) {
            for (const b of old) {
              await addSavedBeneficiary({
                apodo: b.apodo,
                name: b.name,
                phone: b.phone,
                province: b.province,
              });
            }
            list = await listSavedBeneficiaries();
            localStorage.removeItem(SAVED_KEY);
          }
        } catch {
          /* nada */
        }
      }
      setSaved(list);
    })();
  }, []);

  function pick(b: Benef) {
    setBName(b.name);
    setBPhone(b.phone ?? "");
    setBProv(b.province ?? "");
  }
  async function saveCurrent() {
    if (!bName.trim()) return;
    const row = await addSavedBeneficiary({
      apodo: apodo.trim() || bName.trim(),
      name: bName.trim(),
      phone: bPhone.trim() || null,
      province: bProv.trim() || null,
    });
    if (row) {
      setSaved((s) => [row, ...s.filter((x) => x.id !== row.id)]);
    }
    setApodo("");
  }
  function removeSaved(id: string) {
    setSaved((s) => s.filter((x) => x.id !== id));
    deleteSavedBeneficiary(id);
  }

  // Combina guardados (apodo) + derivados de pedidos, sin duplicar.
  const savedKeys = new Set(saved.map((s) => `${s.name.toLowerCase()}|${s.phone ?? ""}`));
  const derived = beneficiaries.filter(
    (b) => !savedKeys.has(`${b.name.toLowerCase()}|${b.phone ?? ""}`)
  );

  const amountNum = parseFloat(amount) || 0;
  const rate = ratesByCurrency[currency] ?? 0;
  const canChooseMethod = currency === "CUP";
  const effRate =
    canChooseMethod && method === "transferencia"
      ? rate * transferFactor(transferBonusPct)
      : rate;
  const receives = amountNum * effRate;
  const alreadySaved = savedKeys.has(
    `${bName.trim().toLowerCase()}|${bPhone.trim() || ""}`
  );

  const totalUsd = recipients.reduce(
    (s, r) => s + (parseFloat(r.amount) || 0),
    0
  );
  const validRecipients = recipients.filter(
    (r) => r.name.trim() && (parseFloat(r.amount) || 0) > 0
  );

  return (
    <form
      action={async (fd) => {
        if (multi) {
          fd.set(
            "recipients",
            JSON.stringify(
              validRecipients.map((r) => ({
                name: r.name.trim(),
                phone: r.phone.trim(),
                province: r.province.trim(),
                amount: parseFloat(r.amount) || 0,
              }))
            )
          );
          await createOrdersMulti(fd);
        } else {
          await createOrder(fd);
        }
        onDone?.();
      }}
      className="space-y-3"
    >
      {/* Cambiar entre un beneficiario o varios */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMulti(false)}
          className={
            "flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-semibold transition active:scale-[0.98] " +
            (!multi ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground")
          }
        >
          <User className="h-4 w-4" /> {tr("A uno")}
        </button>
        <button
          type="button"
          onClick={() => setMulti(true)}
          className={
            "flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-semibold transition active:scale-[0.98] " +
            (multi ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground")
          }
        >
          <Users className="h-4 w-4" /> {tr("A varios")}
        </button>
      </div>
      {!multi && (
        <Field label={tr("¿Cuánto quieres enviar? (USD)")}>
          <Input
            type="number"
            name="amount_usd"
            inputMode="decimal"
            step="0.01"
            min="1"
            placeholder="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>
      )}

      <Field label={tr("Moneda que recibe tu familia")}>
        <Select
          name="delivery_currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          title={tr("Moneda")}
        >
          {available.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      {/* Forma de entrega: solo CUP tiene variante de transferencia (paga más). */}
      {canChooseMethod && (
        <>
          <input type="hidden" name="delivery_method" value={method} />
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { m: "efectivo" as const, label: `💴 ${tr("Efectivo")}` },
                { m: "transferencia" as const, label: `🏦 ${tr("Transferencia")}` },
              ]
            ).map(({ m, label }) => {
              const f = m === "transferencia" ? transferFactor(transferBonusPct) : 1;
              const amt = amountNum * rate * f;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={
                    "rounded-xl border p-2.5 text-left transition active:scale-[0.98] " +
                    (method === m ? "border-primary bg-primary/10" : "border-border")
                  }
                >
                  <span className="block text-[11px] font-semibold text-muted-foreground">
                    {label}
                  </span>
                  <span className="tabular block text-sm font-extrabold text-foreground">
                    {amountNum > 0 && rate > 0 ? `${localAmount(amt)} CUP` : "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {!multi && amountNum > 0 && rate > 0 && (
        <div className="rounded-xl bg-muted p-3 text-center">
          <p className="text-xs text-muted-foreground">{tr("Tu familia recibe hasta")}</p>
          <p className="text-lg font-bold text-foreground">
            {localAmount(receives)} {currency}
            {canChooseMethod && method === "transferencia" && (
              <span className="ml-1 text-xs font-semibold text-primary">
                ({tr("transferencia")})
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {tr("Por")} {usd(amountNum)} ·{" "}
            {tr("antes de la comisión. El monto final lo confirma el negocio.")}
          </p>
        </div>
      )}

      {multi && (
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {tr("¿Quiénes reciben en Cuba?")}
          </p>

          {/* Chips: añade un guardado como nuevo beneficiario de la lista. */}
          {(saved.length > 0 || derived.length > 0) && (
            <div className="-mx-1 mb-3 flex flex-wrap gap-2 px-1">
              {saved.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() =>
                    addRec({
                      name: b.name,
                      phone: b.phone ?? "",
                      province: b.province ?? "",
                      amount: "",
                    })
                  }
                  className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-foreground transition active:scale-95"
                >
                  ＋ {b.favorite ? "⭐ " : ""}
                  {b.apodo}
                </button>
              ))}
              {derived.map((b, i) => (
                <button
                  key={`d-${i}`}
                  type="button"
                  onClick={() =>
                    addRec({
                      name: b.name,
                      phone: b.phone ?? "",
                      province: b.province ?? "",
                      amount: "",
                    })
                  }
                  className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition active:scale-95"
                >
                  ＋ {b.name}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {recipients.map((r, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {tr("Beneficiario")} {i + 1}
                  </p>
                  {recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRec(i)}
                      aria-label={tr("Quitar")}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-destructive transition active:scale-90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Input
                  placeholder={tr("Nombre de quien recibe")}
                  value={r.name}
                  onChange={(e) => updateRec(i, { name: e.target.value })}
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input
                    inputMode="tel"
                    placeholder="+53…"
                    value={r.phone}
                    onChange={(e) => updateRec(i, { phone: e.target.value })}
                  />
                  <Input
                    placeholder={tr("Provincia")}
                    value={r.province}
                    onChange={(e) => updateRec(i, { province: e.target.value })}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="1"
                    placeholder={tr("Monto USD")}
                    value={r.amount}
                    onChange={(e) => updateRec(i, { amount: e.target.value })}
                  />
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {(parseFloat(r.amount) || 0) > 0 && rate > 0
                      ? `≈ ${localAmount((parseFloat(r.amount) || 0) * effRate)} ${currency}`
                      : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addRec()}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm font-semibold text-foreground transition active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> {tr("Añadir beneficiario")}
          </button>

          {totalUsd > 0 && (
            <div className="mt-3 rounded-xl bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">{tr("Total a enviar")}</p>
              <p className="text-lg font-bold text-foreground">{usd(totalUsd)}</p>
              <p className="text-[11px] text-muted-foreground">
                {validRecipients.length} {tr("beneficiarios")}
              </p>
            </div>
          )}
        </div>
      )}

      {!multi && (
      <div className="border-t border-border pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {tr("¿Quién recibe en Cuba?")}
        </p>

        {(saved.length > 0 || derived.length > 0) && (
          <div className="-mx-1 mb-3 flex flex-wrap gap-2 px-1">
            {saved.map((b) => (
              <span
                key={b.id}
                className={
                  "flex items-center gap-1 rounded-full border py-1.5 pl-3 pr-1.5 text-xs font-semibold transition " +
                  (bName === b.name
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-primary/30 bg-primary/5 text-foreground")
                }
              >
                <button
                  type="button"
                  onClick={() => pick(b)}
                  className="transition active:scale-95"
                >
                  {b.favorite ? "⭐ " : ""}
                  {b.apodo}
                </button>
                <button
                  type="button"
                  onClick={() => removeSaved(b.id)}
                  aria-label={tr("Borrar guardado")}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {derived.map((b, i) => (
              <button
                key={`d-${i}`}
                type="button"
                onClick={() => pick(b)}
                className={
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 " +
                  (bName === b.name
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground")
                }
              >
                {b.name}
                {b.province ? (
                  <span className="text-muted-foreground"> · {b.province}</span>
                ) : null}
              </button>
            ))}
          </div>
        )}

        <Field label={tr("Nombre del beneficiario")}>
          <Input
            name="beneficiary_name"
            placeholder={tr("Nombre de quien recibe")}
            value={bName}
            onChange={(e) => setBName(e.target.value)}
            required
          />
        </Field>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label={tr("Teléfono")}>
            <Input
              name="beneficiary_phone"
              inputMode="tel"
              placeholder="+53…"
              value={bPhone}
              onChange={(e) => setBPhone(e.target.value)}
            />
          </Field>
          <Field label={tr("Provincia")}>
            <Input
              name="province"
              placeholder={tr("Ej: La Habana")}
              value={bProv}
              onChange={(e) => setBProv(e.target.value)}
            />
          </Field>
        </div>

        {/* Guardar beneficiario con apodo */}
        {bName.trim() && !alreadySaved && (
          <div className="mt-2 flex items-end gap-2">
            <Field label={tr("Apodo (opcional)")}>
              <Input
                value={apodo}
                onChange={(e) => setApodo(e.target.value)}
                placeholder={tr("Ej: Mamá")}
              />
            </Field>
            <button
              type="button"
              onClick={saveCurrent}
              className="mb-0.5 flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-foreground transition active:scale-95"
            >
              <Bookmark className="h-4 w-4" /> {tr("Guardar")}
            </button>
          </div>
        )}
      </div>
      )}

      <Field label={tr("Nota (opcional)")}>
        <Textarea
          name="note"
          rows={2}
          placeholder={tr("Algún detalle para el negocio…")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      {!multi && pointsBalance >= redeemMin && (
        <label className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <input
            type="checkbox"
            name="redeem"
            className="mt-0.5 h-4 w-4 accent-[color:hsl(var(--primary))]"
          />
          <span className="text-sm">
            <span className="font-semibold text-foreground">{tr("Usar mis puntos")}</span>
            <span className="block text-xs text-muted-foreground">
              {tr("Tienes")} {pointsBalance} {tr("puntos (hasta")}{" "}
              {usd(pointsBalance * pointValue)}
              {tr("). El negocio aplica el descuento al aceptar.")}
            </span>
          </span>
        </label>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={multi && validRecipients.length === 0}
      >
        {multi
          ? validRecipients.length > 1
            ? `${tr("Enviar")} ${validRecipients.length} ${tr("pedidos")}`
            : tr("Enviar pedidos")
          : tr("Enviar pedido")}
      </Button>
    </form>
  );
}
