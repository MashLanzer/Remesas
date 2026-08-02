"use client";

import { createContext, useContext } from "react";
import { translate, type Lang } from "@/lib/i18n";

const LangCtx = createContext<Lang>("es");

// Provee el idioma actual (lo pasa el servidor desde la cookie) a los
// componentes cliente del área de cliente.
export function LangProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return <LangCtx.Provider value={lang}>{children}</LangCtx.Provider>;
}

export function useLang(): Lang {
  return useContext(LangCtx);
}

// Hook de traducción: t("texto en español") -> inglés si aplica, si no español.
export function useT(): (es: string) => string {
  const lang = useContext(LangCtx);
  return (es: string) => translate(lang, es);
}
