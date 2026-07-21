"use client";

import { Banknote, DollarSign, Coins } from "lucide-react";
import { PaperPlane } from "@/components/paper-plane";

// Partículas de la estela: siguen al avión con un pequeño retraso y se disuelven.
const dots = [
  { delay: "0.05s", size: 8, opacity: 0.5 },
  { delay: "0.09s", size: 7, opacity: 0.38 },
  { delay: "0.13s", size: 6, opacity: 0.28 },
  { delay: "0.17s", size: 5, opacity: 0.18 },
  { delay: "0.21s", size: 4, opacity: 0.1 },
];

// Empiezan a flotar después de que el avión aterriza (~2.8s).
const money = [
  { Icon: Banknote, left: "12%", delay: "3.0s", dur: "3.6s", size: 26, r: "-12deg" },
  { Icon: DollarSign, left: "24%", delay: "3.9s", dur: "4.2s", size: 20, r: "8deg" },
  { Icon: Coins, left: "38%", delay: "3.4s", dur: "3.9s", size: 24, r: "-6deg" },
  { Icon: DollarSign, left: "56%", delay: "4.4s", dur: "3.4s", size: 18, r: "10deg" },
  { Icon: Banknote, left: "68%", delay: "3.7s", dur: "4.5s", size: 28, r: "6deg" },
  { Icon: Coins, left: "82%", delay: "4.7s", dur: "3.7s", size: 22, r: "-10deg" },
  { Icon: DollarSign, left: "90%", delay: "3.2s", dur: "4.1s", size: 18, r: "4deg" },
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
        <div className="gi-stage">
          {/* Estela: partículas que se disuelven */}
          <div className="gi-trailgroup">
            {dots.map((d, i) => (
              <span
                key={i}
                className="gi-dot"
                style={{
                  width: d.size,
                  height: d.size,
                  opacity: d.opacity,
                  animationDelay: d.delay,
                }}
              />
            ))}
          </div>

          {/* Avión volando (sigue la trayectoria y se funde con el cuadro) */}
          <span className="gi-fly">
            <PaperPlane className="h-12 w-12 text-white drop-shadow" />
          </span>

          {/* Cuadro final centrado */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="gi-box flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/15 backdrop-blur-sm ring-1 ring-white/25"
              style={{ viewTransitionName: "giro-plane" } as React.CSSProperties}
            >
              <div className="gi-bob">
                <div className="gi-rest" style={{ transform: "rotate(-22deg)" }}>
                  <PaperPlane className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <h1
          className="gi-fade-in -mt-6 text-5xl font-extrabold tracking-tight"
          style={{ animationDelay: "3.2s" }}
        >
          Giro
        </h1>
        <p
          className="gi-fade-in mt-2 max-w-xs text-sm text-white/80"
          style={{ animationDelay: "3.4s" }}
        >
          Tus envíos a Cuba, siempre a mano
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onStart}
        className="gi-fade-in absolute bottom-14 flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-emerald-700 shadow-xl transition active:scale-95"
        style={{ animationDelay: "3.8s" }}
      >
        Comenzar
      </button>
    </div>
  );
}
