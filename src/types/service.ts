export type ServiceKind = "service" | "bundle";

export interface Service {
  id: string | number;
  name: string;
  duration: number;
  duration_min?: number;
  price: number;
  code?: number | null;
  kind?: ServiceKind;
  bundle_note?: string | null;
  componentIds?: Array<string | number>;
  items?: Array<string | number>;
  includedServices?: Service[];
  originalPrice?: number;
  savings?: number;
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
  code?: number | null;
  kind?: ServiceKind | null;
  bundle_note?: string | null;
  active?: boolean | null;
  deleted_at?: string | null;
  bundle_components?: DbBundleComponentRow[] | null;
}

export interface DbServiceRow {
  id: string;
  name: string;
  category: string | null;
  duration_min: number;
  price: number;
  active: boolean;
  code?: number | null;
  kind?: ServiceKind | null;
  bundle_note?: string | null;
  deleted_at?: string | null;
  bundle_components?: DbBundleComponentRow[] | null;
}

export interface DbBundleComponentRow {
  position?: number | null;
  component_service_id?: string | number | null;
  component?: {
    id: string | number;
    name: string;
    category?: string | null;
    duration_min?: number | null;
    price?: number | null;
    code?: number | null;
    active?: boolean | null;
  } | null;
}

