"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { Field, Input, Textarea, Button, Select } from "@/components/ui";
import { createVaquita } from "@/app/actions";

// Botón + hoja para crear una vaquita familiar (organizador).
export function VaquitaCreate() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="w-full" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Crear vaquita
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Nueva vaquita familiar">
        <form action={createVaquita} className="space-y-3">
          <Field label="Nombre de la vaquita (opcional)" hint="Para reconocerla.">
            <Input name="title" placeholder="Ej: Cumple de mamá" />
          </Field>
          <Field label="¿Quién recibe en Cuba?">
            <Input
              name="beneficiary_name"
              required
              placeholder="Nombre del beneficiario"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono (opcional)">
              <Input name="beneficiary_phone" inputMode="tel" placeholder="+53 …" />
            </Field>
            <Field label="Provincia">
              <Input name="province" placeholder="Ej: La Habana" />
            </Field>
          </div>
          <Field label="Dirección en Cuba (opcional)">
            <Textarea name="beneficiary_address" rows={2} placeholder="Calle, número, entre calles, municipio…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Meta (USD)" hint="0 = sin meta fija.">
              <Input name="goal_usd" type="number" min="0" step="1" placeholder="200" />
            </Field>
            <Field label="Moneda de entrega">
              <Select name="delivery_currency" defaultValue="CUP">
                {["CUP", "USD", "MLC", "EUR"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Fecha límite (opcional)">
            <Input name="deadline" type="date" />
          </Field>
          <Button type="submit" className="w-full">
            Crear vaquita
          </Button>
        </form>
      </Sheet>
    </>
  );
}
