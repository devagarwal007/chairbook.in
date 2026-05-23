import { HoursData, Service, Stylist } from ".";

export interface SalonInfo {
  name: string;
  area: string;
  type: string;
  city: string;
}

export interface WhatsAppTemplates {
  confirmation: string;
  reminder: string;
  reengagement: string;
}

export interface WhatsAppInfo {
  number: string;
  verified: boolean;
  reminder: number;
  autoConfirm: boolean;
  sendOffers: boolean;
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
}
