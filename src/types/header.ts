import type { ReactNode } from "react";

export interface HeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  brandMark?: string;
  todayRevenue?: number;
  dailyTarget?: number;
  showSearch?: boolean;
  actions?: ReactNode;
}
