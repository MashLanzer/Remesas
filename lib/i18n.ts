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
  "Enviar una remesa": "Send a remittance",
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
  Cambiar: "Change",

  // ── Home / hero / onboarding ──
  "Enviar dinero": "Send money",
  "Envía dinero": "Send money",
  "a Cuba": "to Cuba",
  "Tasa de hoy": "Today's rate",
  actualizada: "updated",
  "Rápido, seguro y con seguimiento en vivo.":
    "Fast, secure and with live tracking.",
  Anuncios: "Announcements",
  "Ver todo": "See all",
  "Ver todos": "See all",
  "Tu impacto": "Your impact",
  "Tu envío para": "Your transfer to",
  "tu familia": "your family",
  "fue entregado": "was delivered",
  "Volver a enviar a": "Send again to",
  "Ya enviaste": "You've already sent",
  "a los tuyos": "to your loved ones",
  envío: "transfer",
  entregado: "delivered",
  "gracias por cuidar a tu familia": "thank you for caring for your family",
  "Paquetes de remesa": "Remittance packages",
  Recibe: "Receives",
  "Entrega en": "Delivered in",
  Beneficiario: "Recipient",
  recibe: "receives",
  "Pide tu remesa": "Request your remittance",
  "Elige el monto y quién recibe en Cuba.":
    "Choose the amount and who receives it in Cuba.",
  "El negocio la acepta": "The business accepts it",
  "Confirma el envío y empieza el reparto.":
    "It confirms the transfer and delivery begins.",
  "Entrega con seguimiento": "Delivery with tracking",
  "Sigues cada paso hasta tu familia.":
    "You follow every step all the way to your family.",
  "hace un momento": "a moment ago",
  hace: "ago",
  día: "day",
  "¿Cerrar sesión?": "Log out?",
  "Sí, salir": "Yes, log out",
  "Mi perfil": "My profile",
  Saltar: "Skip",
  "Sigue cada paso": "Follow every step",
  "Verás tu envío avanzar en vivo, desde que lo pides hasta tu familia.":
    "You'll watch your transfer progress live, from request to your family.",
  "Gana puntos": "Earn points",
  "Con cada remesa entregada acumulas puntos para descuentos.":
    "With each delivered remittance you earn points for discounts.",
  Empezar: "Get started",
  Siguiente: "Next",

  // ── Formulario de envío ──
  "¿Cuánto quieres enviar? (USD)": "How much do you want to send? (USD)",
  "Moneda que recibe tu familia": "Currency your family receives",
  Moneda: "Currency",
  Efectivo: "Cash",
  Transferencia: "Transfer",
  "Tu familia recibe hasta": "Your family receives up to",
  transferencia: "transfer",
  Por: "For",
  "antes de la comisión. El monto final lo confirma el negocio.":
    "before the fee. The final amount is confirmed by the business.",
  "¿Quién recibe en Cuba?": "Who receives in Cuba?",
  "Borrar guardado": "Delete saved",
  "Nombre del beneficiario": "Beneficiary name",
  "Nombre de quien recibe": "Recipient's name",
  Teléfono: "Phone",
  Provincia: "Province",
  "Ej: La Habana": "e.g. Havana",
  "Apodo (opcional)": "Nickname (optional)",
  "Ej: Mamá": "e.g. Mom",
  "Nota (opcional)": "Note (optional)",
  "Algún detalle para el negocio…": "Any detail for the business…",
  "Usar mis puntos": "Use my points",
  Tienes: "You have",
  "puntos (hasta": "points (up to",
  "). El negocio aplica el descuento al aceptar.":
    "). The business applies the discount on acceptance.",
  "Enviar pedido": "Send order",

  // ── Tienda / paquetes / ofertas ──
  "Paquetes para tu familia": "Packages for your family",
  "Elige uno y llega a Cuba en un toque · a la tasa de hoy":
    "Pick one and it reaches Cuba in one tap · at today's rate",
  efectivo: "cash",
  "Sin paquetes por ahora": "No packages yet",
  "Cuando el negocio publique paquetes, aparecerán aquí. Mientras tanto, usa el botón central para enviar una remesa a tu medida.":
    "When the business publishes packages, they'll show up here. In the meantime, use the center button to send a custom remittance.",
  "Ver montos en": "Show amounts in",
  Pagas: "You pay",
  "(fijo)": "(fixed)",
  "Pedir este paquete": "Order this package",
  "Tu familia recibe": "Your family receives",
  "¿Cómo quiere recibir tu familia?": "How does your family want to receive it?",
  "Calculado a la tasa de hoy. El monto final lo confirma el negocio al aceptar.":
    "Calculated at today's rate. The final amount is confirmed by the business when they accept.",
  "Pedir por": "Order for",
  Anuncio: "Announcement",
  "Enviar con esta tasa": "Send at this rate",
  "Enviar sin comisión": "Send with no fee",
  "Pedir entrega express": "Request express delivery",
  "Pedir este combo": "Order this combo",
  "Enviar con esta promo": "Send with this promo",
  "Válido hasta": "Valid until",
  Desde: "From",
  Oferta: "Offer",
  Destacada: "Featured",

  // ── Pedidos (lista + detalle) ──
  "Cancelar pedido": "Cancel order",
  "¿Cancelar este pedido?": "Cancel this order?",
  "Sí, cancelar": "Yes, cancel",
  "Aún no has enviado": "You haven't sent yet",
  "Tu primer envío aparecerá aquí con seguimiento en vivo, paso a paso hasta tu familia.":
    "Your first transfer will appear here with live tracking, step by step all the way to your family.",
  "Pides tu remesa": "You request your transfer",
  "Eliges el monto y quién recibe en Cuba.":
    "You choose the amount and who receives it in Cuba.",
  "Sigues cada paso hasta que llega a tu familia.":
    "Follow every step until it reaches your family.",
  Ganas: "You earn",
  "puntos con cada envío": "points with every transfer",
  "para descuentos en tus próximas remesas.":
    "toward discounts on your next remittances.",
  "Sigue el estado de tus envíos": "Track the status of your transfers",
  "En proceso": "In progress",
  Entregadas: "Delivered",
  Enviado: "Sent",
  "Otros activos": "Other active",
  en: "in",
  Para: "To",
  "Descuento por puntos:": "Points discount:",
  "Pediste usar tus puntos": "You asked to use your points",
  "Ver detalle": "View details",
  "El negocio recibió tu pago de": "The business received your payment of",
  Ganaste: "You earned",
  "con este envío.": "with this transfer.",
  Ganarás: "You'll earn",
  "cuando se entregue.": "when it's delivered.",
  "Código de entrega": "Delivery code",
  "Pásaselo a tu familiar. El repartidor lo pedirá al entregar el dinero.":
    "Give it to your family member. The courier will ask for it when delivering the money.",
  "Cómo recibe": "How they receive",
  Nota: "Note",
  Rechazado: "Rejected",
  "Motivo:": "Reason:",
  "Enviar otra vez": "Send again",
  "Dudas de este envío": "Questions about this transfer",

  // ── Ciclo de pago ──
  "¿Cómo pagar tu envío?": "How to pay for your transfer?",
  "Por pagar": "To pay",
  "Pago informado": "Payment reported",
  "Pago confirmado": "Payment confirmed",
  "Ya pagué": "I paid",
  "Avisar por WhatsApp": "Notify by WhatsApp",
  "ya pagué mi envío": "I paid for my transfer",
  de: "of",
  para: "to",
  "mi familia": "my family",

  // ── Referidos ──
  Premiado: "Rewarded",
  "En camino": "On the way",
  Registrado: "Signed up",
  "Compartir invitación": "Share invite",
  "Copiar enlace": "Copy link",
  Copiado: "Copied",
  "Invita y ganen": "Invite and you both earn",
  "Comparte tu enlace. Cuando tu amigo reciba su primer envío, ambos ganan":
    "Share your link. When your friend receives their first transfer, you both earn",
  "puntos.": "points.",
  "Tu código": "Your code",
  invitado: "invited",
  invitados: "invited",
  premiado: "rewarded",
  premiados: "rewarded",
  "Aún no podemos mostrar el detalle.": "We can't show the details yet.",
  "Te invito a Giro para enviar remesas a Cuba. Regístrate con mi enlace y los dos ganamos":
    "I'm inviting you to Giro to send remittances to Cuba. Sign up with my link and we both earn",
  "puntos:": "points:",
  "Únete a Giro": "Join Giro",
  "Enlace copiado": "Link copied",
  "Invitar a un amigo": "Invite a friend",
  "Cuando tu amigo reciba su primer envío, ganan":
    "When your friend receives their first transfer, you each earn",
  "puntos cada uno.": "points each.",

  // ── Puntos ──
  "Mis puntos": "My points",
  puntos: "points",
  "en descuentos · ganas puntos con cada remesa entregada.":
    "in discounts · you earn points with every delivered transfer.",
  "Cómo usar tus puntos": "How to use your points",
  "Cada punto vale ≈": "Each point is worth ≈",
  "puntos puedes canjearlos por un descuento en la comisión de tu próxima remesa.":
    "points you can redeem them for a discount on the fee of your next transfer.",
  pts: "pts",
  "¡Listo!": "Ready!",
  faltan: "missing",
  '¡Puedes canjear! Marca "Usar mis puntos" al enviar tu próxima remesa.':
    'You can redeem! Check "Use my points" when you send your next transfer.',
  "Sigue enviando para llegar a": "Keep sending to reach",
  "puntos y canjear.": "points and redeem.",
  Historial: "History",
  "Sin movimientos": "No activity",
  "Cuando se entregue tu primera remesa, ganarás puntos aquí.":
    "When your first transfer is delivered, you'll earn points here.",
  "Envío entregado": "Transfer delivered",
  Canje: "Redemption",
  Ajuste: "Adjustment",

  // ── Perfil ──
  "Foto de perfil": "Profile photo",
  "Tu perfil": "Your profile",
  Envíos: "Transfers",
  "Toca para ver tu resumen y descargarlo":
    "Tap to view your summary and download it",
  "Tus datos para los envíos": "Your details for transfers",
  Nombre: "Name",
  "Tu nombre": "Your name",
  "Foto de perfil (opcional)": "Profile photo (optional)",
  "Sube otra para reemplazarla.": "Upload another to replace it.",
  "Se ve en tu perfil, en vez de la inicial.":
    "Shown on your profile instead of the initial.",
  "Teléfono / WhatsApp": "Phone / WhatsApp",
  "El negocio te contactará por aquí.": "The business will contact you here.",
  "Segundo teléfono (opcional)": "Second phone (optional)",
  "Por si no contestan el principal.": "In case the main one isn't answered.",
  "Dirección o ciudad (opcional)": "Address or city (optional)",
  "Ayuda al negocio a ubicarte.": "Helps the business locate you.",
  "Ej: Miami, FL": "e.g. Miami, FL",
  "Mi libreta": "My address book",
  Idioma: "Language",
  Español: "Spanish",
  Inglés: "English",

  // ── Ayuda / contacto ──
  "Escribir al negocio": "Message the business",
  "Dudas o ayuda con": "Questions or help with",
  "Dudas o ayuda con tu envío": "Questions or help with your transfer",
  "Centro de ayuda": "Help center",
  "Tarifas, tiempos y preguntas frecuentes":
    "Fees, times and frequently asked questions",
  Opiniones: "Reviews",
  "Lo que dicen otros clientes del negocio":
    "What other customers say about the business",
  "Cómo funciona": "How it works",
  "Llega a tu familia": "It reaches your family",
  "Sigues cada paso y ganas puntos con cada envío.":
    "You follow every step and earn points with each transfer.",
  "el negocio": "the business",
  "¿Cómo pago mi envío?": "How do I pay for my transfer?",
  "Después de hacer el pedido, en su detalle verás los datos de cobro de":
    "After placing the order, in its details you'll see the payment info for",
  '(Zelle, CashApp, etc.). Paga por cualquiera de ellos y toca "Ya pagué" para avisar. El negocio confirma y comienza el reparto.':
    '(Zelle, CashApp, etc.). Pay through any of them and tap "I paid" to notify. The business confirms and delivery begins.',
  "¿Cuánto tarda en llegar?": "How long does it take to arrive?",
  "En cada envío verás su estado en vivo (pendiente → en camino → entregado) y el tiempo transcurrido. Los tiempos dependen del negocio y la provincia; si tienes prisa, escríbeles por WhatsApp desde el propio pedido.":
    "On each transfer you'll see its live status (pending → on the way → delivered) and the elapsed time. Times depend on the business and the province; if you're in a hurry, message them on WhatsApp from the order itself.",
  "¿Cómo recibe el dinero mi familia?": "How does my family receive the money?",
  "Puede recibir en": "They can receive in",
  "la moneda disponible": "the available currency",
  "En CUP hay dos formas: efectivo o transferencia bancaria. La transferencia entrega un":
    "In CUP there are two ways: cash or bank transfer. The transfer delivers",
  "más que el efectivo. Eliges la forma al hacer el pedido.":
    "more than cash. You choose the method when placing the order.",
  "¿Qué comisión cobran?": "What fee do you charge?",
  "Envíos de": "Transfers of",
  "o más:": "or more:",
  "por cada": "for every",
  "completos. Envíos menores:": "complete. Smaller transfers:",
  "fijo. La comisión ya viene descontada en el monto que ves que recibe tu familia — sin sorpresas.":
    "flat. The fee is already deducted from the amount you see your family receives — no surprises.",
  "¿Cómo gano y uso puntos?": "How do I earn and use points?",
  "puntos por cada USD enviado (se acreditan al entregarse). Cuando juntas suficientes, los canjeas como descuento en tu próxima remesa desde la pantalla de Puntos.":
    "points for every USD sent (credited on delivery). Once you gather enough, you redeem them as a discount on your next transfer from the Points screen.",
  "¿Para qué es el código de entrega?": "What is the delivery code for?",
  "Cuando tu envío está en camino, aparece un código en el detalle del pedido. Dáselo a tu familiar: el repartidor lo pedirá al entregar el dinero, para que solo lo reciba quien debe.":
    "When your transfer is on the way, a code appears in the order details. Give it to your relative: the courier will ask for it when delivering the money, so only the right person receives it.",
  "¿Y si rechazan mi pedido?": "What if my order is rejected?",
  "Verás el pedido como 'Rechazado' con el motivo (si el negocio lo indicó). No se te cobra nada. Puedes tocar 'Repetir envío' para intentarlo de nuevo corrigiendo lo necesario.":
    "You'll see the order as 'Rejected' with the reason (if the business gave one). You aren't charged anything. You can tap 'Resend' to try again, fixing whatever is needed.",
  "¿Es seguro?": "Is it safe?",
  "Tus datos y beneficiarios se guardan en tu cuenta. El pago lo coordinas directo con el negocio por sus medios oficiales. Ante cualquier duda, contáctalos por WhatsApp desde la app.":
    "Your details and beneficiaries are saved in your account. You coordinate payment directly with the business through their official channels. If in doubt, contact them on WhatsApp from the app.",
  "Todo lo que necesitas saber de tus envíos":
    "Everything you need to know about your transfers",
  "¿No encuentras tu respuesta?": "Can't find your answer?",
  "Escríbele a": "Message",
  "por WhatsApp": "on WhatsApp",
  "Tarifas y datos": "Fees and details",
  Comisión: "Fee",
  desde: "from",
  "Transferencia CUP": "CUP transfer",
  "vs efectivo": "vs cash",
  "por USD": "per USD",
  Monedas: "Currencies",
  "Preguntas frecuentes": "Frequently asked questions",

  // ── Estado / resumen ──
  "Mi resumen": "My summary",
  "Lo que has enviado a tu familia": "What you've sent to your family",

  // ── Opiniones / reseñas ──
  "Lo que dicen otros clientes": "What other customers say",
  reseña: "review",
  reseñas: "reviews",
  "Aún no hay reseñas. Cuando recibas un envío podrás calificar y ayudar a otros clientes.":
    "No reviews yet. When you receive a transfer, you'll be able to rate it and help other customers.",
  Cliente: "Customer",
  "Gracias por calificar": "Thanks for rating",
  "¿Cómo estuvo tu envío?": "How was your transfer?",
  estrellas: "stars",
  "Cuéntanos (opcional)…": "Tell us (optional)…",
  "Enviar calificación": "Submit rating",

  // ── Libreta de beneficiarios ──
  "Quitar de la libreta": "Remove from address book",
  "¿Quitar a": "Remove",
  "de tus beneficiarios guardados?": "from your saved beneficiaries?",
  Quitar: "Remove",

  "Aún no has guardado beneficiarios. Al enviar una remesa puedes guardar a quien recibe con un apodo para reutilizarlo la próxima vez.":
    "You haven't saved any beneficiaries yet. When you send a transfer, you can save the recipient under a nickname to reuse it next time.",
  Apodo: "Nickname",
  "Guardar apodo": "Save nickname",
  "Quitar favorito": "Remove favorite",
  "Marcar favorito": "Mark favorite",
  "Editar nota": "Edit note",
  "Añadir nota": "Add note",
  "Editar apodo": "Edit nickname",
  "Ej: recibe en CUP, edificio azul, avisar antes…":
    "E.g.: receives in CUP, blue building, notify first…",
  "Guardar nota": "Save note",

  // ── Tarjeta de pago (extra) ──
  Paga: "Pay",
  "por cualquiera de estos medios y avísale al negocio.":
    "through any of these methods and let the business know.",
  Copiar: "Copy",
  "Avisaste que ya pagaste. El negocio confirmará el cobro y verás “Pagado” aquí.":
    "You reported your payment. The business will confirm it and you'll see “Paid” here.",

  // ── Compartir (seguimiento / comprobante) ──
  "Sigue tu remesa aquí:": "Track your transfer here:",
  "Seguimiento de tu remesa": "Track your transfer",
  "¡Copiado!": "Copied!",
  "Compartir seguimiento": "Share tracking",
  "aquí el comprobante de tu envío de": "here is the receipt for your transfer of",
  "tu familiar": "your relative",
  "Estado:": "Status:",
  "Comprobante de remesa": "Transfer receipt",
  "Compartir comprobante": "Share receipt",
  Comprobante: "Receipt",
  "Entregado a la familia": "Delivered to the family",
  "Envío de": "Transfer of",
  "Dáselo a quien recibe el dinero.": "Give it to whoever receives the money.",
  Tasa: "Rate",
  Fecha: "Date",
  Estado: "Status",
  "Nº": "No.",
  "Contacto:": "Contact:",
  "Mantén presionada la imagen para guardarla o enviarla por WhatsApp.":
    "Press and hold the image to save it or send it via WhatsApp.",
  Volver: "Back",
  Descargar: "Download",
  "Generando…": "Generating…",
  "Compartir foto": "Share photo",
  "WhatsApp al cliente": "WhatsApp to client",

  // ── Historial de pedidos ──
  "Buscar por beneficiario": "Search by beneficiary",
  Todos: "All",
  Rechazadas: "Rejected",
  "Sin resultados.": "No results.",
  "Repetir envío": "Repeat transfer",

  // ── Beneficiarios de un cliente ──
  "Dejará de estar asociado a este cliente. El beneficiario no se elimina.":
    "They will no longer be linked to this client. The beneficiary itself is not deleted.",
  Beneficiarios: "Beneficiaries",
  Añadir: "Add",
  "Sin beneficiarios asociados todavía.": "No beneficiaries linked yet.",
  "Quitar a": "Remove",
  "Añadir beneficiario": "Add beneficiary",
  "Buscar por nombre o provincia": "Search by name or province",
  "No hay más beneficiarios en tu agenda.":
    "No more beneficiaries in your address book.",
  "Sin provincia": "No province",

  // ── Bloqueo: PIN + biometría ──
  "Ingresa tu PIN": "Enter your PIN",
  "Para proteger tus envíos": "To protect your transfers",
  Borrar: "Delete",
  "Usar huella o rostro": "Use fingerprint or face",
  "Verificando…": "Verifying…",
  "Huella o rostro": "Fingerprint or face",
  "No disponible en este dispositivo": "Not available on this device",
  "Activado · desbloquea sin el PIN": "On · unlock without the PIN",
  "Desbloqueo rápido, con el PIN de respaldo":
    "Quick unlock, with the PIN as backup",
  "Primero activa un PIN; la biometría lo complementa.":
    "Set up a PIN first; biometrics complements it.",
  "Biometría activada": "Biometrics enabled",
  "No se pudo activar la biometría.": "Couldn't enable biometrics.",
  "Biometría desactivada": "Biometrics disabled",
  "Activando…": "Enabling…",
  Activar: "Enable",

  // ── Cuenta y datos ──
  "Cuenta y datos": "Account and data",
  "Exportar mis datos": "Export my data",
  "Preparando…": "Preparing…",
  "Descarga un archivo con toda tu información.":
    "Download a file with all your information.",
  "No se pudo exportar. Inténtalo de nuevo.":
    "Couldn't export. Please try again.",
  "Eliminar mi cuenta": "Delete my account",
  "Eliminando…": "Deleting…",
  "Borra tus datos personales de forma permanente.":
    "Permanently deletes your personal data.",
  "¿Eliminar tu cuenta?": "Delete your account?",
  "Se borrarán tu perfil, puntos, beneficiarios y reseñas. Tus pedidos se conservan sin tus datos personales. Esta acción no se puede deshacer.":
    "Your profile, points, beneficiaries and reviews will be deleted. Your orders are kept without your personal data. This action can't be undone.",
  "Eliminar cuenta": "Delete account",
  "No se pudo eliminar la cuenta. Inténtalo de nuevo.":
    "Couldn't delete the account. Please try again.",

  // ── Envío a varios beneficiarios ──
  "A uno": "To one",
  "A varios": "To several",
  "¿Quiénes reciben en Cuba?": "Who's receiving in Cuba?",
  "Monto USD": "Amount USD",
  "Total a enviar": "Total to send",
  beneficiarios: "beneficiaries",
  "Enviar pedidos": "Send orders",
  pedidos: "orders",

  // ── Chat ──
  "Chat con el negocio": "Chat with the business",
  "Escribe un mensaje…": "Write a message…",
  "Escríbele al negocio si tienes dudas de este envío.":
    "Message the business if you have questions about this transfer.",
  "Aún no hay mensajes con el cliente.": "No messages with the client yet.",
  "Mensaje nuevo": "New message",

  // ── Seguimiento en el mapa ──
  "Seguimiento en el mapa": "Tracking on the map",
  "Entregado en": "Delivered in",
  "En reparto en": "Out for delivery in",
  "Preparando para": "Preparing for",
  "Destino en Cuba": "Destination in Cuba",
  "Repartidor en vivo": "Courier live",
  "Esperando la ubicación del repartidor…":
    "Waiting for the courier's location…",
  "Destino de tu envío": "Your transfer's destination",

  // ── Dirección de entrega ──
  Dirección: "Address",
  "Dirección exacta en Cuba": "Exact address in Cuba",
  "Dirección exacta en Cuba (opcional)": "Exact address in Cuba (optional)",
  "Calle, número, entre calles y municipio. El repartidor la necesita.":
    "Street, number, between streets and municipality. The courier needs it.",
  "Ej: Calle 10 #123 e/ 5ta y 7ma, Vedado, Plaza":
    "Ex: 10th St #123 btw 5th & 7th, Vedado, Plaza",
  "Falta la dirección de entrega de algún beneficiario.":
    "A beneficiary's delivery address is missing.",

  // ── Herramientas del inicio ──
  "Alerta de tasa": "Rate alert",
  "Avísame cuando suba": "Alert me when it rises",
  Recordatorio: "Reminder",
  "Recordatorios de envío": "Transfer reminders",
  "Envío recurrente": "Recurring transfer",

  // ── Favoritos ──
  "Añadir a favoritos": "Add to favorites",
  "Quitar de favoritos": "Remove from favorites",
};

export function translate(lang: Lang, es: string): string {
  if (lang === "es") return es;
  return EN[es] ?? es;
}
