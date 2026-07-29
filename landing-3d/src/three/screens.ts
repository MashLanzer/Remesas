import * as THREE from "three";

// Genera texturas de "pantalla de app" dibujadas en canvas — así el teléfono
// muestra UIs realistas SIN depender de imágenes externas. Cuando tengas
// capturas reales, cámbialas por new THREE.TextureLoader().load("/scr1.png").

const W = 512;
const H = 1024;

function base(ctx: CanvasRenderingContext2D, from: string, to: string) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
function rrect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.fill();
}
function text(
  ctx: CanvasRenderingContext2D,
  t: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = "700"
) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillText(t, x, y);
}

type Draw = (ctx: CanvasRenderingContext2D) => void;

// 5 pantallas que evocan las de la app real (hero, pedidos, tienda, puntos, cta).
const DRAWERS: Draw[] = [
  // 0 — Inicio (saludo + tasa)
  (ctx) => {
    base(ctx, "#0a1310", "#0a1310");
    rrect(ctx, 28, 60, W - 56, 260, 36, "#12b866");
    text(ctx, "Hola 👋", 60, 150, 46, "#ffffff");
    text(ctx, "Tasa de hoy · 1 USD", 60, 210, 26, "rgba(255,255,255,.8)", "600");
    text(ctx, "440 CUP", 60, 275, 60, "#ffffff", "800");
    rrect(ctx, 28, 360, W - 56, 90, 24, "#111d18");
    text(ctx, "Enviar una remesa", 60, 415, 30, "#2fe08a");
    rrect(ctx, 28, 480, W - 56, 120, 24, "#111d18");
    rrect(ctx, 28, 620, W - 56, 120, 24, "#111d18");
    rrect(ctx, 28, 760, W - 56, 120, 24, "#111d18");
  },
  // 1 — Mis pedidos (seguimiento)
  (ctx) => {
    base(ctx, "#0a1310", "#0a1310");
    text(ctx, "Mis pedidos", 40, 90, 44, "#e9f5ef", "800");
    for (let i = 0; i < 4; i++) {
      const y = 150 + i * 190;
      rrect(ctx, 28, y, W - 56, 160, 24, "#111d18");
      rrect(ctx, 52, y + 40, 80, 80, 40, "rgba(18,184,102,.2)");
      text(ctx, "En reparto", 160, y + 70, 28, "#e9f5ef", "700");
      text(ctx, "$50 · La Habana", 160, y + 110, 24, "#8aa89b", "600");
    }
  },
  // 2 — Tienda (paquetes)
  (ctx) => {
    base(ctx, "#0a1310", "#0a1310");
    text(ctx, "Paquetes", 40, 90, 44, "#e9f5ef", "800");
    const cols = [40, W / 2 + 8];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 2; c++) {
        const x = cols[c];
        const y = 150 + r * 270;
        rrect(ctx, x, y, W / 2 - 48, 240, 24, "#111d18");
        rrect(ctx, x + 24, y + 24, 90, 90, 24, "rgba(47,224,138,.2)");
        text(ctx, "Combo", x + 24, y + 160, 28, "#e9f5ef", "700");
        text(ctx, "$100", x + 24, y + 200, 30, "#2fe08a", "800");
      }
  },
  // 3 — Puntos (feature clave)
  (ctx) => {
    base(ctx, "#0c6b3f", "#0a1310");
    rrect(ctx, 28, 60, W - 56, 300, 36, "rgba(18,184,102,.25)");
    text(ctx, "Tus puntos", 60, 150, 34, "rgba(255,255,255,.85)", "700");
    text(ctx, "1,250", 60, 260, 96, "#ffffff", "800");
    text(ctx, "Canjea por descuentos", 60, 320, 26, "rgba(255,255,255,.8)", "600");
    for (let i = 0; i < 3; i++) {
      const y = 420 + i * 150;
      rrect(ctx, 28, y, W - 56, 120, 24, "#111d18");
    }
  },
  // 4 — CTA final
  (ctx) => {
    base(ctx, "#12b866", "#0c6b3f");
    text(ctx, "Envía a Cuba", 60, 430, 56, "#ffffff", "800");
    text(ctx, "en un toque", 60, 500, 56, "rgba(255,255,255,.85)", "800");
    rrect(ctx, 60, 580, W - 120, 96, 28, "#ffffff");
    text(ctx, "Empezar", 200, 640, 34, "#0c6b3f", "800");
  },
];

export function makeScreenTextures(): THREE.CanvasTexture[] {
  return DRAWERS.map((draw) => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    draw(ctx);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    // Color correcto en three r152+.
    (tex as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}
