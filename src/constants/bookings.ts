import { Stylist, BookingData } from "@/types";

export const START_HOUR = 9;
export const END_HOUR = 21;
export const SLOT_HEIGHT = 28; // px per 30-min slot
export const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const DOW_FULL = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

export const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  arrived: "Arrived",
  completed: "Done",
  noshow: "No-show",
  cancelled: "Cancelled",
};

// Time labels: 9 AM – 9 PM
export const TIME_LABELS: string[] = [];
for (let h = START_HOUR; h < END_HOUR; h++) {
  const hh = h > 12 ? h - 12 : h;
  const ampm = h >= 12 ? "PM" : "AM";
  TIME_LABELS.push(`${hh} ${ampm}`);
}

export const FALLBACK_STYLISTS: Stylist[] = [];

// Mock bookings / Booking details mockup
export const MOCK_BOOKING: BookingData = {
  id: "",
  status: "confirmed",
  date: "",
  time: "",
  duration: 0,
  customer: {
    id: 0,
    name: "",
    initials: "",
    tone: "a",
    phone: "",
    visits: 0,
    lastVisit: "",
    spend: 0,
    memberSince: "",
  },
  services: [],
  stylist: { name: "", short: "", tone: "a" },
  notes: "Allergic to ammonia-based color brands. Use ammonia-free range.",
  payment: { status: "pending", method: null },
  activity: [
    { ts: "24 May, 09:12 AM", icon: "wa",    text: "Reminder sent on WhatsApp", meta: "Auto", tone: "wa" },
    { ts: "23 May, 11:34 AM", icon: "check", text: "Customer confirmed", meta: "Via WhatsApp", tone: "green" },
    { ts: "17 May, 04:21 PM", icon: "cal",   text: "Booking created",    meta: "Online via salonbook.in/glow-andheri", tone: "neutral" },
  ],
};

export const STATUS_LABEL_DETAIL = {
  confirmed: "Confirmed",
  arrived: "Arrived",
  completed: "Completed",
  noshow: "No-show",
  cancelled: "Cancelled",
};

export const CANCEL_REASONS = [
  { id: "customer", label: "Customer requested" },
  { id: "stylist",  label: "Stylist unavailable" },
  { id: "emerg",    label: "Salon emergency / closed" },
  { id: "noshow",   label: "Customer did not show up" },
  { id: "other",    label: "Other reason" },
];

function generateReschDays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const arr = [];
  const dayNames = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    arr.push({
      key: d.toISOString().slice(0,10),
      dow: dayNames[d.getDay()],
      dom: d.getDate(),
      label: null as string | null,
      full: d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
    });
  }
  return arr;
}

export const RESCH_DAYS = generateReschDays();

// 18 slots list (bookings details rescheduling)
export const ALL_SLOTS = ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00"];

// 20 slots list (new booking)
export const ALL_SLOTS_FULL = ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00"];
