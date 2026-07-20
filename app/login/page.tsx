"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send } from "lucide-react";

// Esquema de deep link para volver a la app (APK) tras el login.
const NATIVE_REDIRECT = "com.remesas.app://auth/callback";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // En el APK, escucha el "deep link" de vuelta desde la pestaña de Google
  // y completa la sesión.
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("appUrlOpen", async ({ url }) => {
        try {
          const parsed = new URL(url);
          const code = parsed.searchParams.get("code");
          const { Browser } = await import("@capacitor/browser");
          await Browser.close().catch(() => {});
          if (!code) return;

          const supabase = createClient();
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setError(error.message);
            setLoading(false);
            return;
          }
          // Sesión lista: recarga a la app.
          window.location.href = "/";
        } catch (e) {
          setError(e instanceof Error ? e.message : "Error de login");
          setLoading(false);
        }
      });
      cleanup = () => {
        handle.remove();
      };
    })();

    return () => cleanup?.();
  }, []);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);

    const { Capacitor } = await import("@capacitor/core");
    const supabase = createClient();

    // === APK (nativo): abre la pestaña segura de Google y vuelve por deep link ===
    if (Capacitor.isNativePlatform()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: NATIVE_REDIRECT,
          skipBrowserRedirect: true,
        },
      });
      if (error || !data?.url) {
        setError(error?.message ?? "No se pudo iniciar el login");
        setLoading(false);
        return;
      }
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: data.url, presentationStyle: "popover" });
      // El resto lo maneja el listener de appUrlOpen (arriba).
      return;
    }

    // === Web: redirección normal ===
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <Send className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Remesas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestión de envíos, comisiones y cuentas del negocio.
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <GoogleIcon />
          {loading ? "Conectando…" : "Entrar con Google"}
        </button>

        {error && (
          <p className="mt-4 text-center text-sm text-red-600">{error}</p>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Acceso solo para socios del negocio.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
