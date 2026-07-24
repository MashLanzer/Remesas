"use client";

import { useEffect, useState } from "react";

const COLORS = [
  "#10b981",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#60a5fa",
  "#f87171",
];

// Pequeña celebración (una sola vez por pedido) al entregarse.
export function ConfettiBurst({ id }: { id: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const key = `giro_celebrated_${id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* nada */
    }
    setShow(true);
    const t = setTimeout(() => setShow(false), 2600);
    return () => clearTimeout(t);
  }, [id]);

  if (!show) return null;

  const pieces = Array.from({ length: 24 });
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {pieces.map((_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 6) * 90;
        const dur = 1800 + (i % 5) * 260;
        const size = 6 + (i % 3) * 3;
        const color = COLORS[i % COLORS.length];
        return (
          <span
            key={i}
            style={{
              left: `${left}%`,
              top: "-16px",
              width: size,
              height: size * 1.6,
              background: color,
              borderRadius: 2,
              animation: `giroConfetti ${dur}ms ${delay}ms cubic-bezier(0.2,0.6,0.4,1) forwards`,
            }}
            className="absolute"
          />
        );
      })}
      <style>{`
        @keyframes giroConfetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
