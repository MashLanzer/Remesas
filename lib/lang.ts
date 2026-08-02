import { cookies } from "next/headers";
import { LANG_COOKIE, normalizeLang, type Lang } from "@/lib/i18n";

// Idioma actual leído de la cookie (servidor). Por defecto español.
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return normalizeLang(store.get(LANG_COOKIE)?.value);
}
