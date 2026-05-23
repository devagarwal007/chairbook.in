"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Icons as I } from "@/components/ui/Icons";
import Header from "@/components/layout/Header";
import { useProfile } from "@/context/ProfileContext";
import { toMinHours, initialsOf, formatDateKey } from "@/lib/utils";

import { Stylist, CalAppt } from "@/types";

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

// ===== FALLBACK DATA (only used when Supabase is unavailable) =====
const FALLBACK_STYLISTS: Stylist[] = [];

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

// FALLBACK: only used when salonId is missing (preview / no Supabase)
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

  return (
    <div
      onClick={onClick}
      className={`absolute left-0.5 right-0.5 rounded-lg p-[6px_10px] flex flex-col gap-1 cursor-pointer transition-all duration-120 z-10 overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_6px_14px_-6px_rgba(0,0,0,0.18)] hover:z-20 ${
        a.status === 'confirmed' ? 'bg-blue-soft text-blue border-l-[3px] border-blue' :
        a.status === 'arrived' ? 'bg-amber-soft text-amber-ink border-l-[3px] border-amber' :
        a.status === 'completed' ? 'bg-green-soft text-green border-l-[3px] border-green' :
        a.status === 'noshow' ? 'bg-rose-soft text-rose border-l-[3px] border-rose' : ''
      }`}
      style={{ top, height }}
      title={`${a.customer} · ${a.service} · ${start}–${endStr}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        {!narrow && (
          <div
            className={`avatar sm tone-${a.tone}`}
            style={{ width: 20, height: 20, fontSize: 9, border: 0 }}
          >
            {a.initials}
          </div>
        )}
        <div className={`font-bold text-[11px] tracking-[-0.005em] whitespace-nowrap overflow-hidden text-ellipsis flex-1 ${a.status === 'noshow' ? 'text-rose line-through' : 'text-ink'}`}>{a.customer}</div>
        <span className="font-mono text-[9px] shrink-0">{start}</span>
      </div>
      {height > 28 && (
        <div className="text-[10px] opacity-85 whitespace-nowrap overflow-hidden text-ellipsis">{a.service}</div>
      )}
    </div>
  );
}

// ===== BLOCK TIME MODAL =====
function BlockTimeModal({ onClose, salonId, stylists, baseDate }: { onClose: () => void; salonId: string | null; stylists: Stylist[]; baseDate: Date }) {
  const [blockStylist, setBlockStylist] = useState("all");
  const [dateFrom, setDateFrom] = useState(baseDate.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState("");
  const [timeFrom, setTimeFrom] = useState("09:00");
  const [timeTo, setTimeTo] = useState("18:00");
  const [allDay, setAllDay] = useState(false);
  const [reason, setReason] = useState("Lunch");
  const [saving, setSaving] = useState(false);

  const handleBlock = async () => {
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    if (supabase && salonId) {
      try {
        await supabase.from("blocks").insert({
          salon_id: salonId,
          stylist_id: blockStylist !== "all" ? blockStylist : null,
          reason,
          date_from: dateFrom,
          date_to: dateTo || null,
          time_from: allDay ? null : timeFrom,
          time_to: allDay ? null : timeTo,
          all_day: allDay,
        });
      } catch (err) {
        console.error("Error saving block:", err);
      }
    }
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: "min(420px, 100%)" }}>
        <div className="modal-head">
          <h3>Block time</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label>Stylist</label>
            <select value={blockStylist} onChange={e => setBlockStylist(e.target.value)} style={{ width: "100%", height: 42, border: "1px solid var(--line-2)", borderRadius: 8, padding: "0 10px", outline: 0, fontSize: 14, background: "#fff" }}>
              <option value="all">All stylists (whole salon)</option>
              {stylists.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="field">
              <label>From date</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: "100%", height: 42, border: "1px solid var(--line-2)", borderRadius: 8, padding: "0 10px", outline: 0, fontSize: 14 }} />
            </div>
            <div className="field">
              <label>To date (optional)</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: "100%", height: 42, border: "1px solid var(--line-2)", borderRadius: 8, padding: "0 10px", outline: 0, fontSize: 14 }} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[13px] cursor-pointer">
            <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="accent-teal w-4 h-4 shrink-0" />
            <span>All-day block</span>
          </label>
          {!allDay && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="field">
                <label>From</label>
                <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} style={{ width: "100%", height: 42, border: "1px solid var(--line-2)", borderRadius: 8, padding: "0 10px", outline: 0, fontSize: 14 }} />
              </div>
              <div className="field">
                <label>To</label>
                <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} style={{ width: "100%", height: 42, border: "1px solid var(--line-2)", borderRadius: 8, padding: "0 10px", outline: 0, fontSize: 14 }} />
              </div>
            </div>
          )}
          <div className="field">
            <label>Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)} style={{ width: "100%", height: 42, border: "1px solid var(--line-2)", borderRadius: 8, padding: "0 10px", outline: 0, fontSize: 14, background: "#fff" }}>
              <option>Lunch</option>
              <option>Holiday</option>
              <option>Vacation</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleBlock} disabled={saving}>
            {saving ? "Saving..." : "Block time"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== WEEK VIEW =====
interface WeekViewProps {
  weekDays: Date[];
  appts: CalAppt[];
  stylistFilter: string | number;
  onSelect: (a: CalAppt) => void;
  todayKey: string;
  nowMin: number;
}

function WeekView({ weekDays, appts, stylistFilter, onSelect, todayKey, nowMin }: WeekViewProps) {
  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-line bg-white sticky top-0 z-10 max-[720px]:grid-cols-[44px_repeat(7,minmax(80px,1fr))] max-[720px]:min-w-[600px]">
        <div className="bg-bg border-r border-line relative"></div>
        {weekDays.map((day) => {
          const key = formatDateKey(day);
          const isToday = key === todayKey;
          const cnt = appts.filter(a => a.dayKey === key && (stylistFilter === "all" || a.stylistId === stylistFilter)).length;
          return (
            <div key={key} className={`p-3 text-center border-r border-line flex flex-col items-center justify-center max-[720px]:p-[8px_6px] ${isToday ? "bg-teal-soft" : ""}`}>
              <div className={`text-[10px] font-bold tracking-[0.05em] ${isToday ? "text-teal" : "text-ink-3"}`}>{DOW_FULL[day.getDay()]}</div>
              <div className={`font-bold mt-1 leading-none max-[720px]:text-base text-lg ${isToday ? "text-teal-ink" : "text-ink-2"}`}>{day.getDate()}</div>
              <div className={`text-[11px] mt-1.5 max-[720px]:text-[10px] ${isToday ? "text-teal-ink" : "text-ink-3"}`}>{cnt} booking{cnt === 1 ? "" : "s"}</div>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] relative max-[720px]:grid-cols-[44px_repeat(7,minmax(80px,1fr))] max-[720px]:min-w-[600px]">
        <div className="bg-bg border-r border-line relative">
          {TIME_LABELS.map((label, i) => (
            <div key={i} className="border-b border-dashed border-line relative first:border-t-0 group" style={{ height: SLOT_HEIGHT * 2 }}>
              <span className="font-mono text-xs text-ink-3 absolute right-2 -top-1.75 bg-bg px-1 max-[720px]:text-[9px] group-first:top-1">{label}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day) => {
          const key = formatDateKey(day);
          const isToday = key === todayKey;
          const dayAppts = appts.filter(a => a.dayKey === key && (stylistFilter === "all" || a.stylistId === stylistFilter));
          const nowTop = isToday ? ((nowMin - START_HOUR * 60) / 30) * SLOT_HEIGHT : -1;
          const nowHours = Math.floor(nowMin / 60);
          const nowMins = nowMin % 60;
          const nowStr = `${String(nowHours).padStart(2, "0")}:${String(nowMins).padStart(2, "0")}`;

          return (
            <div key={key} className={`relative border-r border-line ${isToday ? "bg-[rgba(15,110,86,0.025)]" : ""}`}>
              {/* hour lines */}
              {TIME_LABELS.map((_, hi) => (
                <div key={hi} className="border-b border-dashed border-line first:border-t-0 odd:bg-black/[0.005]" style={{ height: SLOT_HEIGHT * 2 }} />
              ))}

              {/* now line */}
              {isToday && nowTop >= 0 && (
                <div className="absolute left-0 right-0 h-0.5 bg-teal z-10 pointer-events-none before:content-[''] before:absolute before:-left-1 before:-top-0.75 before:w-2 before:h-2 before:rounded-full before:bg-teal" style={{ top: nowTop }}>
                  <span className="absolute left-2 -top-2 bg-teal text-white text-[9px] font-mono py-0.25 px-1 rounded">{nowStr}</span>
                </div>
              )}

              {/* appointments */}
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
  stylistFilter: string | number;
  onSelect: (a: CalAppt) => void;
  nowMin: number;
  isToday: boolean;
}

function DayView({ dayKey, appts, stylists, stylistFilter, onSelect, nowMin, isToday }: DayViewProps) {
  const visibleStylists = stylistFilter === "all" ? stylists : stylists.filter(s => s.id === stylistFilter);
  const nowTop = isToday ? ((nowMin - START_HOUR * 60) / 30) * SLOT_HEIGHT : -1;
  const nowHours = Math.floor(nowMin / 60);
  const nowMins = nowMin % 60;
  const nowStr = `${String(nowHours).padStart(2, "0")}:${String(nowMins).padStart(2, "0")}`;

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="grid border-b border-line bg-white sticky top-0 z-10 max-[720px]:grid-cols-[44px_repeat(7,minmax(80px,1fr))] max-[720px]:min-w-[600px]" style={{ gridTemplateColumns: `60px repeat(${visibleStylists.length}, 1fr)` }}>
        <div className="bg-bg border-r border-line relative"></div>
        {visibleStylists.map(s => {
          const cnt = appts.filter(a => a.dayKey === dayKey && a.stylistId === s.id).length;
          return (
            <div key={s.id} className="p-[10px_8px] text-left border-r border-line flex items-center gap-2.5">
              <div className={`avatar md tone-${s.tone}`}>{s.short}</div>
              <div>
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="text-[11px] text-ink-3 mt-0.5">{cnt} appointment{cnt !== 1 ? "" : "s"}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid relative max-[720px]:grid-cols-[44px_repeat(7,minmax(80px,1fr))] max-[720px]:min-w-[600px]" style={{ gridTemplateColumns: `60px repeat(${visibleStylists.length}, 1fr)` }}>
        <div className="bg-bg border-r border-line relative">
          {TIME_LABELS.map((label, i) => (
            <div key={i} className="border-b border-dashed border-line relative first:border-t-0 group" style={{ height: SLOT_HEIGHT * 2 }}>
              <span className="font-mono text-xs text-ink-3 absolute right-2 -top-1.75 bg-bg px-1 max-[720px]:text-[9px] group-first:top-1">{label}</span>
            </div>
          ))}
        </div>

        {/* Stylist columns */}
        {visibleStylists.map(s => {
          const stylistAppts = appts.filter(a => a.dayKey === dayKey && a.stylistId === s.id);
          return (
            <div key={s.id} className={`relative border-r border-line ${isToday ? "bg-[rgba(15,110,86,0.025)]" : ""}`}>
              {/* hour lines */}
              {TIME_LABELS.map((_, hi) => (
                <div key={hi} className="border-b border-dashed border-line first:border-t-0 odd:bg-black/[0.005]" style={{ height: SLOT_HEIGHT * 2 }} />
              ))}

              {/* now line */}
              {isToday && nowTop >= 0 && (
                <div className="absolute left-0 right-0 h-0.5 bg-teal z-10 pointer-events-none before:content-[''] before:absolute before:-left-1 before:-top-0.75 before:w-2 before:h-2 before:rounded-full before:bg-teal" style={{ top: nowTop }}>
                  <span className="absolute left-2 -top-2 bg-teal text-white text-[9px] font-mono py-0.25 px-1 rounded">{nowStr}</span>
                </div>
              )}

              {/* appointments */}
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
  const [stylistFilter, setStylistFilter] = useState<string | number>("all");
  const [selected, setSelected] = useState<CalAppt | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [appts, setAppts] = useState<CalAppt[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>(FALLBACK_STYLISTS);
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
        return `${s.getDate()} – ${e.getDate()} ${MONTH_NAMES[s.getMonth()].toUpperCase()} ${s.getFullYear()} · WEEK ${getWeekNumber(s)}`;
      }
      return `${s.getDate()} ${MONTH_NAMES[s.getMonth()].toUpperCase()} – ${e.getDate()} ${MONTH_NAMES[e.getMonth()].toUpperCase()} ${e.getFullYear()}`;
    } else {
      const d = baseDate;
      return `${DOW_FULL[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
    }
  }, [view, weekDays, baseDate]);

  const dayKey = formatDateKey(baseDate);
  const isDayToday = dayKey === todayKey;

  // Count appointments per stylist for chips
  const apptCountForFilter = (id: string | number) => {
    if (view === "week") return appts.filter(a => id === "all" || a.stylistId === id).length;
    return appts.filter(a => a.dayKey === dayKey && (id === "all" || a.stylistId === id)).length;
  };

  return (
    <div className="app animate-fade-in">
      {/* Reusable Header */}
      <Header title="Bookings" subtitle={dateRangeStr} />

      <main className="pb-[80px]">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-3.5 flex-wrap max-[980px]:flex-col max-[980px]:items-stretch">
          <div className="flex items-center gap-4 max-[980px]:justify-between">
            <div className="flex gap-1.5 items-center">
              <button className="icon-btn" onClick={goBack} aria-label="Previous"><I.chevL /></button>
              <button className="btn btn-outline btn-sm" onClick={goToday}>Today</button>
              <button className="icon-btn" onClick={goForward} aria-label="Next"><I.chevR /></button>
            </div>
            <div className="flex flex-col gap-0.5">
              <strong className="text-[15px] font-semibold tracking-[-0.005em]">
                {view === "week"
                  ? `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTH_NAMES[weekDays[0].getMonth()]} ${weekDays[0].getFullYear()}`
                  : `${baseDate.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
              </strong>
              {view === "week" && <span className="text-xs text-ink-3 font-mono tracking-[0.04em]">Week {getWeekNumber(weekDays[0])}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2.5 max-[980px]:justify-between">
            <div className="relative flex p-0.5 bg-bg-2 rounded-lg border border-line">
              <div
                className="absolute top-0.5 bottom-0.5 bg-white rounded shadow-sm transition-transform duration-200"
                style={{
                  width: "calc(50% - 3px)",
                  transform: view === "day" ? "translateX(0)" : "translateX(100%)",
                }}
              />
              <button className={`px-4 py-1.5 text-sm font-medium transition-colors ${view === "day" ? "text-ink" : "text-ink-3"}`} onClick={() => setView("day")} style={{ position: "relative", zIndex: 1 }}>Day</button>
              <button className={`px-4 py-1.5 text-sm font-medium transition-colors ${view === "week" ? "text-ink" : "text-ink-3"}`} onClick={() => setView("week")} style={{ position: "relative", zIndex: 1 }}>Week</button>
            </div>
            <Link href="/dashboard/block-time" className="btn btn-ghost btn-sm">
              Block time
            </Link>
            <Link href="/dashboard/new-booking" className="btn btn-primary btn-sm">
              <I.plus style={{ width: 14, height: 14 }} /> New booking
            </Link>
          </div>
        </div>

        {/* Stylist filter chips + legend */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${stylistFilter === "all" ? "bg-teal text-white border-teal" : "bg-bg-1 text-ink-2 border-line hover:border-teal/30"}`}
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
        <div className="overflow-hidden p-0 max-[720px]:overflow-x-auto card">
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
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={() => setSelected(null)}
          >
            <div
              style={{ width: "min(560px, 100%)", background: "#fff", borderRadius: 16, padding: 20, animation: "pop 0.2s ease-out", maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}
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
        {showBlockModal && <BlockTimeModal onClose={() => setShowBlockModal(false)} salonId={salonId} stylists={stylists} baseDate={baseDate} />}
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
