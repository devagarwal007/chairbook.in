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
}

