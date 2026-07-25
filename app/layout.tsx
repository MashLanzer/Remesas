import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { AppDialogProvider } from "@/components/confirm";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Giro",
  description: "Tus envíos a Cuba, siempre a mano.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1310" },
  ],
  width: "device-width",
  initialScale: 1,
  // Se permite el zoom (accesibilidad): no bloqueamos el pellizco para acercar.
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

// Aplica el tema guardado antes de pintar (por defecto: oscuro, estilo fintech).
// Se lee primero de la cookie (persiste mejor en el WebView del APK) y luego
// de localStorage como respaldo.
const themeScript = `
  try {
    var m = document.cookie.match(/(?:^|; )theme=(dark|light)/);
    var t = m ? m[1] : localStorage.getItem('theme');
    var d = t ? t === 'dark' : true;
    document.documentElement.classList.toggle('dark', d);
  } catch (e) { document.documentElement.classList.add('dark'); }
  try {
    var dm = document.cookie.match(/(?:^|; )datamode=(low|normal)/);
    if (dm && dm[1] === 'low') document.documentElement.classList.add('data-saver');
  } catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // El tema se aplica en el servidor leyendo la cookie (persiste como la sesión).
  const store = cookies();
  const theme = store.get("theme")?.value;
  const dark = theme ? theme === "dark" : true;
  const dataSaver = store.get("datamode")?.value === "low";

  const htmlClass = [
    jakarta.variable,
    dark ? "dark" : "",
    dataSaver ? "data-saver" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <html lang="es" suppressHydrationWarning className={htmlClass}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppDialogProvider>{children}</AppDialogProvider>
      </body>
    </html>
  );
}
