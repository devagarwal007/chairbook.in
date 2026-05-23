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
