import { HoursData, Service, Stylist } from ".";
import type { SalonGstSettings } from "./gst";
import type { EmbeddedSignupInfo } from "@/lib/whatsapp/embedded-signup";
import type { ServiceKind } from "./service";

export interface SalonInfo {
  name: string;
  area: string;
  type: string;
  city: string;
  bookingWindowDays: number;
  timezone?: string;
  currency?: string;
  language?: string;
  is_active?: boolean;
  photos?: string[];
}

export interface BillingInvoice {
  id: string;
  date: string;
  plan_name: string;
  amount: number;
  payment_method: string;
}

export interface WhatsAppTemplates {
  confirmation: string;
  reminder: string;
  reengagement: string;
}

export type WhatsAppSenderPreference = "chairbook" | "salon_owned";

export interface WhatsAppInfo {
  number: string;
  verified: boolean;
  reminder: number;
  autoConfirm: boolean;
  sendOffers: boolean;
  senderPreference: WhatsAppSenderPreference;
  templates: WhatsAppTemplates;
}

export interface NotificationChannel {
  push: boolean;
  sms: boolean;
  wa: boolean;
}

export interface Notifications {
  [key: string]: NotificationChannel;
}

export interface AccountInfo {
  name: string;
  email: string;
  phone?: string;
}

export interface SettingsData {
  salon: SalonInfo;
  hours: HoursData;
  services: Service[];
  team: Stylist[];
  wa: WhatsAppInfo;
  plan: string;
  notifs: Notifications;
  account: AccountInfo;
  gst?: SalonGstSettings;
}

export type ServiceModalState = {
  mode: "add" | "edit";
  target?: Service | null;
  startKind?: ServiceKind;
};

export type WhatsAppChannelView = {
  id: string;
  mode: "salon_owned" | "chairbook_fallback";
  status: "pending" | "active" | "inactive" | "error";
  credit_line_status: "pending" | "active" | "missing" | "error";
  webhook_status: "unknown" | "subscribed" | "error";
  phone_number_id: string | null;
  display_number: string | null;
  updated_at: string | null;
};

export type MessageCreditTopupView = {
  id: string;
  razorpay_order_id: string | null;
  credits: number;
  amount_paise: number;
  status: "created" | "paid" | "failed";
  created_at: string | null;
};

export type MessageCreditLedgerView = {
  id: string;
  action: "reserve" | "consume" | "release" | "topup" | "monthly_grant";
  plan_credits: number;
  refill_credits: number;
  created_at: string | null;
};

export type WhatsAppTemplateView = {
  id: string;
  template_key: string;
  template_name: string;
  category: string;
  language_code: string;
  status: string;
};

export type WhatsAppConnectConfig = {
  loading: boolean;
  configured: boolean;
  chairbookSenderConfigured: boolean;
  missing: string[];
  appId: string | null;
  configId: string | null;
  graphApiVersion: string;
};

export type PendingEmbeddedSignup = {
  code?: string;
  info?: EmbeddedSignupInfo;
  saving?: boolean;
};
