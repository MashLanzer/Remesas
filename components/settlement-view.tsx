"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { Card, Button, Field, Input, Select, Textarea, EmptyState } from "@/components/ui";
import { createSettlement, deleteSettlement } from "@/app/actions";
import { usd, formatDate } from "@/lib/utils";
import type { Settlement } from "@/lib/types";

export function SettlementView({
  settlements,
  suggested = 0,
  toCubaLabel = "a Cuba",
}: {
  settlements: Settlement[];
  suggested?: number;
  toCubaLabel?: string;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <Button
        variant={showForm ? "secondary" : "primary"}
        className="mb-4 w-full"
        onClick={() => setShowForm((s) => !s)}
      >
        <Plus className="h-4 w-4" />
        {showForm ? "Cerrar" : "Registrar pago"}
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
              <Field
                label="Monto (USD)"
                hint={suggested > 0 ? `Para saldar: ${usd(suggested)}` : undefined}
              >
                <Input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  defaultValue={suggested > 0 ? String(suggested) : ""}
                />
              </Field>
            </div>
            <Field label="Sentido del pago" hint="Quién pagó a quién para saldar">
              <Select name="direction" defaultValue="us_to_cuba">
                <option value="us_to_cuba">Envié {toCubaLabel} (bajo el saldo)</option>
                <option value="cuba_to_us">Recibí de Cuba</option>
              </Select>
            </Field>
            <Field label="Método">
              <Input name="method" placeholder="Zelle, efectivo…" />
            </Field>
            <Field label="Notas">
              <Textarea name="notes" rows={2} />
            </Field>
            <Button type="submit" className="w-full">Guardar pago</Button>
          </form>
        </Card>
      )}

      <h2 className="mb-2 text-sm font-semibold text-foreground">Historial</h2>
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
            (toCuba ? "bg-info/10 text-info" : "bg-income/10 text-income")
          }
        >
          {toCuba ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">
            {toCuba ? "Enviado a Cuba" : "Recibido de Cuba"}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(s.date)}
            {s.method ? ` · ${s.method}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{usd(s.amount)}</span>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm("¿Eliminar esta liquidación?")) start(() => deleteSettlement(s.id));
          }}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
