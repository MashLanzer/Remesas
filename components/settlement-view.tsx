"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { Card, Button, Field, Input, Select, Textarea, EmptyState } from "@/components/ui";
import { createSettlement, deleteSettlement } from "@/app/actions";
import { usd, formatDate } from "@/lib/utils";
import type { Settlement } from "@/lib/types";

export function SettlementView({ settlements }: { settlements: Settlement[] }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <Button
        variant={showForm ? "secondary" : "primary"}
        className="mb-4 w-full"
        onClick={() => setShowForm((s) => !s)}
      >
        <Plus className="h-4 w-4" />
        {showForm ? "Cerrar" : "Registrar liquidación"}
      </Button>

      {showForm && (
        <Card className="mb-4">
          <form
            action={async (fd) => {
              await createSettlement(fd);
              setShowForm(false);
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha">
                <Input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </Field>
              <Field label="Monto (USD)">
                <Input type="number" name="amount" step="0.01" min="0" required placeholder="0.00" />
              </Field>
            </div>
            <Field label="Sentido del pago" hint="Quién le pagó a quién para saldar">
              <Select name="direction" defaultValue="us_to_cuba">
                <option value="us_to_cuba">Yo envié a Cuba (bajo mi deuda)</option>
                <option value="cuba_to_us">El socio me envió a mí</option>
              </Select>
            </Field>
            <Field label="Método">
              <Input name="method" placeholder="Zelle, efectivo…" />
            </Field>
            <Field label="Notas">
              <Textarea name="notes" rows={2} />
            </Field>
            <Button type="submit" className="w-full">Guardar liquidación</Button>
          </form>
        </Card>
      )}

      <h2 className="mb-2 text-sm font-semibold text-slate-700">Historial</h2>
      {settlements.length === 0 ? (
        <EmptyState
          title="Sin liquidaciones"
          description="Registra aquí cada vez que salden cuentas."
        />
      ) : (
        <div className="space-y-2">
          {settlements.map((s) => (
            <SettlementCard key={s.id} settlement={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function SettlementCard({ settlement: s }: { settlement: Settlement }) {
  const [pending, start] = useTransition();
  const toCuba = s.direction === "us_to_cuba";
  return (
    <Card className="flex items-center justify-between p-3.5">
      <div className="flex items-center gap-3">
        <span
          className={
            "flex h-9 w-9 items-center justify-center rounded-full " +
            (toCuba ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600")
          }
        >
          {toCuba ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        </span>
        <div>
          <p className="text-sm font-medium text-slate-900">
            {toCuba ? "Enviado a Cuba" : "Recibido del socio"}
          </p>
          <p className="text-xs text-slate-400">
            {formatDate(s.date)}
            {s.method ? ` · ${s.method}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-900">{usd(s.amount)}</span>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm("¿Eliminar esta liquidación?")) start(() => deleteSettlement(s.id));
          }}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
