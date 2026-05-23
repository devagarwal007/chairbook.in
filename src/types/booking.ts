export type BookingStatus = "confirmed" | "arrived" | "completed" | "noshow" | "cancelled";

export interface Appointment {
  id: string | number;
  customerId?: string | number;
  time: string;
  duration: number;
  customer: string;
  initials: string;
  tone: string;
  service: string;
  stylist: string | number;
  price: number;
  status: BookingStatus;
  visits: number;
  phone: string;
  note: string;
}

export interface CalAppt {
  id: string | number;
  dayKey: string; // 'YYYY-MM-DD'
  stylistId: string | number;
  startH: number;
  startM: number;
  duration: number;
  customer: string;
  initials: string;
  tone: string;
  service: string;
  status: BookingStatus;
  phone?: string;
}

export interface ActivityItem {
  ts: string;
  icon: string;
  text: string;
  meta: string;
  tone: string;
}

export interface BookingData {
  id: string;
  status: BookingStatus;
  date: string;
  time: string;
  duration: number;
  customer: {
    id: string | number;
    name: string;
    initials: string;
    tone: string;
    phone: string;
    visits: number;
    lastVisit: string;
    spend: number;
    memberSince: string;
  };
  services: { name: string; duration: number; price: number }[];
  stylist: { name: string; short: string; tone: string };
  notes: string;
  payment: { status: "paid" | "pending"; method: string | null };
  activity: ActivityItem[];
}

export interface BookingRow {
  id: string;
  stylist_id: string | number | null;
  date: string;
  start_time: string;
  duration: number;
  status: string;
}
