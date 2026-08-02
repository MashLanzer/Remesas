"use client";

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { useDialog } from "@/components/confirm";
import { useT } from "@/components/lang-provider";
import { exportMyData, deleteMyAccount } from "@/app/actions";

// Controles de cuenta y datos del cliente: exportar todos sus datos (descarga
// JSON) y eliminar la cuenta (borrado de datos personales + anonimización de
// pedidos, con doble confirmación).
export function AccountDataControls() {
  const { confirm, notify } = useDialog();
  const t = useT();
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);

  async function onExport() {
    setBusy("export");
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `giro-mis-datos-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      notify(t("No se pudo exportar. Inténtalo de nuevo."));
    } finally {
      setBusy(null);
    }
  }

  async function onDelete() {
    const ok = await confirm({
      title: t("¿Eliminar tu cuenta?"),
      message: t(
        "Se borrarán tu perfil, puntos, beneficiarios y reseñas. Tus pedidos se conservan sin tus datos personales. Esta acción no se puede deshacer."
      ),
      confirmLabel: t("Eliminar cuenta"),
    });
    if (!ok) return;
    setBusy("delete");
    try {
      await deleteMyAccount();
      // deleteMyAccount redirige al login; si no, avisamos.
    } catch {
      setBusy(null);
      notify(t("No se pudo eliminar la cuenta. Inténtalo de nuevo."));
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={onExport}
        disabled={busy !== null}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition active:scale-[0.99] disabled:opacity-60"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {busy === "export" ? t("Preparando…") : t("Exportar mis datos")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("Descarga un archivo con toda tu información.")}
          </p>
        </div>
      </button>

      <button
        onClick={onDelete}
        disabled={busy !== null}
        className="flex w-full items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-left transition active:scale-[0.99] disabled:opacity-60"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Trash2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-destructive">
            {busy === "delete" ? t("Eliminando…") : t("Eliminar mi cuenta")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("Borra tus datos personales de forma permanente.")}
          </p>
        </div>
      </button>
    </div>
  );
}
