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
