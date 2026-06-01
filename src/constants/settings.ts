import { SettingsData } from "@/types";
import { Icons as I } from "@/components/ui/Icons";

export const DAYS = [
  { id: "mon", name: "Monday" },
  { id: "tue", name: "Tuesday" },
  { id: "wed", name: "Wednesday" },
  { id: "thu", name: "Thursday" },
  { id: "fri", name: "Friday" },
  { id: "sat", name: "Saturday" },
  { id: "sun", name: "Sunday" },
];

export const TABS = [
  { id: "salon",    label: "Salon profile", icon: I.store },
  { id: "services", label: "Services",      icon: I.scissors },
  { id: "team",     label: "Team",          icon: I.team },
  { id: "whatsapp", label: "WhatsApp",      icon: I.wa },
  { id: "plan",     label: "Subscription",  icon: I.card },
  { id: "gst",      label: "GST & Billing", icon: I.invoice },
  { id: "notifs",   label: "Notifications", icon: I.bell },
  { id: "attendance", label: "Attendance",   icon: I.clock },
  { id: "account",  label: "Account",       icon: I.user },
];

export const PLANS = [
  { id: "solo",  name: "Solo",  price: 499,  desc: "For independent stylists", whatsappCredits: 100 },
  { id: "salon", name: "Salon", price: 999,  desc: "Up to 5 stylists", whatsappCredits: 500 },
  { id: "chain", name: "Chain", price: 2499, desc: "Multi-branch", whatsappCredits: 2000 },
];

export const INITIAL_DATA: SettingsData = {
  account: { name: "Ravi Varma", email: "ravi@glowsalon.in" },
  salon: { name: "Glow Salon & Spa", area: "Andheri West, near Lokhandwala", type: "Unisex salon", city: "Mumbai", bookingWindowDays: 7 },
  hours: {
    mon: { open: true,  from: "10:00", to: "20:00" },
    tue: { open: true,  from: "10:00", to: "20:00" },
    wed: { open: true,  from: "10:00", to: "20:00" },
    thu: { open: true,  from: "10:00", to: "20:00" },
    fri: { open: true,  from: "10:00", to: "21:00" },
    sat: { open: true,  from: "09:00", to: "21:00" },
    sun: { open: false, from: "10:00", to: "18:00" },
  },
  services: [
    { id: 1, code: 1, kind: "service", name: "Haircut",       cat: "Hair",  duration: 30, price: 300,  active: true },
    { id: 2, code: 2, kind: "service", name: "Hair Color",    cat: "Hair",  duration: 90, price: 1800, active: true },
    { id: 3, code: 3, kind: "service", name: "Hair Spa",      cat: "Hair",  duration: 60, price: 900,  active: true },
    { id: 4, code: 4, kind: "service", name: "Facial — Gold", cat: "Skin",  duration: 75, price: 1400, active: true },
    { id: 5, code: 5, kind: "service", name: "Threading",     cat: "Skin",  duration: 15, price: 80,   active: true },
    { id: 6, code: 6, kind: "service", name: "Manicure",      cat: "Hands", duration: 30, price: 350,  active: true },
    { id: 7, code: 7, kind: "service", name: "Pedicure",      cat: "Hands", duration: 45, price: 500,  active: false },
    { id: "bundle-1", code: 8, kind: "bundle", name: "Bridal Glow", cat: "Combos", duration: 195, price: 2300, active: true, componentIds: [2, 4, 6], bundle_note: "Most-booked combo before weddings" },
    { id: "bundle-2", code: 9, kind: "bundle", name: "Hair Refresh", cat: "Combos", duration: 90, price: 1000, active: true, componentIds: [1, 3], bundle_note: "" },
  ],
  team: [
    { id: 1, name: "Anjali", role: "Senior stylist · 9 yrs",     tone: "b", commission: 30 },
    { id: 2, name: "Pooja",  role: "Beautician · Skin specialist", tone: "d", commission: 25 },
    { id: 3, name: "Kiran",  role: "Senior stylist · 12 yrs",    tone: "c", commission: 35 },
    { id: 4, name: "Rekha",  role: "Threading & nails · 4 yrs",  tone: "e", commission: 25 },
  ],
  wa: {
    number: "98xxx 12345",
    verified: true,
    reminder: 24,
    autoConfirm: true,
    sendOffers: false,
    senderPreference: "chairbook",
    templates: {
      confirmation: "Hi {name} 🙏 Your booking at Glow Salon is confirmed for {date} at {time} with {stylist}.",
      reminder: "Hi {name}, reminder: {service} with {stylist} tomorrow at {time}. Reply YES to confirm.",
      reengagement: "Hey {name}! It's been a while. Book now and get 10% off your next visit."
    }
  },
  plan: "salon",
  notifs: {
    newBooking: { push: true,  sms: false, wa: true },
    cancel:     { push: true,  sms: false, wa: true },
    noshow:     { push: true,  sms: false, wa: false },
    daily:      { push: false, sms: false, wa: true },
  },
};
