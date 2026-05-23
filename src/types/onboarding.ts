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
}
