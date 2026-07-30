// Estado de scroll compartido entre GSAP (que lo escribe con ScrollTrigger) y la
// escena 3D (que lo lee en cada frame). Es un singleton mutable a propósito:
// así el 3D no re-renderiza React en cada scroll — solo lee un número.
export const scroll = {
  progress: 0, // 0 → 1 en todo el recorrido de la página
  pointerX: 0, // ratón normalizado -1..1 (parallax)
  pointerY: 0,
};

// Cantidad de secciones/pantallas (define la altura total y los tramos).
export const SECTIONS = 5;

// ---- Keyframes cinematográficos por tramo de scroll --------------------------
// Cada keyframe define dónde está la cámara y cómo se ve el teléfono en un punto
// del scroll (p = 0..1). Entre keyframes se interpola suavemente.
export type Keyframe = {
  p: number; // posición en el scroll (0..1)
  cam: [number, number, number]; // posición de cámara
  phonePos: [number, number, number];
  phoneRot: [number, number, number]; // radianes
  screen: number; // índice de pantalla que muestra el teléfono
  light: number; // intensidad de las luces dinámicas
};

const D = Math.PI / 180;

export const KEYFRAMES: Keyframe[] = [
  // 1) Hero — desplazado a la derecha para no tapar el texto de la izquierda.
  { p: 0.0, cam: [0, 0, 6.2], phonePos: [1.9, -0.05, 0], phoneRot: [8 * D, -20 * D, 2 * D], screen: 0, light: 1.0 },
  // 2) Texto a la derecha → teléfono a la izquierda. Cámara se acerca.
  { p: 0.24, cam: [0, 0.05, 5.4], phonePos: [-1.8, 0, 0], phoneRot: [4 * D, 24 * D, -3 * D], screen: 1, light: 1.2 },
  // 3) Texto a la izquierda → teléfono a la derecha, girado de lado.
  { p: 0.48, cam: [0, 0.1, 5.0], phonePos: [1.7, 0.05, 0.2], phoneRot: [6 * D, -46 * D, 4 * D], screen: 2, light: 1.5 },
  // 4) Sección centrada: zoom cercano de frente, teléfono detrás del texto.
  { p: 0.72, cam: [0, 0, 4.2], phonePos: [0, 0.05, 0.2], phoneRot: [2 * D, 10 * D, -1 * D], screen: 3, light: 2.1 },
  // 5) Final: teléfono a la derecha para dejar el CTA centrado sobre fondo limpio.
  { p: 1.0, cam: [0, 0, 6.0], phonePos: [2.5, 0.1, 0], phoneRot: [6 * D, -16 * D, 0], screen: 4, light: 1.25 },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Muestrea los keyframes en el progreso p y devuelve un estado interpolado.
export function sample(p: number) {
  const ks = KEYFRAMES;
  let i = 0;
  while (i < ks.length - 1 && p > ks[i + 1].p) i++;
  const a = ks[i];
  const b = ks[Math.min(i + 1, ks.length - 1)];
  const span = b.p - a.p || 1;
  const t = Math.min(Math.max((p - a.p) / span, 0), 1);
  // easing suave (easeInOutSine) entre keyframes para look cinematográfico.
  const e = -(Math.cos(Math.PI * t) - 1) / 2;

  const mix3 = (x: [number, number, number], y: [number, number, number]) =>
    [lerp(x[0], y[0], e), lerp(x[1], y[1], e), lerp(x[2], y[2], e)] as [
      number,
      number,
      number,
    ];

  return {
    cam: mix3(a.cam, b.cam),
    phonePos: mix3(a.phonePos, b.phonePos),
    phoneRot: mix3(a.phoneRot, b.phoneRot),
    light: lerp(a.light, b.light, e),
    // pantalla: la del keyframe más cercano (cambio discreto).
    screen: e < 0.5 ? a.screen : b.screen,
  };
}
