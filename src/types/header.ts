import type { ReactNode } from "react";

export interface HeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  todayRevenue?: number;
  dailyTarget?: number;
  showSearch?: boolean;
  actions?: ReactNode;
}
