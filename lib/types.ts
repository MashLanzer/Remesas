// Tipos de datos que reflejan el esquema de la base de datos (Supabase).

export type UserRole = "operador" | "repartidor" | "cliente";

// Ofertas que publica el negocio y ve el cliente.
export const OFFER_KINDS = [
  { key: "tasa", label: "Tasa especial", emoji: "🔥" },
  { key: "sin_comision", label: "Sin comisión", emoji: "🎉" },
  { key: "bono", label: "Bono / Referido", emoji: "🎁" },
  { key: "combo", label: "Combo", emoji: "📦" },
  { key: "express", label: "Entrega express", emoji: "⚡" },
  { key: "otro", label: "Anuncio", emoji: "📣" },
] as const;

export type OfferKind = (typeof OFFER_KINDS)[number]["key"];

// Plantillas de promociones listas para usar (el operador las toca y se
// rellenan solas; luego ajusta y publica).
export const OFFER_TEMPLATES = [
  {
    emoji: "🔥",
    title: "Tasa especial hoy",
    kind: "tasa",
    description: "Mejor tasa por tiempo limitado. ¡Aprovecha!",
  },
  {
    emoji: "🎉",
    title: "Sin comisión",
    kind: "sin_comision",
    description: "Envía tu próxima remesa sin comisión.",
  },
  {
    emoji: "🎁",
    title: "Trae un amigo",
    kind: "bono",
    description: "Gana un bono por cada amigo que invites a enviar.",
  },
  {
    emoji: "⚡",
    title: "Entrega express",
    kind: "express",
    description: "Entrega el mismo día en tu zona.",
  },
] as const;

// Plantillas de paquetes de remesa. Se definen por el USD que paga el cliente;
// el monto que recibe la familia se calcula en vivo con la tasa (nunca fijo).
export const PACKAGE_TEMPLATES = [
  {
    emoji: "🎁",
    title: "Paquete Ayuda",
    amount_usd: 50,
    delivery_currency: "CUP",
    highlight: "",
    description: "Un envío rápido para la familia.",
  },
  {
    emoji: "👨‍👩‍👧",
    title: "Paquete Familia",
    amount_usd: 150,
    delivery_currency: "CUP",
    highlight: "Más popular",
    description: "El apoyo del mes para los tuyos.",
  },
  {
    emoji: "⚡",
    title: "Envío Express",
    amount_usd: 30,
    delivery_currency: "CUP",
    highlight: "Entrega hoy",
    description: "Rápido, para lo urgente.",
  },
  {
    emoji: "🎂",
    title: "Combo Cumpleaños",
    amount_usd: 75,
    delivery_currency: "CUP",
    highlight: "Sorpresa",
    description: "Para celebrar a distancia.",
  },
  {
    emoji: "💵",
    title: "Paquete Dólares",
    amount_usd: 100,
    delivery_currency: "USD",
    highlight: "",
    description: "Entrega directa en USD.",
  },
] as const;

export const PRODUCT_CATEGORIES = [
  { key: "recarga", label: "Recargas", emoji: "📱" },
  { key: "combo", label: "Combos", emoji: "📦" },
  { key: "otro", label: "Otros", emoji: "🛍️" },
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]["key"];

export interface Product {
  id: string;
  operator_id: string | null;
  name: string;
  description: string | null;
  price_usd: number;
  category: ProductCategory | null;
  emoji: string | null;
  active: boolean;
  created_at: string;
}

export interface StoreOrder {
  id: string;
  operator_id: string | null;
  client_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  product_id: string | null;
  product_name: string | null;
  price_usd: number;
  qty: number;
  total_usd: number;
  recipient_name: string | null;
  recipient_phone: string | null;
  address: string | null;
  note: string | null;
  status: OrderStatus;
  accepted_by: string | null;
  accepted_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export type OrderStatus = "pendiente" | "aceptado" | "rechazado";

export interface Order {
  id: string;
  operator_id: string | null;
  client_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  amount_usd: number;
  beneficiary_name: string | null;
  beneficiary_phone: string | null;
  province: string | null;
  delivery_currency: DeliveryCurrency | null;
  note: string | null;
  status: OrderStatus;
  accepted_by: string | null;
  remittance_id: string | null;
  accepted_at: string | null;
  delivered_at: string | null;
  received_at: string | null;
  track_token: string | null;
  package_id?: string | null;
  redeem?: boolean | null;
  points_used?: number | null;
  discount_usd?: number | null;
  reject_reason?: string | null;
  created_at: string;
}

export interface Offer {
  id: string;
  operator_id: string | null;
  title: string;
  description: string | null;
  kind: OfferKind | null;
  emoji: string | null;
  image_url: string | null;
  active: boolean;
  featured?: boolean;
  view_count?: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface RemittancePackage {
  id: string;
  operator_id: string | null;
  title: string;
  description: string | null;
  emoji: string | null;
  amount_usd: number;
  delivery_currency: DeliveryCurrency | null;
  highlight: string | null;
  active: boolean;
  sort: number;
  created_at: string;
}

export type RemittanceStatus = "pendiente" | "entregado" | "liquidado";

export type PaymentMethod =
  | "Zelle"
  | "CashApp"
  | "Efectivo"
  | "Transferencia"
  | "PayPal"
  | "Otro";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "Zelle",
  "CashApp",
  "Efectivo",
  "Transferencia",
  "PayPal",
  "Otro",
];

export interface Announcement {
  id: string;
  operator_id: string | null;
  title: string;
  body: string | null;
  emoji: string | null;
  active: boolean;
  created_at: string;
}

export const DELIVERY_CURRENCIES = ["CUP", "USD", "MLC", "EUR"] as const;
export type DeliveryCurrency = (typeof DELIVERY_CURRENCIES)[number];

// Provincias de Cuba, para la zona de cobertura del repartidor.
export const CUBA_PROVINCES = [
  "Pinar del Río",
  "Artemisa",
  "La Habana",
  "Mayabeque",
  "Matanzas",
  "Cienfuegos",
  "Villa Clara",
  "Sancti Spíritus",
  "Ciego de Ávila",
  "Camagüey",
  "Las Tunas",
  "Holguín",
  "Granma",
  "Santiago de Cuba",
  "Guantánamo",
  "Isla de la Juventud",
] as const;

export interface Profile {
  id: string;
  email?: string;
  full_name: string | null;
  role: UserRole | null;
  phone?: string | null;
  member_status?: string | null; // 'active' | 'pending'
  operator_code?: string | null;
  default_split_percent?: number; // % que le corresponde a este usuario por defecto
  created_at?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  country: string | null;
  notes: string | null;
  user_id?: string | null; // cuenta real del cliente (si pidió desde su app)
  pinned?: boolean;
  created_at: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  phone: string | null;
  province: string | null;
  address?: string | null; // dirección exacta (calle, número) para el mapa
  preferred_currency: DeliveryCurrency | null;
  preferred_delivery?: string | null;
  id_card: string | null;
  notes: string | null;
  client_id: string | null;
  pinned?: boolean;
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  currency: DeliveryCurrency;
  rate: number; // cuántas unidades locales = 1 USD
  market_rate?: number | null; // tasa de referencia del mercado (opcional)
  active?: boolean; // si está oculta/bloqueada
  updated_at: string;
}

export interface RateHistory {
  id: string;
  currency: DeliveryCurrency;
  rate: number;
  changed_at: string;
}

export interface Remittance {
  id: string;
  date: string;
  client_id: string | null;
  beneficiary_id: string | null;
  amount_usd: number;
  commission: number;
  total_received: number;
  payment_method: PaymentMethod | null;
  delivery_currency: DeliveryCurrency;
  exchange_rate: number;
  local_amount: number;
  exchange_profit: number; // ganancia extra por diferencial de cambio (spread)
  total_profit: number;
  my_split_percent: number; // % para el socio de EE.UU. (quien registra/cobra)
  my_share: number;
  partner_share: number;
  status: RemittanceStatus;
  client_paid: boolean;
  receipt_url: string | null;
  delivery_proof_url?: string | null;
  signature_url?: string | null; // firma de recepción en pantalla
  en_route_at?: string | null; // el repartidor marcó "en camino"
  received_by_name?: string | null; // quién recibió la entrega
  received_by_id?: string | null; // carné (CI) de quien recibió
  id_photo_url?: string | null; // foto del carné de quien recibió
  last_incident?: string | null; // motivo del último intento fallido
  incident_at?: string | null; // cuándo fue el último intento fallido
  incident_count?: number | null; // cuántos intentos fallidos van
  reminder_at?: string | null; // recordatorio programado por el repartidor
  notes: string | null;
  created_by: string | null;
  created_at: string;
  deliverer_id?: string | null; // repartidor en Cuba asignado
  operator_id?: string | null; // negocio (tenant) dueño
  // Relaciones opcionales (cuando se hace join)
  client?: Client | null;
  beneficiary?: Beneficiary | null;
}

export interface BusinessSettings {
  commission_threshold: number;
  commission_percent: number;
  commission_flat: number;
  default_currency: DeliveryCurrency;
  default_payment_method: PaymentMethod | null;
  business_name: string | null;
  partner_name: string | null;
  settle_threshold?: number | null;
  monthly_goal?: number | null;
  brand_hue?: number | null;
  points_per_usd?: number | null;
  point_value_usd?: number | null;
  redeem_min_points?: number | null;
  redeem_max_pct?: number | null;
  updated_at: string;
}

export interface PointsEntry {
  id: string;
  delta: number;
  reason: string | null;
  order_id: string | null;
  created_at: string;
}

export const DEFAULT_SETTINGS: BusinessSettings = {
  commission_threshold: 100,
  commission_percent: 10,
  commission_flat: 5,
  default_currency: "CUP",
  default_payment_method: null,
  business_name: null,
  partner_name: null,
  settle_threshold: null,
  monthly_goal: null,
  updated_at: "",
};

export interface Settlement {
  id: string;
  date: string;
  amount: number; // en USD
  direction: "us_to_cuba" | "cuba_to_us"; // sentido del pago que salda la cuenta
  method: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
  deliverer_id?: string | null; // repartidor con quien se salda
}
