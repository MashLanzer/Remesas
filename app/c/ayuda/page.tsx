import Link from "next/link";
import {
  ArrowLeft,
  HelpCircle,
  MessageCircle,
  Percent,
  Clock,
  Star,
  Banknote,
} from "lucide-react";
import {
  getBusinessSettings,
  getExchangeRates,
  getMyOperatorContact,
} from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";
import { FaqAccordion, type Faq } from "@/components/faq-accordion";

export const dynamic = "force-dynamic";

export default async function AyudaPage() {
  const [settings, rates, contact] = await Promise.all([
    getBusinessSettings(),
    getExchangeRates(),
    getMyOperatorContact(),
  ]);

  const brand = contact.businessName || "el negocio";
  const pct = Number(settings.commission_percent ?? 10);
  const threshold = Number(settings.commission_threshold ?? 100);
  const flat = Number(settings.commission_flat ?? 5);
  const transfer = Number(settings.transfer_bonus_pct ?? 10);
  const perUsd = Number(settings.points_per_usd ?? 0.2);
  const currencies = rates
    .filter((r) => r.active !== false)
    .map((r) => r.currency)
    .join(" · ");

  const bizDigits = contact.phone?.replace(/\D/g, "") || "";
  const bizWa = bizDigits
    ? `https://wa.me/${bizDigits}?text=${encodeURIComponent(
        `Hola${contact.businessName ? ` ${contact.businessName}` : ""}, tengo una duda.`
      )}`
    : null;

  const faqs: Faq[] = [
    {
      q: "¿Cómo pago mi envío?",
      a: `Después de hacer el pedido, en su detalle verás los datos de cobro de ${brand} (Zelle, CashApp, etc.). Paga por cualquiera de ellos y toca "Ya pagué" para avisar. El negocio confirma y comienza el reparto.`,
    },
    {
      q: "¿Cuánto tarda en llegar?",
      a: "En cada envío verás su estado en vivo (pendiente → en camino → entregado) y el tiempo transcurrido. Los tiempos dependen del negocio y la provincia; si tienes prisa, escríbeles por WhatsApp desde el propio pedido.",
    },
    {
      q: "¿Cómo recibe el dinero mi familia?",
      a: `Puede recibir en ${currencies || "la moneda disponible"}. En CUP hay dos formas: efectivo o transferencia bancaria. La transferencia entrega un ${transfer}% más que el efectivo. Eliges la forma al hacer el pedido.`,
    },
    {
      q: "¿Qué comisión cobran?",
      a: `Envíos de $${threshold} o más: ${pct}% por cada $${threshold} completos. Envíos menores: $${flat} fijo. La comisión ya viene descontada en el monto que ves que recibe tu familia — sin sorpresas.`,
    },
    {
      q: "¿Cómo gano y uso puntos?",
      a: `Ganas ${Math.round(perUsd * 100) / 100} puntos por cada USD enviado (se acreditan al entregarse). Cuando juntas suficientes, los canjeas como descuento en tu próxima remesa desde la pantalla de Puntos.`,
    },
    {
      q: "¿Para qué es el código de entrega?",
      a: "Cuando tu envío está en camino, aparece un código en el detalle del pedido. Dáselo a tu familiar: el repartidor lo pedirá al entregar el dinero, para que solo lo reciba quien debe.",
    },
    {
      q: "¿Y si rechazan mi pedido?",
      a: "Verás el pedido como 'Rechazado' con el motivo (si el negocio lo indicó). No se te cobra nada. Puedes tocar 'Repetir envío' para intentarlo de nuevo corrigiendo lo necesario.",
    },
    {
      q: "¿Es seguro?",
      a: "Tus datos y beneficiarios se guardan en tu cuenta. El pago lo coordinas directo con el negocio por sus medios oficiales. Ante cualquier duda, contáctalos por WhatsApp desde la app.",
    },
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/c/perfil"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Perfil
      </Link>

      <PageHeader
        title="Centro de ayuda"
        subtitle="Todo lo que necesitas saber de tus envíos"
        icon={HelpCircle}
      />

      {/* Contacto rápido */}
      {bizWa && (
        <a
          href={bizWa}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-income/25 bg-income/5 p-4 transition active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-income/10 text-income">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">
              ¿No encuentras tu respuesta?
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Escríbele a {brand} por WhatsApp
            </p>
          </div>
        </a>
      )}

      {/* Tarifas y datos clave */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tarifas y datos
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <KeyFact
            icon={Percent}
            label="Comisión"
            value={`${pct}% · desde $${threshold}`}
          />
          <KeyFact
            icon={Banknote}
            label="Transferencia CUP"
            value={`+${transfer}% vs efectivo`}
          />
          <KeyFact
            icon={Star}
            label="Puntos"
            value={`${Math.round(perUsd * 100) / 100} por USD`}
          />
          <KeyFact
            icon={Clock}
            label="Monedas"
            value={currencies || "—"}
          />
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Preguntas frecuentes
        </h2>
        <FaqAccordion items={faqs} />
      </section>
    </div>
  );
}

function KeyFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Percent;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-start gap-2.5 p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground">{value}</p>
      </div>
    </Card>
  );
}
