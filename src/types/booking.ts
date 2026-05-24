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

export interface DbBookingServiceItem {
  qty: number | null;
  price_at_booking: number;
  service: { id: string | number; name: string } | null;
}

export interface DbBookingListItem {
  id: string;
  customer_id: string | null;
  date: string;
  start_time: string | null;
  duration: number;
  status: string;
  notes: string | null;
  customer: { id: string | number; name: string; phone: string | null } | null;
  stylist: { id: string | number; name: string; tone: string | null } | null;
  booking_services: DbBookingServiceItem[] | null;
}

export interface DbCalBookingRow {
  id: string;
  date: string;
  start_time: string;
  duration: number;
  status: string;
  notes: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
  stylist: { id: string; name: string; tone: string | null } | null;
  booking_services: Array<{
    service: {
      name: string;
    } | null;
  }> | null;
}

export interface DbCheckoutServiceItemRow {
  qty: number | null;
  price_at_booking: number;
  service: {
    id: string;
    name: string;
    price: number;
  } | null;
}

export interface DbBookingService {
  price_at_booking: number;
  qty: number | null;
  service: { name: string } | null;
}

export interface DbBooking {
  id: string;
  date: string;
  start_time: string | null;
  status: string;
  notes: string | null;
  booking_services: DbBookingService[] | null;
  stylist: { name: string } | null;
  payments: { method: string; amount: number }[] | { method: string; amount: number } | null;
}

export interface DbCustomerBooking {
  id: string;
  customer_id: string;
  status: string;
  date: string;
  booking_services: Array<{
    price_at_booking: number;
    qty: number | null;
    service: {
      name: string;
    } | null;
  }> | null;
  stylist: { name: string } | null;
}

export interface DbBookingSimple {
  id: string;
  customer_id: string;
  status: string;
  date: string;
  booking_services: { price_at_booking: number; qty: number | null }[] | null;
}

export interface DbBookingSlotRaw {
  id: string;
  start_time: string | null;
  duration: number | null;
}

export interface DbBookingStylistRaw {
  id: string;
  start_time: string | null;
  duration: number | null;
  stylist_id: string | number;
}

export interface MyDbBooking {
  id: string;
  date: string;
  start_time: string;
  duration: number;
  status: string;
  notes: string | null;
  customer: { name: string; phone: string } | null;
  stylist: { name: string } | null;
  booking_services: Array<{
    service: {
      name: string;
      duration_min: number;
      price: number;
    } | null;
  }> | null;
}

export interface StylistAppt {
  id: string;
  start_time: string;
  duration: number;
  status: string;
  notes: string | null;
  customer: { name: string } | null;
  booking_services: Array<{
    service: {
      name: string;
    } | null;
  }> | null;
}

export interface DbBlockRow {
  id: string;
  reason: string | null;
  date_from: string;
  date_to: string | null;
  time_from: string | null;
  time_to: string | null;
  all_day: boolean;
  recurring: boolean;
  note: string | null;
  stylist_id: string | null;
}


