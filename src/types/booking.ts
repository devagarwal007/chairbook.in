export type BookingStatus = "confirmed" | "arrived" | "in_service" | "completed" | "noshow" | "cancelled";

export type BookingProgressAction = "mark_arrived" | "start_service" | "complete_service";

export interface BookingTimingFields {
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  actualDurationMinutes?: number | null;
}

export interface Appointment extends BookingTimingFields {
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
  paymentStatus?: "paid" | "partial" | "due" | null;
  amountPaid?: number;
  amountDue?: number;
  billTotal?: number;
}

export interface CalAppt extends BookingTimingFields {
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
  paymentStatus?: "paid" | "partial" | "due" | null;
  billTotal?: number;
  amountPaid?: number;
  amountDue?: number;
  source?: string;
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
  payment: {
    status: "paid" | "partial" | "due" | "pending";
    method: string | null;
    amountPaid?: number;
    amountDue?: number;
    billTotal?: number;
  };
  timing?: BookingTimingFields;
  activity: ActivityItem[];
}

export interface BookingRow {
  id: string;
  stylist_id: string | number | null;
  date: string;
  start_time: string;
  duration: number;
  status: string;
  arrived_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  actual_duration_minutes?: number | null;
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
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  actual_duration_minutes: number | null;
  notes: string | null;
  customer: { id: string | number; name: string; phone: string | null } | null;
  stylist: { id: string | number; name: string; tone: string | null } | null;
  booking_services: DbBookingServiceItem[] | null;
  payment_status?: string | null;
  amount_paid?: number | null;
  amount_due?: number | null;
  bill_total?: number | null;
}

export interface DbCalBookingRow {
  id: string;
  date: string;
  start_time: string;
  duration: number;
  status: string;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  actual_duration_minutes: number | null;
  notes: string | null;
  payment_status: string | null;
  bill_total: number | null;
  amount_paid: number | null;
  amount_due: number | null;
  source: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
  stylist: { id: string; name: string; tone: string | null } | null;
  booking_services: Array<{
    price_at_booking?: number;
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
  amount_paid?: number | null;
  amount_due?: number | null;
  bill_total?: number | null;
  payment_status?: "paid" | "partial" | "due" | null;
  booking_services: DbBookingService[] | null;
  stylist: { name: string } | null;
  payments: { method: string; amount: number }[] | { method: string; amount: number } | null;
}

export interface DbCustomerBooking {
  id: string;
  customer_id: string;
  status: string;
  date: string;
  amount_paid?: number | null;
  amount_due?: number | null;
  bill_total?: number | null;
  payment_status?: string | null;
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
  arrived_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  actual_duration_minutes?: number | null;
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
  arrived_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  actual_duration_minutes?: number | null;
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


