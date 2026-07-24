"use client";

import { useEffect, useState } from "react";
import { Send, Truck, Star } from "lucide-react";
import { PaperPlane } from "@/components/paper-plane";
import { cn } from "@/lib/utils";

const KEY = "giro_c_welcomed";

const SLIDES = [
  {
    icon: <Send className="h-8 w-8" />,
    title: "Envía dinero a Cuba",
    desc: "Elige el monto y quién recibe. Rápido, seguro y sin complicaciones.",
  },
  {
    icon: <Truck className="h-8 w-8" />,
    title: "Sigue cada paso",
    desc: "Verás tu envío avanzar en vivo, desde que lo pides hasta tu familia.",
  },
  {
    icon: <Star className="h-8 w-8" />,
    title: "Gana puntos",
    desc: "Con cada remesa entregada acumulas puntos para descuentos.",
  },
];

export function ClienteOnboarding() {
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
          Saltar
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="mb-2 flex items-center gap-2">
          <PaperPlane className="h-6 w-6 -translate-x-px text-white drop-shadow" />
          <span className="text-lg font-extrabold tracking-tight">Giro</span>
        </div>
        <div className="animate-fade-up">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">
            {slide.icon}
          </span>
          <h2 className="mt-6 text-2xl font-extrabold">{slide.title}</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-white/85">
            {slide.desc}
          </p>
        </div>
      </div>

      <div className="safe-bottom px-8 pb-10">
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
          {last ? "Empezar" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}
