"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  Card,
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import {
  createClientRecord,
  createBeneficiary,
  deleteClientRecord,
  deleteBeneficiary,
} from "@/app/actions";
import { DELIVERY_CURRENCIES, type Beneficiary, type Client } from "@/lib/types";

export function ContactActions({
  kind,
  client,
  beneficiary,
  clients,
}: {
  kind: "cliente" | "beneficiario";
  client?: Client;
  beneficiary?: Beneficiary;
  clients?: Client[];
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const id = client?.id ?? beneficiary?.id ?? "";
  const name = client?.name ?? beneficiary?.name ?? "";

  function onDelete() {
    if (!confirm(`¿Eliminar a ${name}?`)) return;
    start(async () => {
      if (kind === "cliente") await deleteClientRecord(id);
      else await deleteBeneficiary(id);
      router.push("/agenda");
    });
  }

  return (
    <div className="space-y-3">
      {editing && (
        <Card>
          <form
            action={async (fd) => {
              if (kind === "cliente") await createClientRecord(fd);
              else await createBeneficiary(fd);
              setEditing(false);
            }}
            className="space-y-3"
          >
            <input type="hidden" name="id" value={id} />
            <Field label="Nombre">
              <Input name="name" required defaultValue={name} />
            </Field>

            {kind === "cliente" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Teléfono">
                    <Input name="phone" defaultValue={client?.phone ?? ""} />
                  </Field>
                  <Field label="País">
                    <Input name="country" defaultValue={client?.country ?? ""} />
                  </Field>
                </div>
                <Field label="Notas">
                  <Textarea name="notes" rows={2} defaultValue={client?.notes ?? ""} />
                </Field>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Teléfono">
                    <Input name="phone" defaultValue={beneficiary?.phone ?? ""} />
                  </Field>
                  <Field label="Provincia">
                    <Input name="province" defaultValue={beneficiary?.province ?? ""} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Moneda preferida">
                    <Select
                      name="preferred_currency"
                      defaultValue={beneficiary?.preferred_currency ?? ""}
                    >
                      <option value="">—</option>
                      {DELIVERY_CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Cómo recibe">
                    <Select
                      name="preferred_delivery"
                      defaultValue={beneficiary?.preferred_delivery ?? ""}
                    >
                      <option value="">—</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta CUP">Tarjeta CUP</option>
                      <option value="MLC">MLC</option>
                      <option value="Transferencia">Transferencia</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Carnet (CI)">
                    <Input name="id_card" defaultValue={beneficiary?.id_card ?? ""} />
                  </Field>
                  <Field label="Cliente asociado">
                    <Select
                      name="client_id"
                      defaultValue={beneficiary?.client_id ?? ""}
                    >
                      <option value="">— Ninguno —</option>
                      {(clients ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Guardar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!editing && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          <Button variant="danger" disabled={pending} onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Eliminar
          </Button>
        </div>
      )}
    </div>
  );
}
