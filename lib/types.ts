// Tipos de datos que reflejan el esquema de la base de datos (Supabase).

export type UserRole = "socio" | "admin";

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
  email: string;
  full_name: string | null;
  role: UserRole;
  default_split_percent: number; // % que le corresponde a este usuario por defecto
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  country: string | null;
  notes: string | null;
  created_at: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  phone: string | null;
  province: string | null;
  preferred_currency: DeliveryCurrency | null;
  id_card: string | null;
  notes: string | null;
  client_id: string | null;
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  currency: DeliveryCurrency;
  rate: number; // cuántas unidades locales = 1 USD
  updated_at: string;
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
  notes: string | null;
  created_by: string | null;
  created_at: string;
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
  updated_at: "",
};

export interface Settlement {
  id: string;
  date: string;
  amount: number; // en USD
  direction: "us_to_cuba" | "cuba_to_us"; // sentido del pago que salda la cuenta
  method: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}
