"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, Plus, X, Search, UserPlus } from "lucide-react";
import { Card } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { setBeneficiaryClient } from "@/app/actions";
import { useDialog } from "@/components/confirm";

type Benef = {
  id: string;
  name: string;
  province: string | null;
  client_id: string | null;
};

export function ClientBeneficiaries({
  clientId,
  beneficiaries,
  clientNames = {},
}: {
  clientId: string;
  beneficiaries: Benef[];
  clientNames?: Record<string, string>;
}) {
  const { confirm } = useDialog();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const associated = beneficiaries.filter((b) => b.client_id === clientId);
  const available = beneficiaries.filter((b) => b.client_id !== clientId);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return available;
    return available.filter(
      (b) =>
        b.name.toLowerCase().includes(t) ||
        (b.province ?? "").toLowerCase().includes(t)
    );
  }, [available, q]);

  function add(b: Benef) {
    setOpen(false);
    setQ("");
    start(() => setBeneficiaryClient(b.id, clientId));
  }

  async function remove(b: Benef) {
    const ok = await confirm({
      title: `¿Quitar a ${b.name}?`,
      message:
        "Dejará de estar asociado a este cliente. El beneficiario no se elimina.",
      confirmLabel: "Quitar",
    });
    if (!ok) return;
    start(() => setBeneficiaryClient(b.id, null));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">
          Beneficiarios ({associated.length})
        </h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-xs font-semibold text-primary transition active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" /> Añadir
        </button>
      </div>

      {associated.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">
          Sin beneficiarios asociados todavía.
        </Card>
      ) : (
        <div className="space-y-2">
          {associated.map((b) => (
            <Card
              key={b.id}
              className="flex items-center gap-2 p-3"
            >
              <Link
                href={`/agenda/beneficiario/${b.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 transition active:scale-[0.99]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {b.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {b.name}
                  </p>
                  {b.province && (
                    <p className="truncate text-xs text-muted-foreground">
                      {b.province}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
              <button
                type="button"
                onClick={() => remove(b)}
                disabled={pending}
                aria-label={`Quitar a ${b.name}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition active:scale-90 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          setQ("");
        }}
        title="Añadir beneficiario"
      >
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o provincia"
            className="w-full bg-transparent text-sm text-foreground outline-none"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {available.length === 0
              ? "No hay más beneficiarios en tu agenda."
              : "Sin resultados."}
          </p>
        ) : (
          <div className="max-h-[55vh] space-y-2 overflow-y-auto">
            {filtered.map((b) => {
              const otherClient =
                b.client_id && b.client_id !== clientId
                  ? clientNames[b.client_id]
                  : null;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => add(b)}
                  disabled={pending}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition active:scale-[0.99] disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {b.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {b.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[b.province, otherClient ? `de ${otherClient}` : null]
                        .filter(Boolean)
                        .join(" · ") || "Sin provincia"}
                    </p>
                  </div>
                  <UserPlus className="h-5 w-5 shrink-0 text-primary" />
                </button>
              );
            })}
          </div>
        )}
      </Sheet>
    </div>
  );
}
