"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Pencil, ArrowRight, ArrowLeft, ImageIcon } from "lucide-react";
import {
  Card,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  EmptyState,
} from "@/components/ui";
import { createSettlement, deleteSettlement } from "@/app/actions";
import { usd, formatDate } from "@/lib/utils";
import type { Settlement } from "@/lib/types";

export function SettlementView({
  settlements,
  suggested = 0,
  toCubaLabel = "a Cuba",
  delivererId,
}: {
  settlements: Settlement[];
  suggested?: number;
  toCubaLabel?: string;
  delivererId?: string | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Settlement | null>(null);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(s: Settlement) {
    setEditing(s);
    setShowForm(true);
  }
  function close() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div>
      {!showForm && (
        <Button variant="primary" className="mb-4 w-full" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Registrar pago
        </Button>
      )}

      {showForm && (
        <Card className="mb-4">
          <form
            key={editing?.id ?? "new"}
            action={async (fd) => {
              await createSettlement(fd);
              close();
            }}
            className="space-y-3"
          >
            {editing && <input type="hidden" name="id" value={editing.id} />}
            {delivererId && (
              <input type="hidden" name="deliverer_id" value={delivererId} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha">
                <Input
                  type="date"
                  name="date"
                  defaultValue={editing?.date ?? new Date().toISOString().slice(0, 10)}
                />
              </Field>
              <Field
                label="Monto (USD)"
                hint={!editing && suggested > 0 ? `Para saldar: ${usd(suggested)}` : undefined}
              >
                <Input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  defaultValue={
                    editing ? String(editing.amount) : suggested > 0 ? String(suggested) : ""
                  }
                />
              </Field>
            </div>
            <Field label="Sentido del pago">
              <Select
                name="direction"
                defaultValue={editing?.direction ?? "us_to_cuba"}
              >
                <option value="us_to_cuba">Envié {toCubaLabel} (bajo el saldo)</option>
                <option value="cuba_to_us">Recibí de Cuba</option>
              </Select>
            </Field>
            <Field label="Método">
              <Input name="method" defaultValue={editing?.method ?? ""} placeholder="Zelle, efectivo…" />
            </Field>
            <Field label="Notas">
              <Textarea name="notes" rows={2} defaultValue={editing?.notes ?? ""} />
            </Field>
            <Field
              label="Comprobante (foto, opcional)"
              hint={editing?.receipt_url ? "Ya hay una foto. Sube otra para reemplazarla." : undefined}
            >
              <input
                type="file"
                name="receipt"
                accept="image/*"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
              />
            </Field>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={close}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {editing ? "Guardar" : "Guardar pago"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <h2 className="mb-2 text-sm font-semibold text-foreground">Pagos</h2>
      {settlements.length === 0 ? (
        <EmptyState
          title="Sin pagos"
          description="Registra aquí cada vez que salden cuentas."
        />
      ) : (
        <div className="space-y-2">
          {settlements.map((s) => (
            <SettlementCard key={s.id} settlement={s} onEdit={() => openEdit(s)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SettlementCard({
  settlement: s,
  onEdit,
}: {
  settlement: Settlement;
  onEdit: () => void;
}) {
  const [pending, start] = useTransition();
  const toCuba = s.direction === "us_to_cuba";
  return (
    <Card className="p-3.5">
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-1">
          <span className="tabular mr-1 text-sm font-bold text-foreground">
            {usd(s.amount)}
          </span>
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Editar pago"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            disabled={pending}
            onClick={() => {
              if (confirm("¿Eliminar este pago?")) start(() => deleteSettlement(s.id));
            }}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            aria-label="Eliminar pago"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {s.notes && (
        <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
          {s.notes}
        </p>
      )}
      {s.receipt_url && (
        <a
          href={s.receipt_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
        >
          <ImageIcon className="h-3.5 w-3.5" /> Ver comprobante
        </a>
      )}
    </Card>
  );
}
