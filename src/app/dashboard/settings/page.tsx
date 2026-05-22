"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import { Icons } from "@/components/ui/Icons";
import { useProfile } from "@/context/ProfileContext";

const I = {
  ...Icons,
  bellSm: Icons.bell,
};

// ===== TYPES =====
interface SalonInfo {
  name: string;
  area: string;
  type: string;
  city: string;
}

interface WorkingHour {
  open: boolean;
  from: string;
  to: string;
}

interface WorkingHours {
  [key: string]: WorkingHour;
}

interface ServiceItem {
  id: number;
  name: string;
  cat: string;
  duration: number;
  price: number;
  active: boolean;
}

interface StylistItem {
  id: number;
  name: string;
  role: string;
  tone: string;
  commission: number;
}

interface WhatsAppInfo {
  number: string;
  verified: boolean;
  reminder: number;
  autoConfirm: boolean;
  sendOffers: boolean;
}

interface NotificationChannel {
  push: boolean;
  sms: boolean;
  wa: boolean;
}

interface Notifications {
  [key: string]: NotificationChannel;
}

interface AccountInfo {
  name: string;
  email: string;
}

interface SettingsData {
  salon: SalonInfo;
  hours: WorkingHours;
  services: ServiceItem[];
  team: StylistItem[];
  wa: WhatsAppInfo;
  plan: string;
  notifs: Notifications;
  account: AccountInfo;
}

// ===== DATA =====
const DAYS = [
  { id: "mon", name: "Monday" }, { id: "tue", name: "Tuesday" }, { id: "wed", name: "Wednesday" },
  { id: "thu", name: "Thursday" }, { id: "fri", name: "Friday" }, { id: "sat", name: "Saturday" },
  { id: "sun", name: "Sunday" },
];

const INITIAL_DATA: SettingsData = {
  account: { name: "Ravi Varma", email: "ravi@glowsalon.in" },
  salon: { name: "Glow Salon & Spa", area: "Andheri West, near Lokhandwala", type: "Unisex salon", city: "Mumbai" },
  hours: {
    mon: { open: true,  from: "10:00", to: "20:00" },
    tue: { open: true,  from: "10:00", to: "20:00" },
    wed: { open: true,  from: "10:00", to: "20:00" },
    thu: { open: true,  from: "10:00", to: "20:00" },
    fri: { open: true,  from: "10:00", to: "21:00" },
    sat: { open: true,  from: "09:00", to: "21:00" },
    sun: { open: false, from: "10:00", to: "18:00" },
  },
  services: [
    { id: 1, name: "Haircut",       cat: "Hair",  duration: 30, price: 300,  active: true },
    { id: 2, name: "Hair Color",    cat: "Hair",  duration: 90, price: 1800, active: true },
    { id: 3, name: "Hair Spa",      cat: "Hair",  duration: 60, price: 900,  active: true },
    { id: 4, name: "Facial — Gold", cat: "Skin",  duration: 75, price: 1400, active: true },
    { id: 5, name: "Threading",     cat: "Skin",  duration: 15, price: 80,   active: true },
    { id: 6, name: "Manicure",      cat: "Hands", duration: 30, price: 350,  active: true },
    { id: 7, name: "Pedicure",      cat: "Hands", duration: 45, price: 500,  active: false },
  ],
  team: [
    { id: 1, name: "Anjali", role: "Senior stylist · 9 yrs",     tone: "b", commission: 30 },
    { id: 2, name: "Pooja",  role: "Beautician · Skin specialist", tone: "d", commission: 25 },
    { id: 3, name: "Kiran",  role: "Senior stylist · 12 yrs",    tone: "c", commission: 35 },
    { id: 4, name: "Rekha",  role: "Threading & nails · 4 yrs",  tone: "e", commission: 25 },
  ],
  wa: { number: "98xxx 12345", verified: true, reminder: 24, autoConfirm: true, sendOffers: false },
  plan: "salon",
  notifs: {
    newBooking: { push: true,  sms: false, wa: true },
    cancel:     { push: true,  sms: false, wa: true },
    noshow:     { push: true,  sms: false, wa: false },
    daily:      { push: false, sms: false, wa: true },
  },
};

const PLANS = [
  { id: "solo",  name: "Solo",  price: 499,  desc: "For independent stylists" },
  { id: "salon", name: "Salon", price: 999,  desc: "Up to 5 stylists" },
  { id: "chain", name: "Chain", price: 2499, desc: "Multi-branch" },
];

const TABS = [
  { id: "salon",    label: "Salon profile", icon: I.store },
  { id: "services", label: "Services",      icon: I.scissors },
  { id: "team",     label: "Team",          icon: I.team },
  { id: "whatsapp", label: "WhatsApp",      icon: I.wa },
  { id: "plan",     label: "Subscription",  icon: I.card },
  { id: "notifs",   label: "Notifications", icon: I.bellSm },
  { id: "account",  label: "Account",       icon: I.user },
];

// ===== EXPORT COMPONENT =====
export default function SettingsPage() {
  const router = useRouter();
  const { profile, updateProfileInContext } = useProfile();
  const [activeTab, setActiveTab] = useState("salon");
  const [data, setData] = useState<SettingsData>(INITIAL_DATA);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [supabaseSalonId, setSupabaseSalonId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        setLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setLoading(false);
          return;
        }

        setSupabaseUserId(session.user.id);

        const { data: userProfile } = await supabase
          .from("users")
          .select("name, email, role, org_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!userProfile) {
          setLoading(false);
          return;
        }

        const userName = userProfile.name || session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Owner";
        const userEmail = userProfile.email || session.user.email || "";
        const userRole = userProfile.role ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1) : "Owner";
        const initials = userName
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2) || "O";

        let salonName = "GLOW SALON";
        let salonArea = "ANDHERI";
        let salonCity = "MUMBAI";
        let salonType = "Unisex salon";
        let salonHours = INITIAL_DATA.hours;
        let salonWa = INITIAL_DATA.wa.number;

        if (userProfile.org_id) {
          const { data: salon } = await supabase
            .from("salons")
            .select("id, name, area, city, type, hours, wa_number")
            .eq("org_id", userProfile.org_id)
            .eq("is_primary", true)
            .maybeSingle();

          let selectedSalon = salon;
          if (!selectedSalon) {
            const { data: firstSalon } = await supabase
              .from("salons")
              .select("id, name, area, city, type, hours, wa_number")
              .eq("org_id", userProfile.org_id)
              .limit(1)
              .maybeSingle();
            selectedSalon = firstSalon;
          }

          if (selectedSalon) {
            setSupabaseSalonId(selectedSalon.id);
            salonName = selectedSalon.name;
            salonArea = selectedSalon.area || "";
            salonCity = selectedSalon.city || "";
            salonType = selectedSalon.type || "Unisex salon";
            salonHours = selectedSalon.hours ? (selectedSalon.hours as WorkingHours) : INITIAL_DATA.hours;
            salonWa = selectedSalon.wa_number || "";
          }
        }

        // Global profile is handled by the ProfileContext, no need to set it locally.

        setData(prev => ({
          ...prev,
          salon: {
            name: salonName,
            area: salonArea,
            city: salonCity,
            type: salonType,
          },
          hours: salonHours,
          wa: {
            ...prev.wa,
            number: salonWa,
          },
          account: {
            name: userName,
            email: userEmail
          }
        }));

      } catch (err) {
        console.error("Error loading settings from Supabase:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const update = (next: SettingsData) => {
    setData(next);
    setDirty(true);
  };

  const handleSave = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase && supabaseUserId) {
      setFlash("Saving changes to database...");
      try {
        if (data.account) {
          const { error: userError } = await supabase
            .from("users")
            .update({ name: data.account.name })
            .eq("id", supabaseUserId);
          if (userError) throw userError;
        }

        if (supabaseSalonId) {
          const { error: salonError } = await supabase
            .from("salons")
            .update({
              name: data.salon.name,
              area: data.salon.area,
              city: data.salon.city,
              type: data.salon.type,
              hours: data.hours,
              wa_number: data.wa.number
            })
            .eq("id", supabaseSalonId);
          if (salonError) throw salonError;
        }

        if (data.account) {
          updateProfileInContext({
            name: data.account.name,
            salonName: data.salon.name.toUpperCase(),
            salonArea: data.salon.area.toUpperCase(),
          });
        }

        setFlash("Changes saved successfully!");
        setTimeout(() => setFlash(null), 1800);
      } catch (err) {
        console.error("Error saving settings to Supabase:", err);
        setFlash("Failed to save changes.");
        setTimeout(() => setFlash(null), 1800);
        return;
      }
    } else {
      setFlash("Saved (local preview only)");
      setTimeout(() => setFlash(null), 1800);
    }

    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const discard = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="app animate-fade-in">
        <Header title="Settings" subtitle="LOADING SETTINGS..." />

        <main className="app-main" style={{ paddingBottom: 120, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Horizontal Navigation Skeleton */}
          <div
            className="tabs-nav"
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 6,
              borderBottom: "1px solid var(--line)",
              scrollbarWidth: "none"
            }}
          >
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = tab.id === "salon";
              return (
                <button
                  key={tab.id}
                  disabled
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: active ? "1px solid var(--teal)" : "1px solid transparent",
                    background: active ? "var(--teal-soft)" : "transparent",
                    color: active ? "var(--teal)" : "var(--ink-3)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "not-allowed",
                    whiteSpace: "nowrap",
                    opacity: active ? 0.8 : 0.5
                  }}
                >
                  <Icon style={{ width: 14, height: 14 }} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Panel Skeleton */}
          <div className="tab-panel" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                <div className="pulse" style={{ width: 120, height: 18, borderRadius: 4 }} />
                <div className="pulse" style={{ width: 240, height: 12, borderRadius: 3, marginTop: 6 }} />
              </div>

              {/* Form Card Skeleton */}
              <div className="card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="pulse" style={{ width: 80, height: 10, borderRadius: 3 }} />
                    <div className="pulse" style={{ width: "100%", height: 38, borderRadius: 8 }} />
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="pulse" style={{ width: 40, height: 10, borderRadius: 3 }} />
                    <div className="pulse" style={{ width: "100%", height: 38, borderRadius: 8 }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="pulse" style={{ width: 80, height: 10, borderRadius: 3 }} />
                    <div className="pulse" style={{ width: "100%", height: 38, borderRadius: 8 }} />
                  </div>
                </div>
              </div>

              {/* Hours Title Skeleton */}
              <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10, marginTop: 10 }}>
                <div className="pulse" style={{ width: 120, height: 18, borderRadius: 4 }} />
                <div className="pulse" style={{ width: 280, height: 12, borderRadius: 3, marginTop: 6 }} />
              </div>

              {/* Hours Card Skeleton */}
              <div className="card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 4px", borderBottom: i < 7 ? "1px solid var(--bg-2)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="pulse" style={{ width: 14, height: 14, borderRadius: 3 }} />
                      <div className="pulse" style={{ width: 60, height: 14, borderRadius: 4 }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div className="pulse" style={{ width: 50, height: 24, borderRadius: 6 }} />
                      <div className="pulse" style={{ width: 12, height: 10, borderRadius: 2 }} />
                      <div className="pulse" style={{ width: 50, height: 24, borderRadius: 6 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app animate-fade-in">
      <Header title="Settings" subtitle="CONFIGURE YOUR SALON" />

      {/* Main Content Area */}
      <main className="app-main" style={{ paddingBottom: 120, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Horizontal Navigation on Mobile-first UI */}
        <div
          className="tabs-nav"
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 6,
            borderBottom: "1px solid var(--line)",
            scrollbarWidth: "none"
          }}
        >
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: active ? "1px solid var(--teal)" : "1px solid transparent",
                  background: active ? "var(--teal-soft)" : "transparent",
                  color: active ? "var(--teal)" : "var(--ink-2)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "background 0.18s ease, border-color 0.18s ease, color 0.18s ease"
                }}
              >
                <Icon style={{ width: 14, height: 14 }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        <div className="tab-panel">
          {/* SALON PROFILE TAB */}
          <div className={`tab-pane-wrapper ${activeTab === "salon" ? "active" : ""}`}>
            <div className="tab-pane-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Salon profile</h2>
                <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, margin: 0 }}>What your customers see on the booking page.</p>
              </div>

              <div className="card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-3)" }}>Salon name</label>
                  <input
                    value={data.salon.name}
                    onChange={e => update({ ...data, salon: { ...data.salon, name: e.target.value } })}
                    style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-3)" }}>Area / Locality</label>
                  <input
                    value={data.salon.area}
                    onChange={e => update({ ...data, salon: { ...data.salon, area: e.target.value } })}
                    style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-3)" }}>City</label>
                    <input
                      value={data.salon.city}
                      onChange={e => update({ ...data, salon: { ...data.salon, city: e.target.value } })}
                      style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-3)" }}>Salon type</label>
                    <select
                      value={data.salon.type}
                      onChange={e => update({ ...data, salon: { ...data.salon, type: e.target.value } })}
                      style={{ height: 40, border: "1px solid var(--line-2)", borderRadius: 8, padding: "0 10px", outline: 0, fontSize: 14, background: "#fff" }}
                    >
                      <option>Unisex salon</option>
                      <option>Ladies salon</option>
                      <option>Men&apos;s salon</option>
                      <option>Barbershop</option>
                      <option>Beauty parlour</option>
                      <option>Spa</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10, marginTop: 10 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Working hours</h2>
                <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, margin: 0 }}>Customers will only see slots inside these hours.</p>
              </div>

              <div className="card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {DAYS.map(d => {
                  const h = data.hours[d.id];
                  return (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 4px", borderBottom: "1px solid var(--bg-2)" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
                        <input
                          type="checkbox"
                          checked={h.open}
                          onChange={e => update({ ...data, hours: { ...data.hours, [d.id]: { ...h, open: e.target.checked } } })}
                        />
                        <span>{d.name}</span>
                      </label>
                      {h.open ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            className="ob-time"
                            value={h.from}
                            onChange={e => update({ ...data, hours: { ...data.hours, [d.id]: { ...h, from: e.target.value } } })}
                            style={{ width: 66, padding: "4px 8px", border: "1px solid var(--line-2)", borderRadius: 6, fontSize: 13, textAlign: "center" }}
                          />
                          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>to</span>
                          <input
                            className="ob-time"
                            value={h.to}
                            onChange={e => update({ ...data, hours: { ...data.hours, [d.id]: { ...h, to: e.target.value } } })}
                            style={{ width: 66, padding: "4px 8px", border: "1px solid var(--line-2)", borderRadius: 6, fontSize: 13, textAlign: "center" }}
                          />
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--rose)", fontWeight: 500 }}>Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SERVICES TAB */}
          <div className={`tab-pane-wrapper ${activeTab === "services" ? "active" : ""}`}>
            <div className="tab-pane-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Services</h2>
                  <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, margin: 0 }}>
                    {data.services.filter(s => s.active).length} active · {data.services.length} total
                  </p>
                </div>
                <button
                  onClick={() => handleSave()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "var(--teal)",
                    color: "#fff",
                    border: 0,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer"
                  }}
                >
                  <I.plus /> Add service
                </button>
              </div>

              <div className="card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 0, overflow: "hidden" }}>
                {["Hair", "Skin", "Hands"].map(cat => {
                  const items = data.services.filter(s => s.cat === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat} style={{ borderBottom: "1px solid var(--line)" }}>
                      <div style={{ background: "var(--bg-2)", padding: "8px 16px", fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", justifyContent: "space-between" }}>
                        <span>{cat} Services</span>
                        <span>{items.length}</span>
                      </div>
                      {items.map(s => (
                        <div
                          key={s.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "12px 16px",
                            borderBottom: "1px solid var(--bg-2)",
                            opacity: s.active ? 1 : 0.6
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                              {s.duration} min · ₹{s.price} {!s.active && " · Hidden"}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <input
                              type="checkbox"
                              checked={s.active}
                              onChange={() => {
                                const list = data.services.map(item => item.id === s.id ? { ...item, active: !item.active } : item);
                                update({ ...data, services: list });
                              }}
                              style={{ width: 16, height: 16 }}
                            />
                            <button
                              onClick={() => {
                                const list = data.services.filter(item => item.id !== s.id);
                                update({ ...data, services: list });
                              }}
                              style={{ border: 0, background: "transparent", color: "var(--rose)", cursor: "pointer" }}
                            >
                              <I.trash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* TEAM TAB */}
          <div className={`tab-pane-wrapper ${activeTab === "team" ? "active" : ""}`}>
            <div className="tab-pane-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Team</h2>
                  <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, margin: 0 }}>{data.team.length} stylists listed</p>
                </div>
                <button
                  onClick={() => handleSave()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "var(--teal)",
                    color: "#fff",
                    border: 0,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer"
                  }}
                >
                  <I.plus /> Add stylist
                </button>
              </div>

              <div className="card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 0 }}>
                {data.team.map((s, index) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "14px 16px",
                      borderBottom: index === data.team.length - 1 ? 0 : "1px solid var(--line)"
                    }}
                  >
                    <div
                      className={`avatar md tone-${s.tone}`}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        marginRight: 12,
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 600,
                        fontSize: 14,
                        background: s.tone === "a" ? "var(--teal-soft)" : s.tone === "b" ? "var(--amber-soft)" : s.tone === "c" ? "var(--blue-soft)" : s.tone === "d" ? "var(--green-soft)" : s.tone === "e" ? "var(--rose-soft)" : "var(--bg-2)",
                        color: s.tone === "a" ? "var(--teal)" : s.tone === "b" ? "var(--amber-ink)" : s.tone === "c" ? "var(--blue)" : s.tone === "d" ? "var(--green)" : s.tone === "e" ? "var(--rose)" : "var(--ink-2)"
                      }}
                    >
                      {s.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{s.role}</div>
                    </div>
                    <div style={{ marginRight: 16, textAlign: "right" }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.commission}%</div>
                      <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase" }}>Commission</div>
                    </div>
                    <button
                      onClick={() => {
                        const list = data.team.filter(item => item.id !== s.id);
                        update({ ...data, team: list });
                      }}
                      style={{ border: 0, background: "transparent", color: "var(--rose)", cursor: "pointer" }}
                    >
                      <I.trash />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* WHATSAPP TAB */}
          <div className={`tab-pane-wrapper ${activeTab === "whatsapp" ? "active" : ""}`}>
            <div className="tab-pane-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>WhatsApp Integration</h2>
                <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, margin: 0 }}>Automate bookings, notifications, and reminders.</p>
              </div>

              <div className="card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--wa-soft)", color: "var(--wa)", display: "grid", placeItems: "center" }}>
                      <I.wa style={{ width: 20, height: 20 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>+91 {data.wa.number}</div>
                      <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 500, marginTop: 2 }}>Verified &amp; active</div>
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => handleSave()} style={{ height: 32, fontSize: 12 }}>Configure</button>
                </div>
              </div>

              <div className="card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Auto-confirm bookings</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>Instantly reply with confirmation details.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={data.wa.autoConfirm}
                    onChange={e => update({ ...data, wa: { ...data.wa, autoConfirm: e.target.checked } })}
                    style={{ width: 16, height: 16 }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--bg-2)", paddingTop: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Send reminders before booking</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>Studies show reminders reduce no-shows by 60%.</div>
                  </div>
                  <select
                    value={data.wa.reminder}
                    onChange={e => update({ ...data, wa: { ...data.wa, reminder: parseInt(e.target.value) } })}
                    style={{ padding: "4px 8px", border: "1px solid var(--line-2)", borderRadius: 6, background: "#fff" }}
                  >
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* PLAN TAB */}
          <div className={`tab-pane-wrapper ${activeTab === "plan" ? "active" : ""}`}>
            <div className="tab-pane-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Plan &amp; Subscription</h2>
                <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, margin: 0 }}>Manage your payments and plan tiers.</p>
              </div>

              <div className="card" style={{ background: "var(--teal-soft)", border: "1px solid var(--teal-soft-2)", borderRadius: "var(--radius)", padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="badge confirmed no-dot" style={{ fontSize: 10, background: "var(--teal)", color: "#fff", padding: "2px 8px", borderRadius: 999 }}>ACTIVE</span>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--teal-ink)", marginTop: 8 }}>₹999<span style={{ fontSize: 12, fontWeight: 400 }}> / month</span></div>
                  <div style={{ fontSize: 12, color: "var(--teal-ink)", opacity: 0.8, marginTop: 4 }}>Salon Plan · Renewed on 1st of every month</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => handleSave()} style={{ background: "#fff", color: "var(--teal)", fontSize: 12 }}>Manage</button>
              </div>
            </div>
          </div>

          {/* NOTIFICATION TAB */}
          <div className={`tab-pane-wrapper ${activeTab === "notifs" ? "active" : ""}`}>
            <div className="tab-pane-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Notifications</h2>
                <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, margin: 0 }}>Choose how you would like to be alerted.</p>
              </div>

              <div className="card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>New booking notification</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>Get notified when a new appointment is booked.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={data.notifs.newBooking.wa}
                    onChange={e => update({ ...data, notifs: { ...data.notifs, newBooking: { ...data.notifs.newBooking, wa: e.target.checked } } })}
                    style={{ width: 16, height: 16 }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--bg-2)", paddingTop: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Booking cancellations</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>Alert me immediately when client cancels.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={data.notifs.cancel.wa}
                    onChange={e => update({ ...data, notifs: { ...data.notifs, cancel: { ...data.notifs.cancel, wa: e.target.checked } } })}
                    style={{ width: 16, height: 16 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ACCOUNT TAB */}
          <div className={`tab-pane-wrapper ${activeTab === "account" ? "active" : ""}`}>
            <div className="tab-pane-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Your Account</h2>
                <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, margin: 0 }}>Manage your email, log out, or delete profile.</p>
              </div>

              <div className="card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)" }}>Name</label>
                  <input
                    value={data.account?.name || ""}
                    onChange={e => update({ ...data, account: { ...data.account, name: e.target.value } })}
                    style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, fontSize: 14 }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)" }}>Email address</label>
                  <input
                    value={data.account?.email || ""}
                    onChange={e => update({ ...data, account: { ...data.account, email: e.target.value } })}
                    style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, fontSize: 14 }}
                    disabled={true}
                  />
                </div>
              </div>

              <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10, marginTop: 10 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--rose)", margin: 0 }}>Danger zone</h2>
                <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, margin: 0 }}>Irreversible actions regarding your account.</p>
              </div>

              <div className="card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Sign out</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>Log out from this device.</div>
                  </div>
                  <button
                    onClick={() => {
                      setFlash("Signing out...");
                      setTimeout(() => {
                        router.push("/");
                      }, 1000);
                    }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "1px solid var(--line-2)",
                      background: "#fff",
                      color: "var(--rose)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Unsaved Changes Bar */}
      {dirty && (
        <div
          className="set-savebar"
          style={{
            position: "fixed",
            bottom: 76,
            left: 0,
            right: 0,
            background: "#fff",
            borderTop: "1px solid var(--line)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 45
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>You have unsaved changes.</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={discard} style={{ height: 32, fontSize: 13, cursor: "pointer" }}>Discard</button>
            <button className="btn btn-primary" onClick={handleSave} style={{ height: 32, fontSize: 13, background: "var(--teal)", color: "#fff", border: 0, padding: "0 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Save</button>
          </div>
        </div>
      )}

      {/* Save Success Alert */}
      {saved && (
        <div
          style={{
            position: "fixed",
            bottom: 96,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--green)",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            zIndex: 60,
            boxShadow: "0 12px 24px -10px rgba(0,0,0,0.3)",
          }}
        >
          ✓ Changes saved successfully
        </div>
      )}



      {/* Flash message */}
      {flash && (
        <div
          style={{
            position: "fixed",
            bottom: 120,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            zIndex: 60,
            boxShadow: "0 12px 24px -10px rgba(0,0,0,0.3)",
          }}
        >
          {flash}
        </div>
      )}
    </div>
  );
}
