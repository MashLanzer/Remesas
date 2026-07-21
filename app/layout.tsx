import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Remesas",
  description: "Gestión de envíos, comisiones y cuentas del negocio de remesas.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1310" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
  return (
    <html lang="es" suppressHydrationWarning className={jakarta.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
