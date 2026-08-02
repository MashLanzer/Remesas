"use client";

import { useEffect } from "react";

// Bloquea el scroll del documento (html/body) mientras el usuario está en la
// zona del cliente. El scroll lo hace el <main> acotado; así el documento nunca
// se compone como una capa gigante ni permite overscroll que revele contenido
// "fantasma" duplicado en el WebView de Android. Se restaura al salir del área
// de cliente (p. ej. al ir al panel del negocio).
export function BodyScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlHeight: html.style.height,
      bodyHeight: body.style.height,
      overscroll: body.style.overscrollBehavior,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.height = "100%";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.height = prev.htmlHeight;
      body.style.height = prev.bodyHeight;
      body.style.overscrollBehavior = prev.overscroll;
    };
  }, []);
  return null;
}
