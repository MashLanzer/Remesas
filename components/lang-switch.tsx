"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useLang } from "@/components/lang-provider";
import { setLangCookie } from "@/app/actions";
import type { Lang } from "@/lib/i18n";

// Interruptor de idioma (ES/EN) para la experiencia del cliente. Fija la cookie
// por Set-Cookie (fiable en el WebView del APK) y refresca para re-renderizar
// servidor + cliente en el nuevo idioma.
export function LangSwitch() {
  const lang = useLang();
  const router = useRouter();

  function choose(next: Lang) {
    if (next === lang) return;
    try {
      document.cookie = `giro_lang=${next}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
    setLangCookie(next);
    router.refresh();
  }

  const label = lang === "en" ? "Language" : "Idioma";

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
          <Languages className="h-5 w-5" />
        </span>
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
      <div className="flex overflow-hidden rounded-full border border-border">
        {(["es", "en"] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => choose(l)}
            className={
              "px-3 py-1.5 text-xs font-bold transition " +
              (lang === l
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground")
            }
          >
            {l === "es" ? "ES" : "EN"}
          </button>
        ))}
      </div>
    </div>
  );
}
