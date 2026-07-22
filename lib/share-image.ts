// Convierte un nodo del DOM en PNG y lo comparte como foto. Funciona en el APK
// (plugins nativos de Capacitor) y en la web (Web Share con archivos). Si no se
// puede compartir el archivo, devuelve el dataUrl para mostrarlo como respaldo
// (descargar / mantener presionado para guardar).
export async function shareNodeAsImage(
  node: HTMLElement,
  opts: { title: string; text?: string; fileName: string }
): Promise<{ status: "shared" | "fallback"; dataUrl?: string }> {
  const { toPng } = await import("html-to-image");
  const o = { pixelRatio: 2, cacheBust: true, skipFonts: true };
  // El primer render suele fallar por estilos/fuentes: se hace un calentamiento.
  await toPng(node, o).catch(() => {});
  const dataUrl = await toPng(node, o);

  // === APK (nativo): escribir el PNG y compartir con el plugin nativo ===
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const { Share } = await import("@capacitor/share");
      const base64 = dataUrl.split(",")[1];
      const written = await Filesystem.writeFile({
        path: opts.fileName,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({
        title: opts.title,
        ...(opts.text ? { text: opts.text } : {}),
        files: [written.uri],
      });
      return { status: "shared" };
    } catch {
      return { status: "fallback", dataUrl };
    }
  }

  // === Web: compartir el archivo si el navegador lo permite ===
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], opts.fileName, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: opts.title,
        ...(opts.text ? { text: opts.text } : {}),
      });
      return { status: "shared" };
    }
  } catch {
    /* cae al respaldo visible */
  }

  return { status: "fallback", dataUrl };
}
