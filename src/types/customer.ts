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

export interface DbCustomerRaw {
  id: string | number;
  name: string;
  phone: string | null;
  created_at: string;
}

export interface DbCustomerRow {
  id: string;
  name: string;
  phone: string | null;
  pref_stylist_id: string | null;
  member_since: string | null;
  created_at: string;
  stylists: { name: string } | null;
}

export interface DbCustomer {
  id: string | number;
  name: string;
  phone: string | null;
  member_since: string | null;
  birthday: string | null;
  created_at: string;
  pref_stylist_id: string | number | null;
  stylists: { name: string } | null;
}

export interface NewCustInput {
  name: string;
  phone: string;
  source: string;
  noPhone: boolean;
}

