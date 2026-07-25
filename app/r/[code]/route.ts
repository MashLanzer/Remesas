import { NextResponse } from "next/server";

// Link de invitación: guarda el código del referidor en una cookie y manda al
// inicio. Tras entrar como cliente, la sesión aplica el referido.
export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  const code = (params.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const res = NextResponse.redirect(new URL("/", req.url));
  if (code) {
    res.cookies.set("giro_ref", code, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
  }
  return res;
}
