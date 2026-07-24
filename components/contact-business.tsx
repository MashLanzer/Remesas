import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ContactBusiness({
  phone,
  businessName,
  label = "Contactar al negocio",
  message,
  tone = "solid",
  className,
}: {
  phone?: string | null;
  businessName?: string | null;
  label?: string;
  message?: string;
  tone?: "solid" | "soft";
  className?: string;
}) {
  const digits = phone?.replace(/\D/g, "");
  if (!digits) return null;
  const text =
    message ||
    `Hola${businessName ? ` ${businessName}` : ""}, tengo una consulta sobre mi envío.`;
  return (
    <a
      href={`https://wa.me/${digits}?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition active:scale-[0.98]",
        tone === "solid"
          ? "bg-income text-white"
          : "border border-income/30 bg-income/10 text-income",
        className
      )}
    >
      <MessageCircle className="h-4 w-4" /> {label}
    </a>
  );
}
