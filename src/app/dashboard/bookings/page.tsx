"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import { useProfile } from "@/context/ProfileContext";
import { toMinHours, initialsOf, formatDateKey } from "@/lib/utils";
import { Stylist, CalAppt, DbCalBookingRow } from "@/types";
import { Icons as I, Modal, Badge, Avatar, FormField, Toggle, FilterChip } from "@/components/ui";

import { START_HOUR, SLOT_HEIGHT, MONTH_NAMES, DOW_FULL, STATUS_LABEL, TIME_LABELS, FALLBACK_STYLISTS } from "@/constants/bookings";

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
        <Avatar initials={a.initials} tone={a.tone} size="sm" style={{ width: 20, height: 20, fontSize: 9 }} />
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

  const inputCls = "w-full h-[42px] px-[14px] rounded-[10px] border border-line-2 bg-white font-sans text-sm text-ink outline-0 transition-[border-color] duration-150 focus:border-teal";

  return (
    <Modal
      title="Block time"
      onClose={onClose}
      width="min(420px, 100%)"
      footer={
        <>
          <button className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] font-sans text-sm font-medium border border-transparent cursor-pointer bg-transparent text-ink-2 hover:text-ink hover:bg-bg-2 transition-all duration-150" onClick={onClose}>Cancel</button>
          <button className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] font-sans text-sm font-medium border border-transparent cursor-pointer bg-teal !text-white hover:bg-teal-ink transition-all duration-150" onClick={handleBlock} disabled={saving}>
            {saving ? "Saving..." : "Block time"}
          </button>
        </>
      }
    >
      <FormField label="Stylist">
        <select value={blockStylist} onChange={e => setBlockStylist(e.target.value)} className={inputCls}>
          <option value="all">All stylists (whole salon)</option>
          {stylists.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </FormField>
      <div className="grid grid-cols-[1fr_1fr] gap-[10px]">
        <FormField label="From date">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
        </FormField>
        <FormField label="To date (optional)">
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} />
        </FormField>
      </div>
      <label className="flex items-center gap-2 text-[13px] cursor-pointer">
        <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="accent-teal w-4 h-4 shrink-0" />
        <span>All-day block</span>
      </label>
      {!allDay && (
        <div className="grid grid-cols-[1fr_1fr] gap-[10px]">
          <FormField label="From">
            <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="To">
            <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className={inputCls} />
          </FormField>
        </div>
      )}
      <FormField label="Reason">
        <select value={reason} onChange={e => setReason(e.target.value)} className={inputCls}>
          <option>Lunch</option>
          <option>Holiday</option>
          <option>Vacation</option>
          <option>Other</option>
        </select>
      </FormField>
    </Modal>
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
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-[56px_repeat(7,minmax(120px,1fr))] border-b border-line bg-white sticky top-0 z-10">
        <div className="bg-bg border-r border-line relative"></div>
        {weekDays.map((day) => {
          const key = formatDateKey(day);
          const isToday = key === todayKey;
          const cnt = appts.filter(a => a.dayKey === key && (stylistFilter === "all" || a.stylistId === stylistFilter)).length;
          return (
            <div key={key} className={`p-3 border-r border-line flex flex-col items-start gap-[2px] max-[720px]:p-[8px_6px] ${isToday ? "bg-teal-soft" : ""}`}>
              <div className={`font-mono text-[10px] font-medium tracking-[0.06em] ${isToday ? "text-teal" : "text-ink-3"}`}>{DOW_FULL[day.getDay()]}</div>
              <div className={`font-semibold leading-none mt-0.5 max-[720px]:text-base text-[22px] tracking-[-0.02em] ${isToday ? "text-teal-ink" : "text-ink-2"}`}>{day.getDate()}</div>
              <div className={`text-[11px] mt-1 max-[720px]:text-[10px] ${isToday ? "text-teal-ink" : "text-ink-3"}`}>{cnt} booking{cnt === 1 ? "" : "s"}</div>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-[56px_repeat(7,minmax(120px,1fr))] relative">
        <div className="bg-bg border-r border-line relative">
          {TIME_LABELS.map((label, i) => (
            <div key={i} className="border-b border-dashed border-line relative first:border-t-0 h-[56px]">
              <span className="font-mono text-[10px] text-ink-3 absolute left-2 -top-[7px] bg-white px-1 max-[720px]:text-[9px] first:top-0">{label}</span>
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
                <div key={hi} className="border-b border-dashed border-line first:border-t-0 odd:bg-black/[0.005] h-[56px]" />
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
    <div className="w-full">
      {/* Header */}
      <div className="grid border-b border-line bg-white sticky top-0 z-10" style={{ gridTemplateColumns: `56px repeat(${visibleStylists.length}, minmax(130px, 1fr))` }}>
        <div className="bg-bg border-r border-line relative"></div>
        {visibleStylists.map(s => {
          const cnt = appts.filter(a => a.dayKey === dayKey && a.stylistId === s.id).length;
          return (
            <div key={s.id} className="p-[10px_8px] text-left border-r border-line flex items-center gap-2.5">
              <Avatar initials={s.short || s.name[0]} tone={s.tone ?? undefined} size="md" />
              <div>
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="text-[11px] text-ink-3 mt-0.5">{cnt} appointment{cnt !== 1 ? "" : "s"}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid relative" style={{ gridTemplateColumns: `56px repeat(${visibleStylists.length}, minmax(130px, 1fr))` }}>
        <div className="bg-bg border-r border-line relative">
          {TIME_LABELS.map((label, i) => (
            <div key={i} className="border-b border-dashed border-line relative first:border-t-0 h-[56px]">
              <span className="font-mono text-[10px] text-ink-3 absolute left-2 -top-[7px] bg-white px-1 max-[720px]:text-[9px] first:top-0">{label}</span>
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
                <div key={hi} className="border-b border-dashed border-line first:border-t-0 odd:bg-black/[0.005] h-[56px]" />
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
  const [view, setView] = useState<"week" | "day">("week");
  const [baseDate, setBaseDate] = useState<Date>(() => new Date());
  const [stylistFilter, setStylistFilter] = useState<string | number>("all");
  const [selected, setSelected] = useState<CalAppt | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);

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
        setStylists((stylistsData as unknown as Array<{ id: string; name: string; tone: string | null }>).map((s) => ({
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
        .neq("status", "Cancelled")
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("start_time", { ascending: true });

      if (error) throw error;

      if (data) {

        const mapped: CalAppt[] = (data as unknown as DbCalBookingRow[]).map((b) => {
          const custName = b.customer?.name || "Walk-in";
          const initials = initialsOf(custName);
          const timeParts = (b.start_time || "09:00").split(":");
          const startH = parseInt(timeParts[0]) || 9;
          const startM = parseInt(timeParts[1]) || 0;
          const tone = (b.stylist?.tone || "tone-a").replace("tone-", "");
          const serviceNames = b.booking_services?.map((bs) => bs.service?.name).filter(Boolean).join(" + ") || "Service";
          const mapStatus = (s: string): "confirmed" | "arrived" | "completed" | "noshow" | "cancelled" => {
            const l = (s || "").toLowerCase();
            if (l === "arrived") return "arrived";
            if (l === "completed" || l === "paid") return "completed";
            if (l === "no-show") return "noshow";
            if (l === "cancelled") return "cancelled";
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
            phone: b.customer?.phone || undefined,
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
      queueMicrotask(() => {
        loadAppts(salonId, weekDays);
      });
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
    <div className="min-h-screen pb-[calc(var(--bottom-nav-h)+32px)] animate-[fadeIn_0.22s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      {/* Reusable Header */}
      <Header title="Bookings" subtitle={dateRangeStr} />

      <main className="max-w-[1200px] mx-auto px-8 py-7 pb-20">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-3.5 flex-wrap max-[980px]:flex-col max-[980px]:items-stretch">
          <div className="flex items-center gap-4 max-[980px]:justify-between">
            <div className="flex gap-1.5 items-center">
              <button className="w-8 h-8 rounded-lg border border-line bg-white grid place-items-center text-ink-2 cursor-pointer hover:bg-bg-2 transition-all duration-150" onClick={goBack} aria-label="Previous"><I.chevL /></button>
              <button className="inline-flex items-center justify-center gap-2 h-8 px-3 rounded-lg border border-line-2 bg-white font-sans text-sm font-medium text-ink cursor-pointer hover:border-ink-3 hover:bg-bg-2 transition-all duration-150" onClick={goToday}>Today</button>
              <button className="w-8 h-8 rounded-lg border border-line bg-white grid place-items-center text-ink-2 cursor-pointer hover:bg-bg-2 transition-all duration-150" onClick={goForward} aria-label="Next"><I.chevR /></button>
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
            <Toggle
              options={[
                { value: "day", label: "Day" },
                { value: "week", label: "Week" },
              ]}
              value={view}
              onChange={(val) => setView(val as "day" | "week")}
            />
            <Link href="/dashboard/block-time" className="inline-flex items-center justify-center gap-2 h-8 px-3 rounded-lg border border-transparent font-sans text-sm font-medium text-ink-2 cursor-pointer hover:text-ink hover:bg-bg-2 transition-all duration-150">
              Block time
            </Link>
            <Link href="/dashboard/new-booking" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg font-sans text-sm font-semibold bg-teal !text-white hover:bg-teal-ink transition-all duration-150 no-underline">
              <I.plus className="w-3.5 h-3.5" /> New booking
            </Link>
          </div>
        </div>

        {/* Stylist filter chips + legend */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <FilterChip
            label="All stylists"
            isActive={stylistFilter === "all"}
            onClick={() => setStylistFilter("all")}
            count={apptCountForFilter("all")}
          />
          {stylists.map(s => (
            <FilterChip
              key={s.id}
              label={s.name}
              isActive={stylistFilter === s.id}
              onClick={() => setStylistFilter(s.id)}
              avatarInitials={s.short || undefined}
              avatarTone={s.tone ?? undefined}
              count={apptCountForFilter(s.id)}
            />
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-2.5 text-[11px] text-ink-3">
            {[
              { label: "Confirmed", color: "var(--blue)" },
              { label: "Arrived", color: "var(--amber)" },
              { label: "Done", color: "var(--green)" },
              { label: "No-show", color: "var(--rose)" },
            ].map(({ label, color }) => (
              <span key={label} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Calendar card */}
        <div className="overflow-x-auto overflow-y-hidden p-0 bg-surface border border-line rounded-xl [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-bg-2 [&::-webkit-scrollbar-thumb]:bg-ink-4 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-ink-3">
          {loading ? (
            <div className="p-[40px_24px] flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse h-[36px] bg-bg-2 rounded-lg" />
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
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <div
              className="w-[min(560px,100%)] bg-white rounded-2xl p-5 max-h-[calc(100vh-32px)] overflow-y-auto"
              style={{ animation: "pop 0.2s ease-out" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar initials={selected.initials} tone={selected.tone} size="lg" style={{ width: 48, height: 48, fontSize: 18 }} />
                <div className="flex-1">
                  <div className="text-base font-bold text-ink">{selected.customer}</div>
                  <div className="text-xs text-ink-3 mt-0.5">
                     {selected.service} · {String(selected.startH).padStart(2,"0")}:{String(selected.startM).padStart(2,"0")} · {selected.duration} min
                  </div>
                </div>
                <Badge tone={selected.status} showDot>
                  {STATUS_LABEL[selected.status]}
                </Badge>
                <button onClick={() => setSelected(null)} className="border-0 bg-bg-2 rounded-full w-8 h-8 cursor-pointer grid place-items-center">
                  <I.x />
                </button>
              </div>

              {/* Stylist */}
              <div className="flex gap-3 mb-4 p-[12px_14px] bg-bg-2 rounded-[8px]">
                <div className="flex-1">
                  <div className="text-[10px] text-ink-4 font-semibold uppercase tracking-wider">Stylist</div>
                  <div className="text-xs font-semibold text-ink mt-0.5">
                    {stylists.find(s => s.id === selected.stylistId)?.name || selected.stylistId}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-ink-4 font-semibold uppercase tracking-wider">Date</div>
                  <div className="text-xs font-semibold text-ink mt-0.5">
                    {(() => { const d = new Date(selected.dayKey); return `${DOW_FULL[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`; })()}
                  </div>
                </div>
                {selected.phone && (
                  <div className="flex-1">
                    <div className="text-[10px] text-ink-4 font-semibold uppercase tracking-wider">Phone</div>
                    <div className="text-xs font-semibold text-ink mt-0.5">{selected.phone}</div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Link
                  href={`/dashboard/bookings/${selected.id}`}
                  className="flex-1 h-10 flex items-center justify-center bg-teal !text-white rounded-[8px] font-semibold text-[13px] no-underline hover:bg-teal-ink transition-colors duration-150"
                >
                  View details
                </Link>
                <Link
                  href={`/dashboard/checkout/${selected.id}`}
                  className="flex-1 h-10 flex items-center justify-center border border-line-2 text-ink-2 rounded-[8px] font-medium text-[13px] no-underline hover:border-ink-3 hover:bg-bg-2 transition-all duration-150"
                >
                  Checkout / POS
                </Link>
                {selected.phone && (
                  <button
                    onClick={() => {
                      const msg = `Hi ${selected.customer}, reminder for your ${selected.service} appointment.`;
                      window.open(`https://wa.me/${selected.phone?.replace(/[^0-9+]/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    className="h-10 px-3.5 flex items-center gap-1.5 border border-[#25D366] text-[#25D366] rounded-[8px] font-medium text-[13px] bg-transparent cursor-pointer hover:bg-[#25D366]/5 transition-colors duration-150"
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


    </div>
  );
}
