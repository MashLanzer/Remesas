"use client";

import { Banknote, DollarSign, Coins } from "lucide-react";
import { PaperPlane } from "@/components/paper-plane";

const PATH =
  "M 8 224 C 55 178 85 150 120 150 C 180 150 180 52 120 52 C 60 52 60 132 120 132 L 120 120";

// Empiezan a flotar después de que el avión aterriza (~2.6s).
const money = [
  { Icon: Banknote, left: "12%", delay: "2.8s", dur: "3.6s", size: 26, r: "-12deg" },
  { Icon: DollarSign, left: "24%", delay: "3.7s", dur: "4.2s", size: 20, r: "8deg" },
  { Icon: Coins, left: "38%", delay: "3.2s", dur: "3.9s", size: 24, r: "-6deg" },
  { Icon: DollarSign, left: "56%", delay: "4.2s", dur: "3.4s", size: 18, r: "10deg" },
  { Icon: Banknote, left: "68%", delay: "3.5s", dur: "4.5s", size: 28, r: "6deg" },
  { Icon: Coins, left: "82%", delay: "4.5s", dur: "3.7s", size: 22, r: "-10deg" },
  { Icon: DollarSign, left: "90%", delay: "3.0s", dur: "4.1s", size: 18, r: "4deg" },
];

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="hero-gradient fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 text-white">
      {/* Dinero flotando (aparece después del avión) */}
      <div className="pointer-events-none absolute inset-0">
        {money.map((m, i) => {
          const M = m.Icon;
          return (
            <span
              key={i}
              className="gi-money absolute bottom-24 text-white/70"
              style={
                {
                  left: m.left,
                  animationDelay: m.delay,
                  animationDuration: m.dur,
                  "--r": m.r,
                } as React.CSSProperties
              }
            >
              <M style={{ width: m.size, height: m.size }} />
            </span>
          );
        })}
      </div>

      {/* Avión + marca */}
      <div className="relative flex flex-col items-center text-center">
        {/* Escenario del vuelo: estela + avión que aterriza en el cuadro */}
        <div className="gi-stage">
          <svg className="gi-trailsvg" viewBox="0 0 240 240" fill="none">
            <path className="gi-trail" d={PATH} pathLength={100} />
          </svg>

          {/* Avión volando (sigue la trayectoria y luego se desvanece) */}
          <span className="gi-fly">
            <PaperPlane className="h-9 w-9 text-white drop-shadow" />
          </span>

          {/* Cuadro final centrado (donde queda el avión) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="gi-box flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/15 backdrop-blur-sm ring-1 ring-white/25">
              <div className="gi-bob">
                <PaperPlane className="h-12 w-12 -translate-x-0.5 text-white" />
              </div>
            </div>
          </div>
        </div>

        <h1
          className="gi-fade-in -mt-6 text-5xl font-extrabold tracking-tight"
          style={{ animationDelay: "2.9s" }}
        >
          Giro
        </h1>
        <p
          className="gi-fade-in mt-2 max-w-xs text-sm text-white/80"
          style={{ animationDelay: "3.1s" }}
        >
          Tus envíos a Cuba, siempre a mano
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onStart}
        className="gi-fade-in absolute bottom-14 flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-emerald-700 shadow-xl transition active:scale-95"
        style={{ animationDelay: "3.5s" }}
      >
        Comenzar
      </button>
    </div>
  );
}
