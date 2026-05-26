import { Icons } from "@/components/ui/Icons";

export const stylistNavItems = [
  { href: "/stylist", label: "Today", icon: Icons.home, exact: true },
  { href: "/stylist/calendar", label: "Calendar", icon: Icons.calendar },
  { href: "/stylist/clients", label: "Clients", icon: Icons.users },
  { href: "/stylist/notifications", label: "Alerts", icon: Icons.bell },
  { href: "/stylist/profile", label: "Profile", icon: Icons.user },
];

export const STYLIST_STATUS_LABEL = {
  confirmed: "Confirmed",
  arrived: "Arrived",
  in_service: "In Service",
  completed: "Completed",
  noshow: "No-show",
  cancelled: "Cancelled",
};
