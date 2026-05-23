"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Icons } from "@/components/ui/Icons";
import { useProfile } from "@/context/ProfileContext";
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
  const [flash, setFlash] = useState<string | null>(null);
  
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
    setFlash(nextState ? "Salon marked OPEN for today" : "Salon marked CLOSED for today");
  };

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1800);
    return () => clearTimeout(t);
  }, [flash]);


  return (
    <>
      <div className="bg-bg border-b border-line">
        <div className="max-w-[1200px] mx-auto px-8 py-[22px] flex items-center justify-between gap-6">
          <Link href="/dashboard" className="flex items-center gap-[10px] font-semibold tracking-[-0.01em] text-base" style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}>
            <div className="w-7 h-7 rounded-lg bg-teal grid place-items-center text-white font-bold text-sm">{brandMark}</div>
            <span className="font-semibold tracking-[-0.01em] text-base">ChairBook</span>
            <span className="inline-flex items-center gap-[5px] text-[10px] font-medium px-[9px] py-[3px] rounded-full tracking-[0.05em] leading-[1.4] whitespace-nowrap font-mono text-ink-2 bg-bg-2 no-underline">
              <span className="hidden"></span>
              {profile.salonName}{profile.salonArea ? ` · ${profile.salonArea}` : ""}
            </span>
          </Link>
          <div className="flex flex-col gap-[2px]">
            <div className="text-[22px] font-semibold tracking-[-0.015em]">{title}</div>
            {subtitle && <div className="text-[13px] text-ink-3 font-mono">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-[10px]">
            {actions}
            {showSearch && (
              <button className="w-10 h-10 rounded-[10px] border border-line bg-white grid place-items-center text-ink-2 cursor-pointer hover:bg-bg-2 transition-all duration-150" aria-label="Search">
                <Icons.search />
              </button>
            )}
            <Link href="/dashboard/notifications" aria-label="Notifications" className="w-10 h-10 rounded-[10px] border border-line bg-white grid place-items-center text-ink-2 cursor-pointer hover:bg-bg-2 transition-all duration-150" style={{ position: "relative", display: "inline-grid", placeItems: "center", textDecoration: "none", color: "inherit" }}>
              <Icons.bell />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber border-2 border-white box-content"></span>
            </Link>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                style={{
                  marginLeft: 6,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: "bold",
                  cursor: "pointer",
                  border: profileMenuOpen ? "2px solid var(--teal)" : "none",
                  outline: "none",
                  padding: 0,
                  width: 30,
                  height: 30,
                  fontSize: 12,
                }}
                className="bg-teal-soft text-teal"
              >
                {profile.initials}
              </button>
              {profileMenuOpen && (
                <>
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 998,
                      background: "transparent",
                    }}
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: 8,
                      width: 280,
                      background: "#fff",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius)",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 16px -6px rgba(0,0,0,0.05)",
                      zIndex: 999,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      animation: "pop .15s ease-out",
                      textAlign: "left",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
                      <div className="avatar tone-b" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--teal-soft)", color: "var(--teal)", display: "grid", placeItems: "center", fontWeight: "bold", fontSize: 16 }}>
                        {profile.initials}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{profile.name}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{profile.role} · {profile.salonArea || "Salon"}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>Salon Status</span>
                        <span style={{ fontSize: 10, color: "var(--ink-3)" }}>{salonOpen ? "Accepting appointments" : "Closed for today"}</span>
                      </div>
                      <button
                        onClick={toggleSalonOpen}
                        style={{
                          border: 0,
                          background: salonOpen ? "var(--teal)" : "var(--ink-4)",
                          color: "#fff",
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                      >
                        {salonOpen ? "OPEN" : "CLOSED"}
                      </button>
                    </div>

                    <div style={{ background: "var(--bg-2)", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-2)" }}>
                        <span style={{ fontWeight: 500 }}>Today's target</span>
                        <span style={{ fontWeight: 600 }}>₹{todayRevenue.toLocaleString("en-IN")} / ₹{dailyTarget.toLocaleString("en-IN")}</span>
                      </div>
                      <div style={{ width: "100%", height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min((todayRevenue / dailyTarget) * 100, 100)}%`, height: "100%", background: "var(--teal)", borderRadius: 3 }} />
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--ink-2)",
                          textDecoration: "none",
                        }}
                      >
                        <Icons.settings />
                        Settings & preferences
                      </Link>
                    </div>

                    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                      <Link
                        href="/signin"
                        onClick={() => setProfileMenuOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--rose)",
                          textDecoration: "none",
                        }}
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
        <div
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            zIndex: 9999,
            boxShadow: "0 12px 24px -10px rgba(0,0,0,0.3)",
            animation: "pop .2s",
          }}
        >
          {flash}
        </div>
      )}
    </>
  );
}
