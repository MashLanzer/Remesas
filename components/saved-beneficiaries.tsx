"use client";

import { useEffect, useState } from "react";
import { BookUser, Pencil, Trash2, Check, X, Phone, MapPin } from "lucide-react";
import { Card } from "@/components/ui";
import { useDialog } from "@/components/confirm";

type Saved = {
  apodo: string;
  name: string;
  phone: string | null;
  province: string | null;
};

const SAVED_KEY = "giro_c_benefs";

export function SavedBeneficiaries() {
  const { confirm } = useDialog();
  const [saved, setSaved] = useState<Saved[]>([]);
  const [ready, setReady] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      /* nada */
    }
    setReady(true);
  }, []);

  function persist(next: Saved[]) {
    setSaved(next);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {
      /* nada */
    }
  }

  function startEdit(i: number) {
    setEditingIdx(i);
    setDraft(saved[i].apodo);
  }
  function saveEdit(i: number) {
    const val = draft.trim();
    if (!val) return;
    const next = saved.map((s, idx) => (idx === i ? { ...s, apodo: val } : s));
    persist(next);
    setEditingIdx(null);
  }
  async function remove(i: number) {
    const ok = await confirm({
      title: "Quitar de la libreta",
      message: `¿Quitar a "${saved[i].apodo}" de tus beneficiarios guardados?`,
      confirmLabel: "Quitar",
    });
    if (!ok) return;
    persist(saved.filter((_, idx) => idx !== i));
  }

  if (!ready) return null;

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <BookUser className="h-4 w-4" /> Mi libreta
      </h2>

      {saved.length === 0 ? (
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no has guardado beneficiarios. Al enviar una remesa puedes
            guardar a quien recibe con un apodo para reutilizarlo la próxima vez.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {saved.map((s, i) => (
            <Card key={`${s.name}-${i}`} className="flex items-center gap-3 p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {(s.apodo || s.name).trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                {editingIdx === i ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(i);
                      if (e.key === "Escape") setEditingIdx(null);
                    }}
                    className="w-full rounded-lg border border-input bg-background px-2 py-1 text-sm font-semibold text-foreground outline-none focus:border-primary"
                    placeholder="Apodo"
                  />
                ) : (
                  <>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {s.apodo}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.name}
                    </p>
                    {(s.phone || s.province) && (
                      <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        {s.phone && (
                          <span className="flex items-center gap-0.5">
                            <Phone className="h-3 w-3" /> {s.phone}
                          </span>
                        )}
                        {s.province && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" /> {s.province}
                          </span>
                        )}
                      </p>
                    )}
                  </>
                )}
              </div>

              {editingIdx === i ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => saveEdit(i)}
                    aria-label="Guardar apodo"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition active:scale-90"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingIdx(null)}
                    aria-label="Cancelar"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition active:scale-90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(i)}
                    aria-label="Editar apodo"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-90"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label="Quitar"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-destructive transition hover:bg-destructive/10 active:scale-90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
