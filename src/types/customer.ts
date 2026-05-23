export interface Customer {
  id: string | number;
  name: string;
  phone: string;
  initials?: string;
  visits?: number;
  lastDays?: number;
  spend?: number;
  tone?: string;
  fav?: string;
  stylist?: string;
  isNew?: boolean;
  created_at?: string;
}
