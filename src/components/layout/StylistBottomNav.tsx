"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { stylistNavItems } from "@/constants/stylist";

export default function StylistBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {stylistNavItems.map((item) => {
        const Icon = item.icon;
        const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={`bn-item ${active ? "active" : ""}`}>
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
