"use client";

import { useEffect, useState } from "react";
import { Rocket, Truck, Star, type LucideIcon } from "lucide-react";
import { PaperPlane } from "@/components/paper-plane";
import { cn } from "@/lib/utils";
import { useT } from "@/components/lang-provider";

const KEY = "giro_c_welcomed";

const SLIDES: {
  Icon: LucideIcon;
  anim: string;
  title: string;
  desc: string;
}[] = [
  {
    Icon: Rocket,
    anim: "giroRocket 1.6s ease-in-out infinite",
    title: "Envía dinero a Cuba",
    desc: "Elige el monto y quién recibe. Rápido, seguro y sin complicaciones.",
  },
  {
    Icon: Truck,
    anim: "giroTruck 1.4s ease-in-out infinite",
    title: "Sigue cada paso",
    desc: "Verás tu envío avanzar en vivo, desde que lo pides hasta tu familia.",
  },
  {
    Icon: Star,
    anim: "giroStar 1.8s ease-in-out infinite",
    title: "Gana puntos",
    desc: "Con cada remesa entregada acumulas puntos para descuentos.",
  },
];

export function ClienteOnboarding() {
  const t = useT();
  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* nada */
    }
  }, []);

  function finish() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* nada */
    }
    setShow(false);
  }

  if (!show) return null;
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 text-white">
      <div className="safe-top flex justify-end p-4">
        <button
          type="button"
          onClick={finish}
          className="text-sm font-semibold text-white/70 transition active:scale-95"
        >
          {t("Saltar")}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="mb-2 flex items-center gap-2">
          <PaperPlane className="h-6 w-6 -translate-x-px text-white drop-shadow" />
          <span className="text-lg font-extrabold tracking-tight">Giro</span>
        </div>
        <div key={i} className="animate-fade-up">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">
            <slide.Icon
              className="h-9 w-9"
              style={{ animation: slide.anim }}
            />
          </span>
          <h2 className="mt-6 text-2xl font-extrabold">{t(slide.title)}</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-white/85">
            {t(slide.desc)}
          </p>
        </div>

        <style>{`
          @keyframes giroRocket {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-12px) rotate(-6deg); }
          }
          @keyframes giroTruck {
            0%, 100% { transform: translateX(-5px); }
            25% { transform: translateX(0) translateY(-2px); }
            50% { transform: translateX(5px); }
            75% { transform: translateX(0) translateY(-2px); }
          }
          @keyframes giroStar {
            0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
            50% { transform: scale(1.2) rotate(18deg); opacity: 0.85; }
          }
        `}</style>
      </div>

      <div
        className="px-8 pt-2"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)",
        }}
      >
        <div className="mb-5 flex justify-center gap-1.5">
          {SLIDES.map((_, idx) => (
            <span
              key={idx}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === i ? "w-6 bg-white" : "w-1.5 bg-white/40"
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (last ? finish() : setI((v) => v + 1))}
          className="w-full rounded-2xl bg-white py-3.5 text-base font-bold text-emerald-700 shadow-lg shadow-black/10 transition active:scale-[0.98]"
        >
          {last ? t("Empezar") : t("Siguiente")}
        </button>
      </div>
    </div>
  );
}
