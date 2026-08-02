"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  BookUser,
  Settings,
  Lock,
  ShieldCheck,
  MessageCircle,
  HelpCircle,
  MessageSquareQuote,
  Info,
  ChevronRight,
  Send,
  Check,
  PartyPopper,
} from "lucide-react";
import { Sheet } from "@/components/sheet";
import { Card, Field, Input, Button } from "@/components/ui";
import { SavedBeneficiaries } from "@/components/saved-beneficiaries";
import { ThemeSwitch } from "@/components/theme-switch";
import { LangSwitch } from "@/components/lang-switch";
import { DataModeSwitch } from "@/components/data-mode-switch";
import { ClearLocalData } from "@/components/clear-local-data";
import { PinSetup } from "@/components/pin-setup";
import { BiometricSetup } from "@/components/biometric-setup";
import { AccountDataControls } from "@/components/account-data-controls";
import { updateClientProfile } from "@/app/actions";
import { useT } from "@/components/lang-provider";

type Sheets =
  | null
  | "datos"
  | "libreta"
  | "ajustes"
  | "seguridad"
  | "cuenta"
  | "como";

// Menú del perfil del cliente: filas agrupadas; cada cosa editable/ajuste abre
// en una hoja (bottom sheet) para reducir el scroll y separar por temas.
export function PerfilMenu({
  profile,
  email,
  hasAvatar,
  bizWa,
  businessName,
}: {
  profile: {
    full_name?: string | null;
    phone?: string | null;
    phone2?: string | null;
    address?: string | null;
  };
  email?: string | null;
  hasAvatar: boolean;
  bizWa: string | null;
  businessName: string | null;
}) {
  const t = useT();
  const [open, setOpen] = useState<Sheets>(null);
  const close = () => setOpen(null);

  return (
    <div className="space-y-5">
      {/* Grupo: Cuenta */}
      <Group label={t("Cuenta")}>
        <Row
          icon={User}
          title={t("Mis datos")}
          subtitle={t("Nombre, foto, teléfonos y dirección")}
          onClick={() => setOpen("datos")}
        />
        <Row
          icon={BookUser}
          title={t("Mi libreta")}
          subtitle={t("Beneficiarios guardados")}
          onClick={() => setOpen("libreta")}
        />
      </Group>

      {/* Grupo: Preferencias */}
      <Group label={t("Preferencias")}>
        <Row
          icon={Settings}
          title={t("Ajustes de la app")}
          subtitle={t("Idioma, tema y ahorro de datos")}
          onClick={() => setOpen("ajustes")}
        />
        <Row
          icon={Lock}
          title={t("Seguridad")}
          subtitle={t("PIN y desbloqueo con huella")}
          onClick={() => setOpen("seguridad")}
        />
      </Group>

      {/* Grupo: Ayuda */}
      <Group label={t("Ayuda")}>
        {bizWa && (
          <RowLink
            href={bizWa}
            external
            icon={MessageCircle}
            tone="income"
            title={t("Escribir al negocio")}
            subtitle={
              businessName
                ? `${t("Dudas o ayuda con")} ${businessName} · WhatsApp`
                : `${t("Dudas o ayuda con tu envío")} · WhatsApp`
            }
          />
        )}
        <RowLink
          href="/c/ayuda"
          icon={HelpCircle}
          title={t("Centro de ayuda")}
          subtitle={t("Tarifas, tiempos y preguntas frecuentes")}
        />
        <RowLink
          href="/c/opiniones"
          icon={MessageSquareQuote}
          title={t("Opiniones")}
          subtitle={t("Lo que dicen otros clientes del negocio")}
        />
        <Row
          icon={Info}
          title={t("Cómo funciona")}
          subtitle={t("El envío en 3 pasos")}
          onClick={() => setOpen("como")}
        />
      </Group>

      {/* Grupo: Cuenta y datos */}
      <Group label={t("Cuenta y datos")}>
        <Row
          icon={ShieldCheck}
          title={t("Exportar o eliminar")}
          subtitle={t("Descarga tus datos o borra tu cuenta")}
          onClick={() => setOpen("cuenta")}
        />
      </Group>

      {/* ───── Hojas (bottom sheets) ───── */}
      <Sheet open={open === "datos"} onClose={close} title={t("Mis datos")}>
        <form action={updateClientProfile} className="space-y-3">
          <Field label={t("Nombre")}>
            <Input
              name="full_name"
              defaultValue={profile.full_name ?? ""}
              placeholder={t("Tu nombre")}
            />
          </Field>
          <Field
            label={t("Foto de perfil (opcional)")}
            hint={
              hasAvatar
                ? t("Sube otra para reemplazarla.")
                : t("Se ve en tu perfil, en vez de la inicial.")
            }
          >
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
            />
          </Field>
          <Field
            label={t("Teléfono / WhatsApp")}
            hint={t("El negocio te contactará por aquí.")}
          >
            <Input
              name="phone"
              inputMode="tel"
              defaultValue={profile.phone ?? ""}
              placeholder="+1 305 000 0000"
            />
          </Field>
          <Field
            label={t("Segundo teléfono (opcional)")}
            hint={t("Por si no contestan el principal.")}
          >
            <Input
              name="phone2"
              inputMode="tel"
              defaultValue={profile.phone2 ?? ""}
              placeholder="+1 786 000 0000"
            />
          </Field>
          <Field
            label={t("Dirección o ciudad (opcional)")}
            hint={t("Ayuda al negocio a ubicarte.")}
          >
            <Input
              name="address"
              defaultValue={profile.address ?? ""}
              placeholder={t("Ej: Miami, FL")}
            />
          </Field>
          {email && <p className="text-xs text-muted-foreground">{email}</p>}
          <Button type="submit" className="w-full">
            {t("Guardar")}
          </Button>
        </form>
      </Sheet>

      <Sheet open={open === "libreta"} onClose={close} title={t("Mi libreta")}>
        <SavedBeneficiaries />
      </Sheet>

      <Sheet
        open={open === "ajustes"}
        onClose={close}
        title={t("Ajustes de la app")}
      >
        <div className="space-y-4">
          <LangSwitch />
          <div className="border-t border-border" />
          <ThemeSwitch />
          <div className="border-t border-border" />
          <DataModeSwitch />
          <div className="border-t border-border" />
          <ClearLocalData />
        </div>
      </Sheet>

      <Sheet
        open={open === "seguridad"}
        onClose={close}
        title={t("Seguridad")}
      >
        <div className="space-y-4">
          <PinSetup />
          <div className="border-t border-border" />
          <BiometricSetup />
        </div>
      </Sheet>

      <Sheet
        open={open === "cuenta"}
        onClose={close}
        title={t("Cuenta y datos")}
      >
        <AccountDataControls />
      </Sheet>

      <Sheet open={open === "como"} onClose={close} title={t("Cómo funciona")}>
        <div className="space-y-3">
          <HowStep
            n={1}
            icon={Send}
            title={t("Pides tu remesa")}
            desc={t("Eliges el monto y quién recibe en Cuba.")}
          />
          <HowStep
            n={2}
            icon={Check}
            title={t("El negocio la acepta")}
            desc={t("Confirma el envío y empieza el reparto.")}
          />
          <HowStep
            n={3}
            icon={PartyPopper}
            title={t("Llega a tu familia")}
            desc={t("Sigues cada paso y ganas puntos con cada envío.")}
          />
        </div>
      </Sheet>
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

const rowBase =
  "flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left transition active:scale-[0.99]";

function Row({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof User;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={rowBase}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {subtitle}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
}

function RowLink({
  href,
  external,
  icon: Icon,
  title,
  subtitle,
  tone = "primary",
}: {
  href: string;
  external?: boolean;
  icon: typeof User;
  title: string;
  subtitle: string;
  tone?: "primary" | "income";
}) {
  const iconCls =
    tone === "income" ? "bg-income/10 text-income" : "bg-primary/10 text-primary";
  const inner = (
    <>
      <span
        className={
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " +
          iconCls
        }
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {subtitle}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={rowBase}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={rowBase}>
      {inner}
    </Link>
  );
}

function HowStep({
  n,
  icon: Icon,
  title,
  desc,
}: {
  n: number;
  icon: typeof Send;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {n}
        </span>
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
