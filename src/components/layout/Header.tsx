"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Icons } from "@/components/ui/Icons";
import { useProfile } from "@/context/ProfileContext";
import { useFlash } from "@/hooks";
import type { HeaderProps } from "@/types";

export default function Header({
  title,
  subtitle,
  brandMark = "C",
  todayRevenue = 4200,
  dailyTarget = 6000,
  showSearch = false,
  actions,
}: HeaderProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [salonOpen, setSalonOpen] = useState(true);
  const { flash, show: showFlash } = useFlash(1800);
  
  const { profile } = useProfile();

  // Sync salon status with localStorage
  useEffect(() => {
    const status = localStorage.getItem("cb_salon_open");
    if (status !== null) {
      setSalonOpen(status === "true");
    }
  }, []);

  const toggleSalonOpen = () => {
    const nextState = !salonOpen;
    setSalonOpen(nextState);
    localStorage.setItem("cb_salon_open", String(nextState));
    showFlash(nextState ? "Salon marked OPEN for today" : "Salon marked CLOSED for today");
  };


  return (
    <>
      <div className="bg-bg border-b border-line">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-4 md:py-[22px] flex flex-wrap md:flex-nowrap items-center justify-between gap-4 md:gap-6">
          <Link href="/dashboard" className="flex items-center gap-[10px] font-semibold tracking-[-0.01em] text-base no-underline text-inherit cursor-pointer order-1 w-auto">
            <div className="w-7 h-7 rounded-lg bg-teal grid place-items-center text-white font-bold text-sm">{brandMark}</div>
            <span className="font-semibold tracking-[-0.01em] text-base">ChairBook</span>
            <span className="hidden sm:inline-flex items-center gap-[5px] text-[10px] font-medium px-[9px] py-[3px] rounded-full tracking-[0.05em] leading-[1.4] whitespace-nowrap font-mono text-ink-2 bg-bg-2 no-underline">
              {profile.salonName}{profile.salonArea ? ` · ${profile.salonArea}` : ""}
            </span>
          </Link>
          <div className="flex flex-col gap-[2px] w-full md:w-auto order-3 md:order-2 md:text-center mt-1 md:mt-0">
            <div className="text-[20px] md:text-[22px] font-semibold tracking-[-0.015em]">{title}</div>
            {subtitle && <div className="text-[12px] md:text-[13px] text-ink-3 font-mono">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-[10px] order-2 md:order-3 w-auto">
            {actions}
            {showSearch && (
              <button className="w-10 h-10 rounded-[10px] border border-line bg-white grid place-items-center text-ink-2 cursor-pointer hover:bg-bg-2 transition-all duration-150" aria-label="Search">
                <Icons.search />
              </button>
            )}
            <Link href="/dashboard/notifications" aria-label="Notifications" className="w-10 h-10 rounded-[10px] border border-line bg-white grid place-items-center text-ink-2 cursor-pointer hover:bg-bg-2 transition-all duration-150 relative inline-grid no-underline text-inherit">
              <Icons.bell />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber border-2 border-white box-content"></span>
            </Link>
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className={`ml-1.5 rounded-full grid place-items-center font-bold cursor-pointer outline-none p-0 w-[30px] h-[30px] text-xs bg-teal-soft text-teal border-2 ${profileMenuOpen ? 'border-teal' : 'border-transparent'}`}
              >
                {profile.initials}
              </button>
              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[998] bg-transparent"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div
                    className="absolute top-full right-0 mt-2 w-[280px] bg-white border border-line rounded-[var(--radius)] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_16px_-6px_rgba(0,0,0,0.05)] z-[999] p-4 flex flex-col gap-3 animate-[pop_0.15s_ease-out] text-left"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-3 pb-3 border-b border-line">
                      <div className="avatar tone-b w-10 h-10 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] grid place-items-center font-bold text-base">
                        {profile.initials}
                      </div>
                      <div className="flex flex-col gap-[2px]">
                        <div className="font-semibold text-sm text-[var(--ink)]">{profile.name}</div>
                        <div className="text-[11px] text-[var(--ink-3)]">{profile.role} · {profile.salonArea || "Salon"}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[var(--ink)]">Salon Status</span>
                        <span className="text-[10px] text-[var(--ink-3)]">{salonOpen ? "Accepting appointments" : "Closed for today"}</span>
                      </div>
                      <button
                        onClick={toggleSalonOpen}
                        className={`border-0 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors duration-200 ${salonOpen ? 'bg-[var(--teal)]' : 'bg-[var(--ink-4)]'}`}
                      >
                        {salonOpen ? "OPEN" : "CLOSED"}
                      </button>
                    </div>

                    <div className="bg-[var(--bg-2)] rounded-[10px] p-2.5 flex flex-col gap-1.5">
                      <div className="flex justify-between text-[11px] text-[var(--ink-2)]">
                        <span className="font-medium">Today's target</span>
                        <span className="font-semibold">₹{todayRevenue.toLocaleString("en-IN")} / ₹{dailyTarget.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="w-full h-1.5 bg-[var(--line)] rounded-[3px] overflow-hidden">
                        <div className="h-full bg-[var(--teal)] rounded-[3px]" style={{ width: `${Math.min((todayRevenue / dailyTarget) * 100, 100)}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-[2px]">
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-sm)] text-xs font-medium text-[var(--ink-2)] no-underline"
                      >
                        <Icons.settings />
                        Settings & preferences
                      </Link>
                    </div>

                    <div className="border-t border-line pt-2">
                      <Link
                        href="/signin"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--rose)] no-underline"
                      >
                        <Icons.logout />
                        Log out
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {flash && (
        <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 bg-[var(--ink)] text-white px-4 py-2.5 rounded-[10px] text-xs z-[9999] shadow-[0_12px_24px_-10px_rgba(0,0,0,0.3)] animate-[pop_0.2s_ease-out]">
          {flash}
        </div>
      )}
    </>
  );
}
