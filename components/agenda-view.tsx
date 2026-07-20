"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Phone, MapPin, Search } from "lucide-react";
import {
  Card,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  EmptyState,
} from "@/components/ui";
import {
  createClientRecord,
  deleteClientRecord,
  createBeneficiary,
  deleteBeneficiary,
} from "@/app/actions";
import { DELIVERY_CURRENCIES, type Beneficiary, type Client } from "@/lib/types";

export function AgendaView({
  clients,
  beneficiaries,
}: {
  clients: Client[];
  beneficiaries: Beneficiary[];
}) {
  const [tab, setTab] = useState<"clientes" | "beneficiarios">("clientes");
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");

  const term = q.trim().toLowerCase();
  const fClients = useMemo(
    () =>
      clients.filter((c) =>
        [c.name, c.phone, c.country]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term)
      ),
    [clients, term]
  );
  const fBeneficiaries = useMemo(
    () =>
      beneficiaries.filter((b) =>
        [b.name, b.phone, b.province]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term)
      ),
    [beneficiaries, term]
  );

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <TabButton
          active={tab === "clientes"}
          onClick={() => {
            setTab("clientes");
            setShowForm(false);
          }}
        >
          Clientes ({clients.length})
        </TabButton>
        <TabButton
          active={tab === "beneficiarios"}
          onClick={() => {
            setTab("beneficiarios");
            setShowForm(false);
          }}
        >
          Beneficiarios ({beneficiaries.length})
        </TabButton>
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o teléfono…"
          className="w-full rounded-xl border border-input bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      <Button
        variant={showForm ? "secondary" : "primary"}
        className="mb-4 w-full"
        onClick={() => setShowForm((s) => !s)}
      >
        <Plus className="h-4 w-4" />
        {showForm
          ? "Cerrar"
          : tab === "clientes"
          ? "Añadir cliente"
          : "Añadir beneficiario"}
      </Button>

      {showForm && tab === "clientes" && (
        <ClientForm onDone={() => setShowForm(false)} />
      )}
      {showForm && tab === "beneficiarios" && (
        <BeneficiaryForm clients={clients} onDone={() => setShowForm(false)} />
      )}

      {tab === "clientes" ? (
        fClients.length === 0 ? (
          <EmptyState
            title={term ? "Sin resultados" : "Sin clientes"}
            description={
              term ? "Prueba con otro nombre." : "Añade a las personas que te pagan."
            }
          />
        ) : (
          <div className="space-y-2">
            {fClients.map((c) => (
              <ContactCard
                key={c.id}
                name={c.name}
                lines={[c.phone, c.country].filter(Boolean) as string[]}
                onDelete={() => deleteClientRecord(c.id)}
              />
            ))}
          </div>
        )
      ) : fBeneficiaries.length === 0 ? (
        <EmptyState
          title={term ? "Sin resultados" : "Sin beneficiarios"}
          description={
            term ? "Prueba con otro nombre." : "Añade a quienes reciben en Cuba."
          }
        />
      ) : (
        <div className="space-y-2">
          {fBeneficiaries.map((b) => (
            <ContactCard
              key={b.id}
              name={b.name}
              lines={[
                b.phone,
                b.province,
                b.preferred_currency ? `Prefiere ${b.preferred_currency}` : null,
              ].filter(Boolean) as string[]}
              onDelete={() => deleteBeneficiary(b.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition " +
        (active
          ? "bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground border border-border")
      }
    >
      {children}
    </button>
  );
}

function ContactCard({
  name,
  lines,
  onDelete,
}: {
  name: string;
  lines: string[];
  onDelete: () => Promise<void>;
}) {
  const [pending, start] = useTransition();
  const initial = name.charAt(0).toUpperCase();
  return (
    <Card className="flex items-center justify-between p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {lines.map((l, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {i === 0 && lines[0] === l ? (
                  <Phone className="h-3 w-3" />
                ) : (
                  <MapPin className="h-3 w-3" />
                )}
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm(`¿Eliminar a ${name}?`)) start(() => onDelete());
        }}
        className="ml-2 rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </Card>
  );
}

function ClientForm({ onDone }: { onDone: () => void }) {
  return (
    <Card className="mb-4">
      <form
        action={async (fd) => {
          await createClientRecord(fd);
          onDone();
        }}
        className="space-y-3"
      >
        <Field label="Nombre">
          <Input name="name" required placeholder="Nombre del cliente" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <Input name="phone" placeholder="+1…" />
          </Field>
          <Field label="País">
            <Input name="country" placeholder="EE.UU." />
          </Field>
        </div>
        <Field label="Notas">
          <Textarea name="notes" rows={2} />
        </Field>
        <Button type="submit" className="w-full">
          Guardar cliente
        </Button>
      </form>
    </Card>
  );
}

function BeneficiaryForm({
  clients,
  onDone,
}: {
  clients: Client[];
  onDone: () => void;
}) {
  return (
    <Card className="mb-4">
      <form
        action={async (fd) => {
          await createBeneficiary(fd);
          onDone();
        }}
        className="space-y-3"
      >
        <Field label="Nombre">
          <Input name="name" required placeholder="Nombre en Cuba" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <Input name="phone" placeholder="+53…" />
          </Field>
          <Field label="Provincia">
            <Input name="province" placeholder="La Habana" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Moneda preferida">
            <Select name="preferred_currency" defaultValue="">
              <option value="">—</option>
              {DELIVERY_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Carnet (CI)">
            <Input name="id_card" placeholder="Opcional" />
          </Field>
        </div>
        <Field label="Cliente asociado">
          <Select name="client_id" defaultValue="">
            <option value="">— Ninguno —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" className="w-full">
          Guardar beneficiario
        </Button>
      </form>
    </Card>
  );
}
