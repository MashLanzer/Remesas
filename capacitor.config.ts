import type { CapacitorConfig } from "@capacitor/cli";

// La app web corre con SSR en Vercel (auth, server components), así que el APK
// funciona como un contenedor que carga el sitio desplegado.
// 1) Despliega en Vercel.
// 2) Pon tu URL de producción en CAP_SERVER_URL (o edítala aquí abajo).
const serverUrl = process.env.CAP_SERVER_URL || "https://remesas.vercel.app";

const config: CapacitorConfig = {
  appId: "com.remesas.app",
  appName: "Remesas",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: false,
  },
  android: {
    backgroundColor: "#f8fafc",
  },
};

export default config;
