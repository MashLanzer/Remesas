// i18n ligero para la EXPERIENCIA DEL CLIENTE. El panel del negocio queda en
// español (sus operadores son hispanohablantes).
//
// Diseño: traducción por cadena de origen (español). En modo "es" se devuelve
// el texto tal cual; en modo "en" se busca en el diccionario y, si falta, se
// cae con gracia al español (nunca rompe, solo deja un hueco a completar).
// Así el español sigue siendo la fuente legible dentro del JSX.

export type Lang = "es" | "en";
export const LANGS: Lang[] = ["es", "en"];
export const DEFAULT_LANG: Lang = "es";
export const LANG_COOKIE = "giro_lang";

export function normalizeLang(value: string | null | undefined): Lang {
  return value === "en" ? "en" : "es";
}

// Diccionario español → inglés (solo textos visibles del cliente).
export const EN: Record<string, string> = {
  // ── Navegación / general ──
  Inicio: "Home",
  Tienda: "Store",
  Paquetes: "Packages",
  "Enviar remesa": "Send a transfer",
  "Enviar una remesa": "Send a transfer",
  Pedidos: "Orders",
  "Mis pedidos": "My orders",
  Puntos: "Points",
  Perfil: "Profile",
  Enviar: "Send",
  Guardar: "Save",
  Cancelar: "Cancel",
  Cerrar: "Close",
  "Cerrar sesión": "Sign out",
  Reintentar: "Retry",
  Cargando: "Loading",
  "Cargando…": "Loading…",
  Ayuda: "Help",
  Ajustes: "Settings",
  Hola: "Hi",
  "Buenos días": "Good morning",
  "Buenas tardes": "Good afternoon",
  "Buenas noches": "Good evening",
  "¿A quién le envías hoy?": "Who are you sending to today?",
  "Mi cuenta": "My account",

  // ── Home / hero ──
  "Enviar dinero": "Send money",
  "Tasa de hoy": "Today's rate",
  "Ver todo": "See all",
  "Tu impacto": "Your impact",
  Opiniones: "Reviews",

  // ── Pagos / ciclo ──
  "¿Cómo pagar tu envío?": "How to pay for your transfer?",
  "Por pagar": "To pay",
  "Pago informado": "Payment reported",
  "Pago confirmado": "Payment confirmed",
  "Ya pagué": "I paid",
  "Avisar por WhatsApp": "Notify by WhatsApp",

  // ── Referidos ──
  Premiado: "Rewarded",
  "En camino": "On the way",
  Registrado: "Signed up",
  "Compartir invitación": "Share invite",
  "Copiar enlace": "Copy link",
  Copiado: "Copied",

  // ── Perfil ──
  "Tu perfil": "Your profile",
  "Mi libreta": "My address book",
  "Tus datos para los envíos": "Your details for transfers",
  Nombre: "Name",
  "Teléfono / WhatsApp": "Phone / WhatsApp",
  "Segundo teléfono (opcional)": "Second phone (optional)",
  "Dirección o ciudad (opcional)": "Address or city (optional)",
  "Centro de ayuda": "Help center",
  "Escribir al negocio": "Message the business",
  "Cómo funciona": "How it works",
  Idioma: "Language",
  Español: "Spanish",
  Inglés: "English",

  // ── Favoritos ──
  "Añadir a favoritos": "Add to favorites",
  "Quitar de favoritos": "Remove from favorites",
};

export function translate(lang: Lang, es: string): string {
  if (lang === "es") return es;
  return EN[es] ?? es;
}
