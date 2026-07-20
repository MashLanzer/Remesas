import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Escanea un texto en busca de caracteres fuera del rango Latin1 (0-255),
// que son los que rompen la serialización de cabeceras HTTP (Set-Cookie).
function scanBadChars(label: string, text: string) {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 255) {
      console.error(
        `[callback][BAD] ${label} idx=${i} code=${code} ctx="${text.slice(
          Math.max(0, i - 12),
          i + 12
        )}"`
      );
      return true;
    }
  }
  return false;
}

// Intercambia el "code" de OAuth por una sesión y redirige a la app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=nocode`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[callback] exchange error:", error.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  // DIAGNÓSTICO: revisa las cookies que se van a escribir, para encontrar
  // el carácter fuera de rango que rompe la cabecera Set-Cookie.
  try {
    const jar = await cookies();
    for (const c of jar.getAll()) {
      scanBadChars(`name:${c.name}`, c.name);
      scanBadChars(`value:${c.name}`, c.value ?? "");
    }
  } catch (e) {
    console.error("[callback] diag error", e);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
