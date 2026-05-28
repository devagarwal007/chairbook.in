import { Stylist } from "./stylist";
import { Service } from "./service";
import { HoursData } from "./salon";

export interface OnboardingData {
  name: string;
  area: string;
  type: string;
  hours: HoursData;
  stylists: Stylist[];
  services: Service[];
  waNumber: string;
  gst_enabled?: boolean;
  gstin?: string;
  legal_name?: string;
  gst_state?: string;
  gst_state_code?: string;
  gst_pricing_mode?: "tax_inclusive" | "tax_exclusive";
}
