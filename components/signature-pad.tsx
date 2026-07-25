"use client";

import { useEffect, useRef, useState } from "react";
import { PenLine, Eraser } from "lucide-react";

// Bloc de firma: dibuja con el dedo/ratón y guarda la firma como data URL en un
// input oculto (name) para enviarla con el formulario de entrega.
export function SignaturePad({ name }: { name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const [has, setHas] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Escala para nitidez en pantallas densas.
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0f172a";
    }
  }, []);

  function pos(e: React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function down(e: React.PointerEvent) {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    setHas(true);
    if (hiddenRef.current)
      hiddenRef.current.value = canvasRef.current!.toDataURL("image/png");
  }

  function clear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHas(false);
    if (hiddenRef.current) hiddenRef.current.value = "";
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <PenLine className="h-3.5 w-3.5" /> Firma de quien recibe (opcional)
        </label>
        {has && (
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition active:scale-95"
          >
            <Eraser className="h-3.5 w-3.5" /> Borrar
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        className="h-32 w-full touch-none rounded-xl border border-dashed border-border bg-card"
      />
      <input ref={hiddenRef} type="hidden" name={name} />
    </div>
  );
}
