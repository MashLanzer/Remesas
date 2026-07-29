import { useEffect, useState } from "react";
import { Experience } from "./three/Experience";
import { Overlay } from "./ui/Overlay";
import { useSmoothScroll } from "./scroll/useSmoothScroll";

// Detecta la "calidad" del dispositivo para no ahogar móviles de gama baja.
function detectQuality(): "high" | "low" {
  if (typeof window === "undefined") return "high";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 820;
  const fewCores =
    typeof navigator !== "undefined" &&
    (navigator.hardwareConcurrency ?? 8) <= 4;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return coarse || small || fewCores || reduce ? "low" : "high";
}

export default function App() {
  useSmoothScroll();
  const [quality, setQuality] = useState<"high" | "low">("high");

  useEffect(() => {
    setQuality(detectQuality());
  }, []);

  return (
    <>
      {/* 3D fijo detrás de todo */}
      <Experience quality={quality} />
      {/* Contenido que scrollea por encima */}
      <Overlay />
    </>
  );
}
