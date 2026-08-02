"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/lang-provider";

// Saludo por la hora local del usuario. Renderiza un saludo neutro en el
// servidor y lo ajusta tras montar para evitar desajustes de hidratación.
export function ClienteGreeting({ firstName }: { firstName?: string | null }) {
  const t = useT();
  const [greet, setGreet] = useState("Hola");

  useEffect(() => {
    const h = new Date().getHours();
    setGreet(
      h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"
    );
  }, []);

  return (
    <div>
      <p className="text-sm font-medium text-white/85">
        {t(greet)}
        {firstName ? (
          <>
            , <span className="font-bold text-white">{firstName}</span>
          </>
        ) : null}{" "}
        👋
      </p>
      <p className="text-xs text-white/70">{t("¿A quién le envías hoy?")}</p>
    </div>
  );
}
