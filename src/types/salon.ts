export interface DayHour {
  open: boolean;
  from: string;
  to: string;
}

export interface HoursData {
  [key: string]: DayHour;
}

export interface Salon {
  id: string;
  name: string;
  slug: string;
  area: string | null;
  city: string | null;
  type: string | null;
  hours: HoursData | null;
  booking_window_days?: number | null;
}

export interface SalonWhatsAppSettings {
  reminder?: number;
  autoConfirm?: boolean;
  sendOffers?: boolean;
  verified?: boolean;
  senderPreference?: "chairbook" | "salon_owned";
  templates?: Record<string, string>;
  [key: string]: unknown;
}

export interface SalonNotificationChannel {
  push: boolean;
  sms: boolean;
  wa: boolean;
}

export interface DbSalon {
  id: string;
  name: string;
  area: string | null;
  city: string | null;
  type: string | null;
  hours: HoursData | null;
  wa_number: string | null;
  timezone?: string | null;
  currency?: string | null;
  language?: string | null;
  wa_settings?: SalonWhatsAppSettings | null;
  notification_settings?: Record<string, SalonNotificationChannel> | null;
  is_active?: boolean | null;
  photos?: string[] | null;
  booking_window_days?: number | null;
}

