import { Icons } from "@/components/ui/Icons";

export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const navItems = [
  { href: "/dashboard", label: "Home", icon: Icons.home, exact: true },
  { href: "/dashboard/bookings", label: "Bookings", icon: Icons.calendar },
  { href: "/dashboard/customers", label: "Customers", icon: Icons.users },
  { href: "/dashboard/revenue", label: "Insights", icon: Icons.chart },
  { href: "/dashboard/settings", label: "Settings", icon: Icons.settings },
];
