export interface Stylist {
  id: string | number;
  name: string;
  tone?: string | null;
  short?: string;
  role?: string;
  role_label?: string | null;
  commission_pct?: number;
  commission?: number;
  active?: boolean;
  skills?: string[];
  email?: string | null;
  user_id?: string | null;
  specialisations?: string[];
  photo_url?: string | null;
  booking_slug?: string | null;
  account_invited_at?: string | null;
  account_accepted_at?: string | null;
}

export interface DbStylistRaw {
  id: string | number;
  name: string;
  tone: string | null;
}

export interface DbStylistRow {
  id: string;
  name: string;
  role_label: string | null;
  tone: string | null;
  commission_pct: number | null;
  active: boolean;
  email?: string | null;
  user_id?: string | null;
  specialisations?: string[] | null;
  photo_url?: string | null;
  booking_slug?: string | null;
  account_invited_at?: string | null;
  account_accepted_at?: string | null;
}

