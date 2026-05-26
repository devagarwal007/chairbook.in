export interface MetricInfo {
  value: number;
  delta: string;
  tone: "up" | "down" | "flat";
  compare?: string;
  unit?: string;
}

export interface PeriodData {
  label: string;
  dateRange: string;
  compareLabel: string;
  metrics: {
    revenue: MetricInfo;
    bookings: MetricInfo;
    newCust: MetricInfo;
    noShow: MetricInfo;
  };
  chart: {
    title: string;
    data: { x: string; v: number }[];
    highlight: number;
  };
  topServices: Array<{
    name: string;
    revenue: number;
    share: number;
    bookings: number;
    color: string;
  }>;
  topStylists: Array<{
    name: string;
    bookings: number;
    revenue: number;
    share: number;
    tone: string;
  }>;
}

export interface DbAnalyticsBooking {
  id: string;
  date: string;
  start_time: string;
  status: string;
  payment_status?: string | null;
  amount_paid?: number | null;
  amount_due?: number | null;
  bill_total?: number | null;
  customer_id: string | null;
  stylist_id: string | null;
  created_at: string;
  customer: { id: string; name: string; created_at: string } | null;
  stylist: { id: string; name: string; tone: string | null } | null;
  booking_services: Array<{
    qty: number | null;
    price_at_booking: number;
    service: {
      id: string;
      name: string;
      category: string | null;
    } | null;
  }> | null;
  payments: Array<{
    amount: number;
    tip: number | null;
    discount: number | null;
    tax: number | null;
    method: string | null;
  }> | null;
}
