export interface Service {
  id: string | number;
  name: string;
  duration: number;
  duration_min?: number;
  price: number;
  category?: string;
  cat?: string;
  preset?: boolean;
  active?: boolean;
}

export interface DbServiceRaw {
  id: string | number;
  name: string;
  category: string | null;
  duration_min: number;
  price: number;
}

export interface DbServiceRow {
  id: string;
  name: string;
  category: string | null;
  duration_min: number;
  price: number;
  active: boolean;
}

