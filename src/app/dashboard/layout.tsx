"use client";

import React from "react";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";
import { ProfileProvider } from "@/context/ProfileContext";
import { ToastProvider } from "@/context/ToastContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Show bottom navigation only on these specific main tab routes
  const mainTabRoutes = [
    "/dashboard",
    "/dashboard/bookings",
    "/dashboard/block-time",
    "/dashboard/customers",
    "/dashboard/revenue",
    "/dashboard/settings",
  ];

  const shouldShowNav = pathname ? mainTabRoutes.includes(pathname) : false;

  return (
    <ProfileProvider>
      <ToastProvider>
        {children}
        {shouldShowNav && <BottomNav />}
      </ToastProvider>
    </ProfileProvider>
  );
}
