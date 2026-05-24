import { Service, HoursData } from "@/types";

export const DAYS = [
  { id: "mon", name: "Monday", short: "M" },
  { id: "tue", name: "Tuesday", short: "T" },
  { id: "wed", name: "Wednesday", short: "W" },
  { id: "thu", name: "Thursday", short: "T" },
  { id: "fri", name: "Friday", short: "F" },
  { id: "sat", name: "Saturday", short: "S" },
  { id: "sun", name: "Sunday", short: "S" },
];

export const PRESET_SERVICES: Service[] = [
  { id: "haircut", name: "Haircut", duration: 30, price: 300, preset: true },
  { id: "color", name: "Hair Color", duration: 90, price: 1800, preset: true },
  { id: "spa", name: "Hair Spa", duration: 60, price: 900, preset: true },
  { id: "facial", name: "Facial — Classic", duration: 45, price: 700, preset: true },
  { id: "threading", name: "Threading", duration: 15, price: 80, preset: true },
  { id: "mani", name: "Manicure", duration: 30, price: 350, preset: true },
  { id: "pedi", name: "Pedicure", duration: 45, price: 500, preset: true },
  { id: "beard", name: "Beard Trim", duration: 20, price: 200, preset: true },
];

export const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "salon", label: "Salon basics" },
  { id: "hours", label: "Hours" },
  { id: "team", label: "Team" },
  { id: "services", label: "Services" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "done", label: "Done" },
];

export const defaultHours: HoursData = {
  mon: { open: true, from: "10:00", to: "20:00" },
  tue: { open: true, from: "10:00", to: "20:00" },
  wed: { open: true, from: "10:00", to: "20:00" },
  thu: { open: true, from: "10:00", to: "20:00" },
  fri: { open: true, from: "10:00", to: "21:00" },
  sat: { open: true, from: "09:00", to: "21:00" },
  sun: { open: false, from: "10:00", to: "18:00" },
};
