"use client";

import { useState } from "react";
import { Plus, Trash2, User, MapPin } from "lucide-react";
import { createContact } from "@/app/actions";
import { Card, Field, Input, Select, Textarea, Button } from "@/components/ui";
import { DELIVERY_CURRENCIES } from "@/lib/types";

export function ContactForm() {
  // Filas de beneficiarios: empezamos con una (opcional).
  const [rows, setRows] = useState<number[]>([0]);
  const [nextId, setNextId] = useState(1);

  function addRow() {
    setRows((r) => [...r, nextId]);
    setNextId((n) => n + 1);
  }
  function removeRow(id: number) {
    setRows((r) => (r.length > 1 ? r.filter((x) => x !== id) : r));
  }

  return (
    <form action={createContact} className="space-y-5">
      {/* Cliente */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-bold text-foreground">
          <User className="h-4 w-4 text-primary" /> Cliente (quien paga)
        </h2>
        <Card className="space-y-3">
          <Field label="Nombre">
            <Input name="name" placeholder="Nombre del cliente" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono / WhatsApp">
              <Input name="phone" inputMode="tel" placeholder="Opcional" />
            </Field>
            <Field label="País">
              <Input name="country" placeholder="Opcional" />
            </Field>
          </div>
          <Field label="Notas">
            <Textarea name="notes" rows={2} placeholder="Opcional" />
          </Field>
        </Card>
      </section>

      {/* Beneficiarios */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-bold text-foreground">
          <MapPin className="h-4 w-4 text-primary" /> Beneficiario(s) en Cuba
        </h2>
        <p className="mb-2 px-1 text-xs text-muted-foreground">
          Quién recibe la remesa. Puedes dejarlo vacío y añadirlo después.
        </p>

        <div className="space-y-3">
          {rows.map((id, idx) => (
            <Card key={id} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                  Beneficiario {idx + 1}
                </p>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(id)}
                    className="text-muted-foreground transition active:scale-90"
                    aria-label="Quitar beneficiario"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <Field label="Nombre">
                <Input name="benef_name" placeholder="Nombre de quien recibe" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Teléfono">
                  <Input name="benef_phone" inputMode="tel" placeholder="Opcional" />
                </Field>
                <Field label="Provincia">
                  <Input name="benef_province" placeholder="Ej: Villa Clara" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Moneda preferida">
                  <Select name="benef_currency" defaultValue="">
                    <option value="">—</option>
                    {DELIVERY_CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Carnet (CI)">
                  <Input name="benef_id_card" placeholder="Opcional" />
                </Field>
              </div>
            </Card>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm font-semibold text-muted-foreground transition active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" /> Añadir otro beneficiario
        </button>
      </section>

      <Button type="submit" className="w-full">
        Guardar contacto
      </Button>
    </form>
  );
}
