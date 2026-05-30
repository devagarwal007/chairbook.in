import { HoursData, Service, Stylist } from ".";
import type { SalonGstSettings } from "./gst";

export interface SalonInfo {
  name: string;
  area: string;
  type: string;
  city: string;
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
