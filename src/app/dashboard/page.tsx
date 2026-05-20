"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

// ===== TYPES =====
interface Stylist {
  id: string;
  name: string;
  tone: string;
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface Appointment {
  id: number;
  time: string;
  duration: number;
  customer: string;
  initials: string;
  tone: string;
  service: string;
  stylist: string;
  price: number;
  status: "confirmed" | "arrived" | "completed" | "noshow";
  visits: number;
  phone: string;
  note: string;
}

// ===== ICONS =====
const I = {
  home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/>
    </svg>
  ),
  calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M8 3v4M16 3v4M3 10h18"/>
    </svg>
  ),
  users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/>
      <circle cx="10" cy="7" r="4"/>
      <path d="M21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
    </svg>
  ),
  bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>
    </svg>
  ),
  search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <circle cx="11" cy="11" r="7"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  chev: ({ style }: { style?: React.CSSProperties }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
  rupee: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <path d="M6 3h12M6 8h12M6 13c8 0 8-10 0-10M6 13l8 8"/>
    </svg>
  ),
  cal2: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M8 3v4M16 3v4M3 10h18"/>
    </svg>
  ),
  alert: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <path d="M12 9v4M12 17h.01"/>
      <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"/>
    </svg>
  ),
  wa: ({ style }: { style?: React.CSSProperties }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.2 3.2.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.3c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
    </svg>
  ),
  x: ({ style }: { style?: React.CSSProperties }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
};

// ===== CONSTANTS =====
const STYLISTS: Stylist[] = [
  { id: "all", name: "All stylists", tone: "" },
  { id: "anjali", name: "Anjali", tone: "b" },
  { id: "pooja", name: "Pooja", tone: "d" },
  { id: "kiran", name: "Kiran", tone: "c" },
  { id: "rekha", name: "Rekha", tone: "e" },
];

const SERVICES: Service[] = [
  { id: "s1", name: "Haircut", duration: 30, price: 300 },
  { id: "s2", name: "Hair Color", duration: 90, price: 1800 },
  { id: "s3", name: "Hair Spa", duration: 60, price: 900 },
  { id: "s4", name: "Threading", duration: 15, price: 80 },
  { id: "s5", name: "Facial — Classic", duration: 45, price: 700 },
  { id: "s6", name: "Manicure", duration: 30, price: 350 },
  { id: "s7", name: "Pedicure", duration: 45, price: 500 },
  { id: "s8", name: "Beard Trim", duration: 20, price: 200 },
];

const INITIAL_APPTS: Appointment[] = [
  { id: 1, time: "09:30", duration: 30, customer: "Priya Sharma", initials: "PS", tone: "b", service: "Haircut", stylist: "anjali", price: 300, status: "completed", visits: 12, phone: "+91 98xxx 12345", note: "Prefers shorter on the sides." },
  { id: 2, time: "10:15", duration: 45, customer: "Meera Iyer", initials: "MI", tone: "c", service: "Facial — Classic", stylist: "pooja", price: 700, status: "completed", visits: 5, phone: "+91 98xxx 22119", note: "Sensitive skin on cheeks." },
  { id: 3, time: "11:00", duration: 90, customer: "Kavya Reddy", initials: "KR", tone: "e", service: "Hair Color", stylist: "anjali", price: 1800, status: "arrived", visits: 8, phone: "+91 98xxx 30247", note: "Color: chestnut brown, no ammonia." },
  { id: 4, time: "12:00", duration: 30, customer: "Sneha P.", initials: "SP", tone: "d", service: "Threading", stylist: "rekha", price: 80, status: "confirmed", visits: 3, phone: "+91 98xxx 41902", note: "" },
  { id: 5, time: "12:45", duration: 60, customer: "Anita Verma", initials: "AV", tone: "a", service: "Hair Spa", stylist: "pooja", price: 900, status: "confirmed", visits: 22, phone: "+91 98xxx 50819", note: "Regular — Saturday lunchtime slot." },
  { id: 6, time: "14:30", duration: 30, customer: "Lakshmi N.", initials: "LN", tone: "f", service: "Manicure", stylist: "rekha", price: 350, status: "confirmed", visits: 1, phone: "+91 98xxx 60372", note: "First visit — referred by Anita V." },
  { id: 7, time: "15:30", duration: 45, customer: "Divya Menon", initials: "DM", tone: "e", service: "Pedicure", stylist: "kiran", price: 500, status: "noshow", visits: 4, phone: "+91 98xxx 72184", note: "" },
  { id: 8, time: "16:30", duration: 30, customer: "Ravi K.", initials: "RK", tone: "c", service: "Beard Trim", stylist: "kiran", price: 200, status: "confirmed", visits: 7, phone: "+91 98xxx 80091", note: "" },
];

const STATUS_LABEL = { confirmed: "Confirmed", arrived: "Arrived", completed: "Completed", noshow: "No-show" };
const STATUS_ORDER: ("confirmed" | "arrived" | "completed" | "noshow")[] = ["confirmed", "arrived", "completed", "noshow"];
const NOW_TIME_MIN = 13 * 60 + 14; // 1:14 PM simulated "now"

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const stylistById = (id: string) => STYLISTS.find((s) => s.id === id) || STYLISTS[1];

// ===== MAIN DASHBOARD PAGE =====
export default function DashboardPage() {
  const [appts, setAppts] = useState<Appointment[]>(INITIAL_APPTS);
  const [expandedId, setExpandedId] = useState<number | null>(3); // Active one starts expanded
  const [filter, setFilter] = useState("all");
  const [day, setDay] = useState("today");
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // Layout settings
  const density = "compact";
  const showNowLine = true;

  // Filters & Sorting
  const filtered = useMemo(() => {
    const list = filter === "all" ? appts : appts.filter((a) => a.stylist === filter);
    return [...list].sort((a, b) => toMin(a.time) - toMin(b.time));
  }, [appts, filter]);

  // Metrics
  const todayRevenue = appts.filter((a) => a.status === "completed" || a.status === "arrived").reduce((s, a) => s + a.price, 0);
  const totalAppts = appts.length;
  const noShows = appts.filter((a) => a.status === "noshow").length;

  const updateStatus = (id: number, status: "confirmed" | "arrived" | "completed" | "noshow") => {
    setAppts(appts.map((a) => (a.id === id ? { ...a, status } : a)));
    setFlash(`Status updated to ${STATUS_LABEL[status]}`);
    setTimeout(() => setFlash(null), 1800);
  };

  const sendWA = (a: Appointment) => {
    setFlash(`WhatsApp opened for ${a.customer}`);
    setTimeout(() => setFlash(null), 1800);
  };

  const addWalkIn = ({ name, phone, svc, stylistId }: { name: string; phone: string; svc: Service; stylistId: string }) => {
    const initials = name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const tones = ["a", "b", "c", "d", "e", "f"];
    const tone = tones[name.length % tones.length];

    const newAppt: Appointment = {
      id: Math.max(...appts.map((a) => a.id), 0) + 1,
      time: "13:30", // Walk-in is placed shortly after current simulated time
      duration: svc.duration,
      customer: name,
      initials,
      tone,
      service: svc.name,
      stylist: stylistId,
      price: svc.price,
      status: "arrived",
      visits: 0,
      phone: phone || "+91 99xxx xxxxx",
      note: "Walk-in registration",
    };

    setAppts([...appts, newAppt]);
    setFlash(`${name} added to schedule`);
    setTimeout(() => setFlash(null), 2000);
  };

  const nowIdx = filtered.findIndex((a) => toMin(a.time) > NOW_TIME_MIN);

  return (
    <div className={`app density-${density}`}>
      {/* Top Navbar */}
      <div className="app-top">
        <div className="app-top-inner">
          <div className="brand">
            <div className="brand-mark">C</div>
            <span className="brand-text">ChairBook</span>
            <span className="badge neutral no-dot mono salon-tag" style={{ marginLeft: 12, fontSize: 10, letterSpacing: "0.05em" }}>
              GLOW SALON · ANDHERI
            </span>
          </div>
          <div className="greeting">
            <div className="h">Good morning, Ravi 👋</div>
            <div className="d">SUN · 19 MAY 2026 · 01:14 PM</div>
          </div>
          <div className="top-actions">
            <button className="icon-btn" aria-label="Search">
              <I.search />
            </button>
            <button className="icon-btn" aria-label="Notifications">
              <I.bell />
              <span className="ind"></span>
            </button>
            <div className="avatar sm tone-b" style={{ marginLeft: 6, borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: "bold" }}>
              R
            </div>
          </div>
        </div>
      </div>

      <main className="app-main">
        {/* Metrics Grid */}
        <div className="metrics">
          <MetricCard
            label="Today's revenue"
            prefix="₹"
            value={todayRevenue.toLocaleString("en-IN")}
            delta="22%"
            deltaTone="up"
            icon={<I.rupee />}
            spark={<MiniSpark points={[12, 18, 14, 22, 16, 28, 32]} tone="teal" />}
          />
          <MetricCard
            label="Appointments today"
            value={totalAppts}
            suffix=" booked"
            delta="2 more"
            deltaTone="up"
            icon={<I.cal2 />}
            spark={<MiniSpark points={[5, 7, 6, 8, 9, 7, 8]} tone="teal" />}
          />
          <MetricCard
            label="No-shows"
            value={noShows}
            delta={noShows === 0 ? "clean week" : "1 vs. yesterday"}
            deltaTone={noShows > 0 ? "down" : "up"}
            icon={<I.alert />}
            spark={<MiniSpark points={[1, 0, 2, 1, 0, 1, 1]} tone="amber" />}
          />
        </div>

        {/* Schedule Header */}
        <div className="section-head">
          <div className="l">
            <h2>Today's schedule</h2>
            <span className="count">{filtered.length} appointments</span>
          </div>
          <div className="r">
            <div className="toggle">
              <button className={day === "today" ? "on" : ""} onClick={() => setDay("today")}>
                Today
              </button>
              <button className={day === "tomorrow" ? "on" : ""} onClick={() => setDay("tomorrow")}>
                Tomorrow
              </button>
            </div>
          </div>
        </div>

        {/* Stylist Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {STYLISTS.map((s) => (
            <button key={s.id} className={`filter-chip ${filter === s.id ? "on" : ""}`} onClick={() => setFilter(s.id)}>
              {s.id !== "all" && (
                <span className={`avatar sm tone-${s.tone}`} style={{ width: 18, height: 18, fontSize: 9, border: 0, borderRadius: "50%", display: "inline-grid", placeItems: "center", fontWeight: "bold", marginRight: 4 }}>
                  {s.name[0]}
                </span>
              )}
              {s.name}
              {s.id !== "all" && (
                <span style={{ color: filter === s.id ? "rgba(255,255,255,0.6)" : "var(--ink-4)", fontSize: 11, marginLeft: 6 }}>
                  {appts.filter((a) => a.stylist === s.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Appointments Timeline */}
        <div className="timeline">
          <div className="tl-rail"></div>
          {filtered.map((appt, i) => (
            <React.Fragment key={appt.id}>
              {showNowLine && nowIdx === i && (
                <div className="tl-now" style={{ position: "relative", height: 24, marginBottom: 8 }}>
                  <div className="tl-time" style={{ top: 0, color: "var(--rose)" }}>
                    01:14
                    <small>now</small>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      left: -16,
                      top: 8,
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      background: "var(--rose)",
                      boxShadow: "0 0 0 4px rgba(196,69,43,0.15)",
                      zIndex: 2,
                    }}
                  ></div>
                  <div style={{ position: "absolute", left: -5, right: 0, top: 13, height: 1, background: "var(--rose)", opacity: 0.35 }}></div>
                </div>
              )}
              <ApptRow
                appt={appt}
                expanded={expandedId === appt.id}
                onToggle={() => setExpandedId(expandedId === appt.id ? null : appt.id)}
                onStatus={updateStatus}
                onWA={sendWA}
              />
            </React.Fragment>
          ))}
        </div>

        {/* Campaign Callout */}
        <div
          style={{
            marginTop: 24,
            padding: "18px 20px",
            background: "var(--teal-soft)",
            border: "1px solid var(--teal-soft-2)",
            borderRadius: "var(--radius)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: "var(--teal-ink)",
            fontSize: 13,
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--teal)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <I.wa style={{ width: 18, height: 18 }} />
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontWeight: 600 }}>3 customers haven't replied to their reminder.</strong> Send a follow-up WhatsApp in one tap.
          </div>
          <button className="btn btn-sm" style={{ background: "var(--teal)", color: "#fff", height: 32 }}>
            Review →
          </button>
        </div>
      </main>

      {/* Floating Action Button */}
      <button className="fab" onClick={() => setShowWalkIn(true)} aria-label="Add walk-in booking">
        +
      </button>

      {/* Bottom Nav Bar */}
      <nav className="bottom-nav">
        <button className="bn-item active">
          <I.home />
          <span>Home</span>
        </button>
        <button className="bn-item">
          <I.calendar />
          <span>Bookings</span>
        </button>
        <button className="bn-item">
          <I.users />
          <span>Customers</span>
        </button>
        <button className="bn-item">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21V3M21 21H3" />
            <rect x="7" y="11" width="3" height="6" rx="0.5" />
            <rect x="12" y="7" width="3" height="10" rx="0.5" />
            <rect x="17" y="13" width="3" height="4" rx="0.5" />
          </svg>
          <span>Insights</span>
        </button>
        <button className="bn-item">
          <I.settings />
          <span>Settings</span>
        </button>
      </nav>

      {/* Walk-In Modal */}
      {showWalkIn && <WalkInModal onClose={() => setShowWalkIn(false)} onAdd={addWalkIn} />}

      {/* Flash Messages */}
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
            zIndex: 60,
            boxShadow: "0 12px 24px -10px rgba(0,0,0,0.3)",
            animation: "pop .2s",
          }}
        >
          {flash}
        </div>
      )}

    </div>
  );
}

// ===== SUBCOMPONENTS =====

// MetricCard Component
interface MetricCardProps {
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  delta?: string;
  deltaTone?: "up" | "down";
  icon: React.ReactNode;
  spark: React.ReactNode;
}

function MetricCard({ label, value, prefix, suffix, delta, deltaTone, icon, spark }: MetricCardProps) {
  return (
    <div className="metric">
      <div className="lbl">
        <span className="ico">{icon}</span>
        {label}
      </div>
      <div className="val">
        {prefix && <small style={{ marginRight: 2 }}>{prefix}</small>}
        {value}
        {suffix && <small>{suffix}</small>}
      </div>
      {delta && (
        <div className="delta">
          <span className={deltaTone === "down" ? "down" : "up"}>
            {deltaTone === "down" ? "↓" : "↑"} {delta}
          </span>
          <span>vs. yesterday</span>
        </div>
      )}
      {spark && <div className="spark">{spark}</div>}
    </div>
  );
}

// MiniSpark SVG Component
function MiniSpark({ points, tone = "teal", height = 28, width = 80 }: { points: number[]; tone?: "teal" | "amber" | "rose"; height?: number; width?: number }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${height - ((p - min) / range) * height}`).join(" ");
  const color = tone === "teal" ? "var(--teal)" : tone === "amber" ? "var(--amber)" : "var(--rose)";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(points.length - 1) * stepX} cy={height - ((points[points.length - 1] - min) / range) * height} r="2.5" fill={color} />
    </svg>
  );
}

// Appointment Timeline Row
interface ApptRowProps {
  appt: Appointment;
  expanded: boolean;
  onToggle: () => void;
  onStatus: (id: number, status: "confirmed" | "arrived" | "completed" | "noshow") => void;
  onWA: (a: Appointment) => void;
}

function ApptRow({ appt, expanded, onToggle, onStatus, onWA }: ApptRowProps) {
  const stylist = stylistById(appt.stylist);
  const start = toMin(appt.time);
  const end = start + appt.duration;
  const endTime = `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
  const isActive = start <= NOW_TIME_MIN && NOW_TIME_MIN < end;

  return (
    <div className={`tl-row ${isActive ? "is-active" : ""} ${appt.status === "completed" ? "is-done" : ""}`}>
      <div className="tl-time">
        {appt.time}
        <small>{appt.duration} min</small>
      </div>
      <div className="tl-dot"></div>
      <div className={`appt ${expanded ? "is-expanded" : ""}`} onClick={onToggle}>
        <div className={`avatar md tone-${appt.tone}`} style={{ borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: "bold" }}>{appt.initials}</div>
        <div className="who">
          <div className="name">{appt.customer}</div>
          <div className="meta">
            <strong>{appt.service}</strong> · with {stylist.name} · {appt.time}–{endTime}
          </div>
        </div>
        <div className="meta-right">
          <span className={`badge ${appt.status}`}>{STATUS_LABEL[appt.status]}</span>
          <div className="price">₹{appt.price.toLocaleString("en-IN")}</div>
        </div>
        <div className="chev">
          <I.chev style={{ width: 18, height: 18 }} />
        </div>
      </div>

      {expanded && (
        <div className="appt-expand" onClick={(e) => e.stopPropagation()}>
          <div className="exp-block">
            <div className="lbl">Customer</div>
            <div className="val">
              <strong>{appt.customer}</strong>
              <br />
              <span style={{ color: "var(--ink-3)" }}>{appt.phone}</span>
              <br />
              <span style={{ color: "var(--ink-3)" }}>{appt.visits} previous visits</span>
            </div>
          </div>
          <div className="exp-block">
            <div className="lbl">Service</div>
            <div className="val">
              <strong>{appt.service}</strong>
              <br />
              <span style={{ color: "var(--ink-3)" }}>{appt.duration} min · ₹{appt.price.toLocaleString("en-IN")}</span>
              <br />
              <span style={{ color: "var(--ink-3)" }}>Stylist: {stylist.name}</span>
            </div>
          </div>
          <div className="exp-block">
            <div className="lbl">Notes</div>
            <div className="val" style={{ color: appt.note ? "var(--ink-2)" : "var(--ink-4)" }}>
              {appt.note || "No notes yet — tap to add."}
            </div>
          </div>
          <div className="exp-actions">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                className={`status-btn ${s === "noshow" ? "danger" : ""}`}
                onClick={() => onStatus(appt.id, s)}
                style={appt.status === s ? { borderColor: "var(--teal)", color: "var(--teal)", background: "var(--teal-soft)" } : {}}
              >
                {appt.status === s && "✓ "}
                {STATUS_LABEL[s]}
              </button>
            ))}
            <button className="status-btn" onClick={() => onWA(appt)} style={{ marginLeft: "auto", color: "var(--wa)", borderColor: "var(--wa)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <I.wa style={{ width: 14, height: 14 }} /> Message on WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Add Walk-In Appointment Modal
interface WalkInModalProps {
  onClose: () => void;
  onAdd: (data: { name: string; phone: string; svc: Service; stylistId: string }) => void;
}

function WalkInModal({ onClose, onAdd }: WalkInModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [svcId, setSvcId] = useState("s1");
  const [stylistId, setStylistId] = useState("anjali");

  const selectedSvc = SERVICES.find((s) => s.id === svcId) || SERVICES[0];
  const canSubmit = name.trim().length > 0;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add walk-in booking</h3>
          <button className="modal-close" onClick={onClose}>
            <I.x style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <div className="field">
              <label>Customer name</label>
              <input placeholder="e.g. Priya Sharma" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label>Phone (optional)</label>
              <input placeholder="+91 98xxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Service</label>
            <div className="svc-options">
              {SERVICES.slice(0, 6).map((s) => (
                <button key={s.id} className={`svc-opt ${svcId === s.id ? "on" : ""}`} onClick={() => setSvcId(s.id)}>
                  <span>{s.name}</span>
                  <small>
                    {s.duration}m · ₹{s.price}
                  </small>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Stylist</label>
            <select value={stylistId} onChange={(e) => setStylistId(e.target.value)} style={{ height: 42, background: "#fff", border: "1px solid var(--line-2)", borderRadius: 10, padding: "0 10px", outline: 0 }}>
              {STYLISTS.filter((s) => s.id !== "all").map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!canSubmit}
            style={!canSubmit ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            onClick={() => {
              onAdd({ name, phone, svc: selectedSvc, stylistId });
              onClose();
            }}
          >
            Add to schedule
          </button>
        </div>
      </div>
    </div>
  );
}
