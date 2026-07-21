// Tipos de datos que reflejan el esquema de la base de datos (Supabase).

export type UserRole = "operador" | "repartidor";

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

export const DELIVERY_CURRENCIES = ["CUP", "USD", "MLC", "EUR"] as const;
export type DeliveryCurrency = (typeof DELIVERY_CURRENCIES)[number];

export interface Profile {
  id: string;
  email?: string;
  full_name: string | null;
  role: UserRole;
  phone?: string | null;
  default_split_percent?: number; // % que le corresponde a este usuario por defecto
  created_at?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  country: string | null;
  notes: string | null;
  pinned?: boolean;
  created_at: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  phone: string | null;
  province: string | null;
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
  notes: string | null;
  created_by: string | null;
  created_at: string;
  deliverer_id?: string | null; // repartidor en Cuba asignado
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
  updated_at: string;
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
