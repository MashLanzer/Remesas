"use client";

import { useEffect, useState, useTransition } from "react";
import {
  BookUser,
  Pencil,
  Trash2,
  Check,
  X,
  Phone,
  MapPin,
  Star,
  StickyNote,
} from "lucide-react";
import { Card } from "@/components/ui";
import { useDialog } from "@/components/confirm";
import {
  listSavedBeneficiaries,
  addSavedBeneficiary,
  renameSavedBeneficiary,
  toggleFavoriteSavedBeneficiary,
  deleteSavedBeneficiary,
  saveSavedBeneficiaryNote,
} from "@/app/actions";
import type { ClientSavedBeneficiary } from "@/lib/types";
import { useT } from "@/components/lang-provider";

const SAVED_KEY = "giro_c_benefs";

export function SavedBeneficiaries() {
  const tr = useT();
  const { confirm } = useDialog();
  const [saved, setSaved] = useState<ClientSavedBeneficiary[]>([]);
  const [ready, setReady] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // Edición de la nota (independiente del apodo).
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [, start] = useTransition();

  // Carga de la nube. Si está vacía pero hay libreta vieja en el teléfono,
  // la importa una sola vez y luego limpia el localStorage.
  useEffect(() => {
    (async () => {
      let list = await listSavedBeneficiaries();
      if (list.length === 0) {
        try {
          const raw = localStorage.getItem(SAVED_KEY);
          const old = raw ? (JSON.parse(raw) as ClientSavedBeneficiary[]) : [];
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
      setReady(true);
    })();
  }, []);

  function startEdit(b: ClientSavedBeneficiary) {
    setEditingId(b.id);
    setDraft(b.apodo);
  }
  function saveEdit(id: string) {
    const val = draft.trim();
    if (!val) return;
    setSaved((s) => s.map((b) => (b.id === id ? { ...b, apodo: val } : b)));
    setEditingId(null);
    start(() => renameSavedBeneficiary(id, val));
  }
  function startNote(b: ClientSavedBeneficiary) {
    setNoteId(b.id);
    setNoteDraft(b.note ?? "");
  }
  function saveNote(id: string) {
    const val = noteDraft.trim();
    setSaved((s) =>
      s.map((b) => (b.id === id ? { ...b, note: val || null } : b))
    );
    setNoteId(null);
    start(() => saveSavedBeneficiaryNote(id, val));
  }
  function toggleFav(b: ClientSavedBeneficiary) {
    setSaved((s) =>
      s.map((x) => (x.id === b.id ? { ...x, favorite: !x.favorite } : x))
    );
    start(() => toggleFavoriteSavedBeneficiary(b.id, !b.favorite));
  }
  async function remove(b: ClientSavedBeneficiary) {
    const ok = await confirm({
      title: tr("Quitar de la libreta"),
      message: `${tr("¿Quitar a")} "${b.apodo}" ${tr("de tus beneficiarios guardados?")}`,
      confirmLabel: tr("Quitar"),
    });
    if (!ok) return;
    setSaved((s) => s.filter((x) => x.id !== b.id));
    start(() => deleteSavedBeneficiary(b.id));
  }

  if (!ready) return null;

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <BookUser className="h-4 w-4" /> {tr("Mi libreta")}
      </h2>

      {saved.length === 0 ? (
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {tr(
              "Aún no has guardado beneficiarios. Al enviar una remesa puedes guardar a quien recibe con un apodo para reutilizarlo la próxima vez."
            )}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {saved.map((s) => (
            <Card key={s.id} className="p-3.5">
              <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {(s.apodo || s.name).trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                {editingId === s.id ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(s.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full rounded-lg border border-input bg-background px-2 py-1 text-sm font-semibold text-foreground outline-none focus:border-primary"
                    placeholder={tr("Apodo")}
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
                    {s.address && (
                      <p className="mt-0.5 flex items-start gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        <span className="line-clamp-2">{s.address}</span>
                      </p>
                    )}
                  </>
                )}
              </div>

              {editingId === s.id ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => saveEdit(s.id)}
                    aria-label={tr("Guardar apodo")}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition active:scale-90"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    aria-label={tr("Cancelar")}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition active:scale-90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => toggleFav(s)}
                    aria-label={s.favorite ? tr("Quitar favorito") : tr("Marcar favorito")}
                    className={
                      "flex h-8 w-8 items-center justify-center rounded-full transition active:scale-90 " +
                      (s.favorite ? "text-primary" : "text-muted-foreground hover:bg-muted")
                    }
                  >
                    <Star className={"h-4 w-4" + (s.favorite ? " fill-primary" : "")} />
                  </button>
                  <button
                    type="button"
                    onClick={() => (noteId === s.id ? setNoteId(null) : startNote(s))}
                    aria-label={s.note ? tr("Editar nota") : tr("Añadir nota")}
                    className={
                      "flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-muted active:scale-90 " +
                      (s.note ? "text-primary" : "text-muted-foreground")
                    }
                  >
                    <StickyNote className={"h-4 w-4" + (s.note ? " fill-primary/20" : "")} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    aria-label={tr("Editar apodo")}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-90"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(s)}
                    aria-label={tr("Quitar")}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-destructive transition hover:bg-destructive/10 active:scale-90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              </div>

              {/* Nota del beneficiario: editor si está activo, si no, el texto. */}
              {noteId === s.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    autoFocus
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={2}
                    placeholder={tr("Ej: recibe en CUP, edificio azul, avisar antes…")}
                    className="w-full resize-none rounded-lg border border-input bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => saveNote(s.id)}
                      className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition active:scale-95"
                    >
                      <Check className="h-3.5 w-3.5" /> {tr("Guardar nota")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteId(null)}
                      className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground transition active:scale-95"
                    >
                      <X className="h-3.5 w-3.5" /> {tr("Cancelar")}
                    </button>
                  </div>
                </div>
              ) : (
                s.note && (
                  <button
                    type="button"
                    onClick={() => startNote(s)}
                    className="mt-2 flex w-full items-start gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5 text-left text-xs text-muted-foreground transition active:scale-[0.99]"
                  >
                    <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="whitespace-pre-line">{s.note}</span>
                  </button>
                )
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
