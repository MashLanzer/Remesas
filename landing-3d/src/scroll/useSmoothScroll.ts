import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scroll } from "./store";

gsap.registerPlugin(ScrollTrigger);

// Divide un texto en palabras envueltas en <span> (sustituto ligero de SplitText,
// que es plugin de pago). Cada palabra se puede animar por separado.
function splitWords(el: HTMLElement) {
  if (el.dataset.split) return; // no dividir dos veces
  const words = (el.textContent || "").split(/(\s+)/);
  el.textContent = "";
  for (const w of words) {
    if (w.trim() === "") {
      el.appendChild(document.createTextNode(w));
      continue;
    }
    const span = document.createElement("span");
    span.textContent = w;
    span.style.display = "inline-block";
    span.style.willChange = "transform, opacity";
    el.appendChild(span);
  }
  el.dataset.split = "1";
}

// Configura Lenis (scroll suave) + integra con GSAP ScrollTrigger, escribe el
// progreso global y arma los reveals de texto. Devuelve un cleanup.
export function useSmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const lenis = new Lenis({
      smoothWheel: !reduce,
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });

    // Lenis conduce a ScrollTrigger, y el ticker de GSAP conduce a Lenis.
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      // Progreso global 0→1 ligado 100% al scroll (scrub).
      ScrollTrigger.create({
        trigger: "#page",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          scroll.progress = self.progress;
        },
      });

      // Reveals: título del hero con stagger de palabras.
      const hero = document.querySelector<HTMLElement>("[data-hero-title]");
      if (hero && !reduce) {
        splitWords(hero);
        gsap.from(hero.querySelectorAll("span"), {
          yPercent: 120,
          opacity: 0,
          rotateX: -40,
          duration: 1,
          ease: "power4.out",
          stagger: 0.06,
          delay: 0.15,
        });
      }

      // Reveals genéricos por sección al entrar en viewport.
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 82%",
            toggleActions: "play none none reverse",
          },
        });
      });
    });

    // Parallax con el ratón (se lee en la escena 3D).
    const onPointer = (e: PointerEvent) => {
      scroll.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      scroll.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer);

    return () => {
      window.removeEventListener("pointermove", onPointer);
      gsap.ticker.remove(raf);
      ctx.revert();
      lenis.destroy();
    };
  }, []);
}
