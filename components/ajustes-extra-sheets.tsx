"use client";

import { useState } from "react";
import { SlidersHorizontal, Lock, Database } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/sheet";
import { ThemeSwitch } from "@/components/theme-switch";
import { DataModeSwitch } from "@/components/data-mode-switch";
import { AlertPrefs } from "@/components/alert-prefs";
import { PinSetup } from "@/components/pin-setup";
import { BiometricSetup } from "@/components/biometric-setup";
import { ExportRemittances } from "@/components/export-remittances";
import { ExportAgenda } from "@/components/export-agenda";
import { ClearLocalData } from "@/components/clear-local-data";

// Preferencias de la app (tema, ahorro de datos y avisos) en una sola hoja.
export function PreferencesSheet({ isOperador }: { isOperador: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SheetTrigger
        icon={SlidersHorizontal}
        title="Preferencias"
        subtitle="Tema, ahorro de datos y avisos"
        onClick={() => setOpen(true)}
      />
      <Sheet open={open} onClose={() => setOpen(false)} title="Preferencias">
        <div className="space-y-4">
          <ThemeSwitch />
          <div className="border-t border-border" />
          <DataModeSwitch />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Ideal si tienes internet lento o pocos datos. No descarga las fotos
            de comprobantes hasta que las toques. Se guarda solo en este
            teléfono.
          </p>
          <div className="border-t border-border" />
          <AlertPrefs isOperador={isOperador} />
        </div>
      </Sheet>
    </>
  );
}

// Seguridad: bloqueo con PIN + huella/rostro.
export function SecuritySheet() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SheetTrigger
        icon={Lock}
        title="Seguridad"
        subtitle="Bloqueo con PIN y huella"
        onClick={() => setOpen(true)}
      />
      <Sheet open={open} onClose={() => setOpen(false)} title="Seguridad">
        <div className="space-y-4">
          <PinSetup />
          <BiometricSetup />
        </div>
      </Sheet>
    </>
  );
}

// Exportar y borrar datos locales.
export function DataSheet({
  remittances,
  clients,
  beneficiaries,
}: {
  remittances: React.ComponentProps<typeof ExportRemittances>["remittances"];
  clients: React.ComponentProps<typeof ExportAgenda>["clients"];
  beneficiaries: React.ComponentProps<typeof ExportAgenda>["beneficiaries"];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SheetTrigger
        icon={Database}
        title="Exportar y datos"
        subtitle="Descarga tus datos o limpia este teléfono"
        onClick={() => setOpen(true)}
      />
      <Sheet open={open} onClose={() => setOpen(false)} title="Exportar y datos">
        <div className="space-y-3">
          <ExportRemittances remittances={remittances} />
          <div className="border-t border-border" />
          <ExportAgenda clients={clients} beneficiaries={beneficiaries} />
          <div className="border-t border-border" />
          <ClearLocalData />
        </div>
      </Sheet>
    </>
  );
}
