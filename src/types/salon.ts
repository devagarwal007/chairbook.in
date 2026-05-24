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
}

export interface DbSalon {
  id: string;
  name: string;
  area: string | null;
  city: string | null;
  type: string | null;
  hours: HoursData | null;
  wa_number: string | null;
}

