"use client";

import { Banknote, DollarSign, Coins } from "lucide-react";
import { PaperPlane } from "@/components/paper-plane";

const money = [
  { Icon: Banknote, left: "12%", delay: "0.2s", dur: "3.4s", size: 26, r: "-12deg" },
  { Icon: DollarSign, left: "24%", delay: "1.1s", dur: "4.1s", size: 20, r: "8deg" },
  { Icon: Coins, left: "38%", delay: "0.6s", dur: "3.8s", size: 24, r: "-6deg" },
  { Icon: DollarSign, left: "56%", delay: "1.6s", dur: "3.2s", size: 18, r: "10deg" },
  { Icon: Banknote, left: "68%", delay: "0.9s", dur: "4.4s", size: 28, r: "6deg" },
  { Icon: Coins, left: "82%", delay: "1.9s", dur: "3.6s", size: 22, r: "-10deg" },
  { Icon: DollarSign, left: "90%", delay: "0.4s", dur: "4.0s", size: 18, r: "4deg" },
];

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="hero-gradient fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 text-white">
      {/* Dinero flotando */}
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
        <div className="gi-plane-in mb-6">
          <div className="gi-bob flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/15 backdrop-blur-sm ring-1 ring-white/25">
            <PaperPlane className="h-12 w-12 -translate-x-0.5 text-white" />
          </div>
        </div>

        <h1 className="gi-fade-in text-5xl font-extrabold tracking-tight" style={{ animationDelay: "0.5s" }}>
          Giro
        </h1>
        <p className="gi-fade-in mt-2 max-w-xs text-sm text-white/80" style={{ animationDelay: "0.75s" }}>
          Tus envíos a Cuba, siempre a mano
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onStart}
        className="gi-fade-in absolute bottom-14 flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-emerald-700 shadow-xl transition active:scale-95"
        style={{ animationDelay: "1.1s" }}
      >
        Comenzar
      </button>
    </div>
  );
}
