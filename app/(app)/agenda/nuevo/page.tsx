import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";

export const dynamic = "force-dynamic";

export default function NuevoContactoPage() {
  return (
    <div>
      <Link
        href="/agenda"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Agenda
      </Link>
      <PageHeader
        title="Nuevo contacto"
        subtitle="Crea el cliente y, si quieres, su beneficiario en Cuba"
      />
      <ContactForm />
    </div>
  );
}
