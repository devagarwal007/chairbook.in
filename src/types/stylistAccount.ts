import type { BookingStatus } from "./booking";

export interface StylistSessionProfile {
  userId: string;
  stylistId: string;
  salonId: string;
  salonSlug: string;
  salonName: string;
  salonArea: string;
  name: string;
  roleLabel: string;
  email: string;
  initials: string;
  specialisations: string[];
  photoUrl: string | null;
  bookingSlug: string | null;
  tone: string;
}

export interface StylistAppointment {
  id: string;
  customerId: string;
  customerName: string;
  customerInitials: string;
  customerPhone: string;
  date: string;
  time: string;
  duration: number;
  service: string;
  status: BookingStatus;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  actualDurationMinutes?: number | null;
  notes: string;
  tone: string;
}

export interface StylistClient {
  id: string;
  name: string;
  phone: string;
  initials: string;
  visits: number;
  lastDate: string;
  lastService: string;
  tone: string;
}

export interface StylistNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
