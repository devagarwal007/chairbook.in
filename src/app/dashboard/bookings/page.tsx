"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Icons as I } from "@/components/ui/Icons";
import Header from "@/components/layout/Header";
import { useProfile } from "@/context/ProfileContext";
import { toMinHours, initialsOf, formatDateKey } from "@/lib/utils";

// ===== TYPES =====
interface Stylist {
  id: string;
  name: string;
  short: string;
  tone: string;
}

interface CalAppt {
  id: string | number;
  dayKey: string; // 'YYYY-MM-DD'
  stylistId: string;
  startH: number;
  startM: number;
  duration: number;
  customer: string;
  initials: string;
  tone: string;
  service: string;
  status: "confirmed" | "arrived" | "completed" | "noshow";
  phone?: string;
}

// ===== CONSTANTS =====
const START_HOUR = 9;
const END_HOUR = 21;
const SLOT_HEIGHT = 28; // px per 30-min slot
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW_FULL = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  arrived: "Arrived",
  completed: "Done",
  noshow: "No-show",
};

// Time labels: 9 AM – 9 PM
const TIME_LABELS: string[] = [];
for (let h = START_HOUR; h < END_HOUR; h++) {
  const hh = h > 12 ? h - 12 : h;
  const ampm = h >= 12 ? "PM" : "AM";
  TIME_LABELS.push(`${hh} ${ampm}`);
}

// ===== MOCK DATA =====
const MOCK_STYLISTS: Stylist[] = [
  { id: "anjali", name: "Anjali", short: "A", tone: "b" },
  { id: "pooja",  name: "Pooja",  short: "P", tone: "d" },
  { id: "kiran",  name: "Kiran",  short: "K", tone: "c" },
  { id: "rekha",  name: "Rekha",  short: "R", tone: "e" },
];

// Helpers
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setDate(d.getDate() + diff);
  return d;
};

const getWeekDays = (weekStart: Date): Date[] => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
};

const slotTopPx = (h: number, m: number) =>
  ((h - START_HOUR) * 60 + m) / 30 * SLOT_HEIGHT;

const slotHeightPx = (dur: number) =>
  Math.max((dur / 30) * SLOT_HEIGHT - 2, 20);

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function generateMockAppts(weekDays: Date[]): CalAppt[] {
  const appts: CalAppt[] = [];
  const stylists = ["anjali", "pooja", "kiran", "rekha"];
  const services = ["Haircut", "Hair Color", "Facial", "Hair Spa", "Threading", "Manicure", "Pedicure", "Beard Trim"];
  const customers = [
    { name: "Priya Sharma", tone: "b" }, { name: "Meera Iyer", tone: "c" },
    { name: "Kavya Reddy", tone: "e" }, { name: "Sneha P.", tone: "d" },
    { name: "Anita Verma", tone: "a" }, { name: "Ravi K.", tone: "c" },
    { name: "Aisha Khan", tone: "d" }, { name: "Tanvi Kapoor", tone: "c" },
  ];
  const statuses: ("confirmed" | "arrived" | "completed")[] = ["confirmed", "arrived", "completed"];

  let id = 100;
  weekDays.forEach((day) => {
    const key = formatDateKey(day);
    const count = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < count; i++) {
      const cust = customers[Math.floor(Math.random() * customers.length)];
      const startH = Math.floor(Math.random() * 8) + START_HOUR;
      const startM = Math.random() > 0.5 ? 30 : 0;
      const dur = [30, 45, 60, 90][Math.floor(Math.random() * 4)];
      const stylistId = stylists[Math.floor(Math.random() * stylists.length)];
      const svc = services[Math.floor(Math.random() * services.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const initials = initialsOf(cust.name);
      appts.push({ id: id++, dayKey: key, stylistId, startH, startM, duration: dur, customer: cust.name, initials, tone: cust.tone, service: svc, status });
    }
  });
  return appts;
}

// ===== APPOINTMENT BLOCK =====
interface ApptBlockProps {
  a: CalAppt;
  onClick: () => void;
  narrow?: boolean;
}

function ApptBlock({ a, onClick, narrow }: ApptBlockProps) {
  const top = slotTopPx(a.startH, a.startM);
  const height = slotHeightPx(a.duration);
  const start = `${String(a.startH).padStart(2,"0")}:${String(a.startM).padStart(2,"0")}`;
  const endMin = toMinHours(a.startH, a.startM) + a.duration;
  const endStr = `${String(Math.floor(endMin / 60)).padStart(2,"0")}:${String(endMin % 60).padStart(2,"0")}`;

  const statusColors: Record<string, { bg: string; border: string; text: string }> = {
    confirmed: { bg: "var(--teal-soft)", border: "var(--teal)", text: "var(--teal-ink)" },
    arrived:   { bg: "#fff8e6", border: "var(--amber)", text: "#7a5200" },
    completed: { bg: "#f0f0f0", border: "#ccc", text: "var(--ink-3)" },
    noshow:    { bg: "#fff0f0", border: "var(--rose)", text: "var(--rose)" },
  };
  const col = statusColors[a.status] || statusColors.confirmed;

  return (
    <div
      onClick={onClick}
      title={`${a.customer} · ${a.service} · ${start}–${endStr}`}
      style={{
        position: "absolute",
        top,
        left: 2,
        right: 2,
        height,
        background: col.bg,
        borderLeft: `3px solid ${col.border}`,
        borderRadius: 6,
        padding: "3px 6px",
        cursor: "pointer",
        overflow: "hidden",
        zIndex: 1,
        transition: "opacity 0.15s",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {!narrow && (
          <div
            className={`avatar sm tone-${a.tone}`}
            style={{ width: 16, height: 16, fontSize: 8, border: 0, borderRadius: "50%", flexShrink: 0, display: "inline-grid", placeItems: "center", fontWeight: "bold" }}
          >
            {a.initials}
          </div>
        )}
        <div style={{ fontSize: 11, fontWeight: 600, color: col.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {a.customer}
        </div>
        <span style={{ fontSize: 9, color: col.border, marginLeft: "auto", flexShrink: 0 }}>{start}</span>
      </div>
      {height > 32 && (
        <div style={{ fontSize: 10, color: col.text, opacity: 0.8, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {a.service}
        </div>
      )}
    </div>
  );
}

// ===== WEEK VIEW =====
interface WeekViewProps {
  weekDays: Date[];
  appts: CalAppt[];
  stylistFilter: string;
  onSelect: (a: CalAppt) => void;
  todayKey: string;
  nowMin: number;
}

function WeekView({ weekDays, appts, stylistFilter, onSelect, todayKey, nowMin }: WeekViewProps) {
  const TOTAL_HEIGHT = TIME_LABELS.length * SLOT_HEIGHT * 2;
  return (
    <div style={{ overflowX: "auto" }}>
      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: `52px repeat(7, 1fr)`, borderBottom: "1px solid var(--line)" }}>
        <div />
        {weekDays.map((day, i) => {
          const key = formatDateKey(day);
          const isToday = key === todayKey;
          const cnt = appts.filter(a => a.dayKey === key && (stylistFilter === "all" || a.stylistId === stylistFilter)).length;
          return (
            <div key={i} style={{ padding: "8px 4px", textAlign: "center", background: isToday ? "var(--teal-soft)" : "transparent" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: isToday ? "var(--teal)" : "var(--ink-3)", letterSpacing: "0.05em" }}>
                {DOW_FULL[day.getDay()]}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: isToday ? "var(--teal)" : "var(--ink)", lineHeight: 1.2 }}>
                {day.getDate()}
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-3)" }}>{cnt} bk</div>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: `52px repeat(7, 1fr)` }}>
        {/* Time column */}
        <div>
          {TIME_LABELS.map((label, i) => (
            <div key={i} style={{ height: SLOT_HEIGHT * 2, borderBottom: "1px solid var(--line)", paddingTop: 2, paddingRight: 6, textAlign: "right" }}>
              <span style={{ fontSize: 10, color: "var(--ink-4)", fontVariantNumeric: "tabular-nums" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day, i) => {
          const key = formatDateKey(day);
          const isToday = key === todayKey;
          const dayAppts = appts.filter(a => a.dayKey === key && (stylistFilter === "all" || a.stylistId === stylistFilter));
          const nowTop = isToday ? ((nowMin - START_HOUR * 60) / 30) * SLOT_HEIGHT : -1;

          return (
            <div key={i} style={{ position: "relative", borderLeft: "1px solid var(--line)", background: isToday ? "rgba(0,170,140,0.03)" : "transparent", height: TOTAL_HEIGHT }}>
              {/* Hour rows */}
              {TIME_LABELS.map((_, hi) => (
                <div key={hi} style={{ height: SLOT_HEIGHT * 2, borderBottom: "1px dashed var(--line)", boxSizing: "border-box" }} />
              ))}

              {/* Now line */}
              {isToday && nowTop >= 0 && (
                <div style={{ position: "absolute", top: nowTop, left: 0, right: 0, height: 2, background: "var(--rose)", zIndex: 3, pointerEvents: "none" }}>
                  <div style={{ position: "absolute", left: -4, top: -4, width: 10, height: 10, borderRadius: "50%", background: "var(--rose)" }} />
                </div>
              )}

              {/* Appointments */}
              {dayAppts.map(a => (
                <ApptBlock key={a.id} a={a} narrow onClick={() => onSelect(a)} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== DAY VIEW =====
interface DayViewProps {
  dayKey: string;
  appts: CalAppt[];
  stylists: Stylist[];
  stylistFilter: string;
  onSelect: (a: CalAppt) => void;
  nowMin: number;
  isToday: boolean;
}

function DayView({ dayKey, appts, stylists, stylistFilter, onSelect, nowMin, isToday }: DayViewProps) {
  const visibleStylists = stylistFilter === "all" ? stylists : stylists.filter(s => s.id === stylistFilter);
  const TOTAL_HEIGHT = TIME_LABELS.length * SLOT_HEIGHT * 2;
  const nowTop = isToday ? ((nowMin - START_HOUR * 60) / 30) * SLOT_HEIGHT : -1;

  return (
    <div style={{ overflowX: "auto" }}>
      {/* Stylist headers */}
      <div style={{ display: "grid", gridTemplateColumns: `52px repeat(${visibleStylists.length}, 1fr)`, borderBottom: "1px solid var(--line)" }}>
        <div />
        {visibleStylists.map(s => {
          const cnt = appts.filter(a => a.dayKey === dayKey && a.stylistId === s.id).length;
          return (
            <div key={s.id} style={{ padding: "10px 8px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div className={`avatar md tone-${s.tone}`} style={{ width: 36, height: 36, borderRadius: "50%", fontSize: 14, fontWeight: "bold", display: "grid", placeItems: "center" }}>
                {s.short}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{s.name}</div>
              <div style={{ fontSize: 10, color: "var(--ink-3)" }}>{cnt} appt{cnt !== 1 ? "s" : ""}</div>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: `52px repeat(${visibleStylists.length}, 1fr)` }}>
        {/* Time column */}
        <div>
          {TIME_LABELS.map((label, i) => (
            <div key={i} style={{ height: SLOT_HEIGHT * 2, borderBottom: "1px solid var(--line)", paddingTop: 2, paddingRight: 6, textAlign: "right" }}>
              <span style={{ fontSize: 10, color: "var(--ink-4)" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Stylist columns */}
        {visibleStylists.map(s => {
          const stylistAppts = appts.filter(a => a.dayKey === dayKey && a.stylistId === s.id);
          return (
            <div key={s.id} style={{ position: "relative", borderLeft: "1px solid var(--line)", background: "rgba(0,170,140,0.02)", height: TOTAL_HEIGHT }}>
              {TIME_LABELS.map((_, hi) => (
                <div key={hi} style={{ height: SLOT_HEIGHT * 2, borderBottom: "1px dashed var(--line)", boxSizing: "border-box" }} />
              ))}

              {/* Now line */}
              {isToday && nowTop >= 0 && (
                <div style={{ position: "absolute", top: nowTop, left: 0, right: 0, height: 2, background: "var(--rose)", zIndex: 3, pointerEvents: "none" }}>
                  <div style={{ position: "absolute", left: -4, top: -4, width: 10, height: 10, borderRadius: "50%", background: "var(--rose)" }} />
                </div>
              )}

              {stylistAppts.map(a => (
                <ApptBlock key={a.id} a={a} onClick={() => onSelect(a)} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function BookingsPage() {
  const { salonId } = useProfile();
  const router = useRouter();
  const [view, setView] = useState<"week" | "day">("week");
  const [baseDate, setBaseDate] = useState<Date>(() => new Date());
  const [stylistFilter, setStylistFilter] = useState("all");
  const [selected, setSelected] = useState<CalAppt | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [appts, setAppts] = useState<CalAppt[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>(MOCK_STYLISTS);
  const [loading, setLoading] = useState(true);
  const [nowMin, setNowMin] = useState(0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);

  // Live time
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  // Week days
  const weekStart = useMemo(() => getWeekStart(baseDate), [baseDate]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  // Load appointments when salonId or weekDays change
  const loadAppts = useCallback(async (sid: string, days: Date[]) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAppts(generateMockAppts(days));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const fromDate = formatDateKey(days[0]);
      const toDate = formatDateKey(days[days.length - 1]);

      const { data: stylistsData } = await supabase
        .from("stylists").select("id, name, tone").eq("salon_id", sid).eq("active", true);
      if (stylistsData && stylistsData.length > 0) {
        setStylists(stylistsData.map((s: any) => ({
          id: s.id,
          name: s.name,
          short: s.name[0],
          tone: (s.tone || "tone-a").replace("tone-", ""),
        })));
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(`id, date, start_time, duration, status, notes,
          customer:customers(id, name, phone),
          stylist:stylists(id, name, tone),
          booking_services(service:services(name))`)
        .eq("salon_id", sid)
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("start_time", { ascending: true });

      if (error) throw error;

      if (data) {
        const mapped: CalAppt[] = data.map((b: any) => {
          const custName = b.customer?.name || "Walk-in";
          const initials = initialsOf(custName);
          const timeParts = (b.start_time || "09:00").split(":");
          const startH = parseInt(timeParts[0]) || 9;
          const startM = parseInt(timeParts[1]) || 0;
          const tone = (b.stylist?.tone || "tone-a").replace("tone-", "");
          const serviceNames = b.booking_services?.map((bs: any) => bs.service?.name).filter(Boolean).join(" + ") || "Service";
          const mapStatus = (s: string): "confirmed" | "arrived" | "completed" | "noshow" => {
            const l = (s || "").toLowerCase();
            if (l === "arrived") return "arrived";
            if (l === "completed" || l === "paid") return "completed";
            if (l === "no-show") return "noshow";
            return "confirmed";
          };
          return {
            id: b.id,
            dayKey: b.date,
            stylistId: b.stylist?.id || "unknown",
            startH,
            startM,
            duration: b.duration || 30,
            customer: custName,
            initials,
            tone,
            service: serviceNames,
            status: mapStatus(b.status),
            phone: b.customer?.phone,
          };
        });
        setAppts(mapped);
      }
    } catch (err) {
      console.error("Error loading bookings:", err);
      setAppts(generateMockAppts(days));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (salonId) {
      loadAppts(salonId, weekDays);
    } else {
      // If no salonId yet, load mock data after short delay to check cache
      const t = setTimeout(() => {
        if (!salonId) {
          setAppts(generateMockAppts(weekDays));
          setLoading(false);
        }
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [salonId, weekDays, loadAppts]);

  // Navigation
  const goBack = () => {
    const d = new Date(baseDate);
    if (view === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setBaseDate(d);
  };
  const goForward = () => {
    const d = new Date(baseDate);
    if (view === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setBaseDate(d);
  };
  const goToday = () => setBaseDate(new Date());

  // Date range display
  const dateRangeStr = useMemo(() => {
    if (view === "week") {
      const s = weekDays[0];
      const e = weekDays[6];
      if (s.getMonth() === e.getMonth()) {
        return `${s.getDate()} – ${e.getDate()} ${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()} · Week ${getWeekNumber(s)}`;
      }
      return `${s.getDate()} ${MONTH_NAMES[s.getMonth()]} – ${e.getDate()} ${MONTH_NAMES[e.getMonth()]} ${e.getFullYear()}`;
    } else {
      const d = baseDate;
      return `${DOW_FULL[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    }
  }, [view, weekDays, baseDate]);

  const dayKey = formatDateKey(baseDate);
  const isDayToday = dayKey === todayKey;

  // Count appointments per stylist for chips
  const apptCountForFilter = (id: string) => {
    if (view === "week") return appts.filter(a => id === "all" || a.stylistId === id).length;
    return appts.filter(a => a.dayKey === dayKey && (id === "all" || a.stylistId === id)).length;
  };

  return (
    <div className="app animate-fade-in">
      {/* Reusable Header */}
      <Header title="Bookings" subtitle={dateRangeStr} />

      <main className="app-main" style={{ paddingBottom: 80 }}>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button className="icon-btn" onClick={goBack} aria-label="Previous"><I.chevL /></button>
              <button className="btn btn-sm" onClick={goToday} style={{ border: "1px solid var(--line-2)", background: "#fff", color: "var(--ink-2)", height: 32, padding: "0 12px" }}>Today</button>
              <button className="icon-btn" onClick={goForward} aria-label="Next"><I.chevR /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <strong style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.3 }}>
                {view === "week"
                  ? `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTH_NAMES[weekDays[0].getMonth()]} ${weekDays[0].getFullYear()}`
                  : `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTH_NAMES[weekDays[0].getMonth()]}`}
              </strong>
              {view === "week" && <span style={{ fontSize: 10, color: "var(--ink-3)" }}>Week {getWeekNumber(weekDays[0])}</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="toggle" style={{ position: "relative" }}>
              <div
                className="toggle-slider"
                style={{
                  width: "calc(50% - 3px)",
                  transform: view === "day" ? "translateX(0)" : "translateX(100%)",
                }}
              />
              <button className={view === "day" ? "on" : ""} onClick={() => setView("day")} style={{ position: "relative", zIndex: 1 }}>Day</button>
              <button className={view === "week" ? "on" : ""} onClick={() => setView("week")} style={{ position: "relative", zIndex: 1 }}>Week</button>
            </div>
            <Link href="/dashboard/new-booking" className="btn btn-sm" style={{ background: "var(--teal)", color: "#fff", height: 32, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, textDecoration: "none" }}>
              <I.plus /> New booking
            </Link>
          </div>
        </div>

        {/* Stylist filter chips + legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button
            className={`filter-chip ${stylistFilter === "all" ? "on" : ""}`}
            onClick={() => setStylistFilter("all")}
          >
            All stylists
            <span style={{ color: stylistFilter === "all" ? "rgba(255,255,255,0.6)" : "var(--ink-4)", fontSize: 11, marginLeft: 6 }}>
              {apptCountForFilter("all")}
            </span>
          </button>
          {stylists.map(s => (
            <button
              key={s.id}
              className={`filter-chip ${stylistFilter === s.id ? "on" : ""}`}
              onClick={() => setStylistFilter(s.id)}
            >
              <span className={`avatar sm tone-${s.tone}`} style={{ width: 18, height: 18, fontSize: 9, border: 0, borderRadius: "50%", display: "inline-grid", placeItems: "center", fontWeight: "bold", marginRight: 4 }}>
                {s.short}
              </span>
              {s.name}
              <span style={{ color: stylistFilter === s.id ? "rgba(255,255,255,0.6)" : "var(--ink-4)", fontSize: 11, marginLeft: 6 }}>
                {apptCountForFilter(s.id)}
              </span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--ink-3)" }}>
            {[
              { label: "Confirmed", color: "var(--teal)" },
              { label: "Arrived", color: "var(--amber)" },
              { label: "Done", color: "#ccc" },
              { label: "No-show", color: "var(--rose)" },
            ].map(({ label, color }) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Calendar card */}
        <div className="card" style={{ overflow: "hidden", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
          {loading ? (
            <div style={{ padding: "40px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="pulse" style={{ height: 36, background: "var(--bg-2)", borderRadius: 8 }} />
              ))}
            </div>
          ) : view === "week" ? (
            <WeekView
              weekDays={weekDays}
              appts={appts}
              stylistFilter={stylistFilter}
              onSelect={setSelected}
              todayKey={todayKey}
              nowMin={nowMin}
            />
          ) : (
            <DayView
              dayKey={dayKey}
              appts={appts}
              stylists={stylists}
              stylistFilter={stylistFilter}
              onSelect={setSelected}
              nowMin={nowMin}
              isToday={isDayToday}
            />
          )}
        </div>

        {/* Selected booking quick view */}
        {selected && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            onClick={() => setSelected(null)}
          >
            <div
              style={{ width: "min(560px, 100%)", background: "#fff", borderRadius: "16px 16px 0 0", padding: 20, animation: "pop 0.2s ease-out" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div className={`avatar md tone-${selected.tone}`} style={{ width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: "bold", fontSize: 18 }}>
                  {selected.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{selected.customer}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                     {selected.service} · {String(selected.startH).padStart(2,"0")}:{String(selected.startM).padStart(2,"0")} · {selected.duration} min
                  </div>
                </div>
                <span className={`badge ${selected.status}`}>{STATUS_LABEL[selected.status]}</span>
                <button onClick={() => setSelected(null)} style={{ border: 0, background: "var(--bg-2)", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "grid", placeItems: "center" }}>
                  <I.x />
                </button>
              </div>

              {/* Stylist */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16, padding: "12px 14px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "var(--ink-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Stylist</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                    {stylists.find(s => s.id === selected.stylistId)?.name || selected.stylistId}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "var(--ink-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Date</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                    {(() => { const d = new Date(selected.dayKey); return `${DOW_FULL[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`; })()}
                  </div>
                </div>
                {selected.phone && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: "var(--ink-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Phone</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{selected.phone}</div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link
                  href={`/dashboard/bookings/${selected.id}`}
                  style={{ flex: 1, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--teal)", color: "#fff", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, textDecoration: "none" }}
                >
                  View details
                </Link>
                <Link
                  href={`/dashboard/checkout/${selected.id}`}
                  style={{ flex: 1, height: 40, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--line-2)", color: "var(--ink-2)", borderRadius: "var(--radius-sm)", fontWeight: 500, fontSize: 13, textDecoration: "none" }}
                >
                  Checkout / POS
                </Link>
                {selected.phone && (
                  <button
                    onClick={() => {
                      const msg = `Hi ${selected.customer}, reminder for your ${selected.service} appointment.`;
                      window.open(`https://wa.me/${selected.phone?.replace(/[^0-9+]/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    style={{ height: 40, padding: "0 14px", display: "flex", alignItems: "center", gap: 6, border: "1px solid #25D366", color: "#25D366", borderRadius: "var(--radius-sm)", fontWeight: 500, fontSize: 13, background: "transparent", cursor: "pointer" }}
                  >
                    <I.wa /> WhatsApp
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Flash */}
      {flash && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: 13, zIndex: 60 }}>
          {flash}
        </div>
      )}
    </div>
  );
}
