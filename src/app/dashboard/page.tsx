"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Icons as I } from "@/components/ui/Icons";
import { toMin, formatTime12h, formatTime12hFromMin, formatDateDisplay, isUUID, mapDbStatusToUi } from "@/lib/utils";
import Header from "@/components/layout/Header";
import { useProfile } from "@/context/ProfileContext";
import { insertNotification } from "@/lib/notifications";
import { useSalonData, useBookings, useTimeUpdate } from "@/hooks";
import { useToast } from "@/context/ToastContext";
import { Appointment, Stylist, Service } from "@/types";

// ===== TYPES =====

// ===== FALLBACK DATA (only used when Supabase is unavailable) =====
const FALLBACK_STYLISTS: Stylist[] = [
  { id: "all", name: "All stylists", tone: "", short: "?" },
];

const FALLBACK_SERVICES: Service[] = [];

const STATUS_LABEL = { confirmed: "Confirmed", arrived: "Arrived", completed: "Completed", noshow: "No-show", cancelled: "Cancelled" };
const STATUS_ORDER: ("confirmed" | "arrived" | "completed" | "noshow")[] = ["confirmed", "arrived", "completed", "noshow"];

const toneBgMap: Record<string, string> = {
  a: 'bg-[#F1EAD9] text-[#8C6A1E]',
  b: 'bg-teal-soft text-teal',
  c: 'bg-blue-soft text-blue',
  d: 'bg-[#F4DCE4] text-[#A03364]',
  e: 'bg-amber-soft text-amber-ink',
  f: 'bg-rose-soft text-rose',
};

// ===== MAIN DASHBOARD PAGE =====
export default function DashboardPage() {
  const { profile, salonId, loading: profileLoading } = useProfile();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | number | null>(3); // Active one starts expanded
  const [filter, setFilter] = useState<string | number>("all");
  const [day, setDay] = useState("today");
  const [showWalkIn, setShowWalkIn] = useState(false);

  // Custom Hooks Extraction
  const { bookings: appts, setBookings: setAppts, loading: loadingBookings, refresh: refreshBookings } = useBookings(salonId, day);
  const { nowTimeMin, dateDisplayStr } = useTimeUpdate(!!salonId);
  const { show: showFlash } = useToast();

  const { stylists: dbStylists, services: dbServices, loading: salonDataLoading } = useSalonData(salonId);

  const pageLoading = profileLoading || salonDataLoading || loadingBookings;



  // Combine lists depending on connection state
  const activeStylists = useMemo(() => {
    if (dbStylists.length > 0) {
      return [{ id: "all", name: "All stylists", tone: "", short: "?" }, ...dbStylists];
    }
    return FALLBACK_STYLISTS;
  }, [dbStylists]);

  const activeServices = useMemo(() => {
    if (dbServices.length > 0) {
      return dbServices;
    }
    return FALLBACK_SERVICES;
  }, [dbServices]);

  // Layout settings
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

  const unrepliedCount = useMemo(() => {
    if (day !== "today") return 0;
    return appts.filter((a) => {
      if (a.status !== "confirmed") return false;
      const apptMin = toMin(a.time);
      return apptMin >= nowTimeMin && apptMin <= nowTimeMin + 120;
    }).length;
  }, [appts, nowTimeMin, day]);

  const updateStatus = async (id: string | number, status: "confirmed" | "arrived" | "completed" | "noshow") => {
    setAppts(prev => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    showFlash(`Status updated to ${STATUS_LABEL[status]}`, 1800);

    if (typeof id === "string" && isUUID(id)) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const dbStatus = status === "confirmed" ? "Confirmed"
                       : status === "arrived" ? "Arrived"
                       : status === "completed" ? "Completed"
                       : "No-show";
        const { error } = await supabase
          .from("bookings")
          .update({ status: dbStatus })
          .eq("id", id);
        if (error) {
          console.error("Error updating status in Supabase:", error);
        } else {
          // Insert notification
          const appt = appts.find(a => a.id === id);
          if (appt && salonId) {
            insertNotification({
              salon_id: salonId,
              type: "status_update",
              title: "Booking updated",
              body: `${appt.customer} marked as ${STATUS_LABEL[status]}`,
              meta: { booking_id: id, status },
            });
          }
        }
      }
    }
  };

  const sendWA = (a: Appointment) => {
    showFlash(`WhatsApp opened for ${a.customer}`, 1800);
  };

  const addWalkIn = async ({ name, phone, svc, stylistId }: { name: string; phone: string; svc: Service; stylistId: string | number }) => {
    const supabase = getSupabaseBrowserClient();
    
    if (supabase && salonId && isUUID(String(svc.id)) && isUUID(String(stylistId))) {
      try {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const startTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
        
        const { error } = await supabase.rpc("create_public_booking", {
          p_salon_id: salonId,
          p_customer_name: name,
          p_phone: phone || "+91 99999 99999",
          p_stylist_id: stylistId,
          p_date: dateStr,
          p_start_time: startTimeStr,
          p_duration: svc.duration,
          p_service_ids: [svc.id]
        });

        if (error) throw error;

        insertNotification({
          salon_id: salonId!,
          type: "walk_in",
          title: "Walk-in arrived",
          body: `${name} walked in for ${svc.name}`,
          meta: { customer_name: name, service: svc.name },
        });

        showFlash(`${name} added to schedule`, 2000);
        refreshBookings();
        return;
      } catch (err: any) {
        console.error("Error creating walk-in booking:", err);
        showFlash(`Error: ${err.message || "Failed to save booking"}`, 3000);
      }
    }

    const initials = name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const tones = ["a", "b", "c", "d", "e", "f"];
    const tone = tones[name.length % tones.length];

    const newAppt: Appointment = {
      id: Math.max(...appts.map((a) => typeof a.id === "number" ? a.id : 0), 0) + 1,
      time: "13:30",
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
    showFlash(`${name} added to schedule`, 2000);
  };

  const nowIdx = filtered.findIndex((a) => toMin(a.time) > nowTimeMin);

  const formatTime = (min: number) => {
    let h = Math.floor(min / 60);
    const m = min % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const greeting = nowTimeMin < 12 * 60 ? "Good morning" : nowTimeMin < 17 * 60 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen pb-[calc(var(--bottom-nav-h)+32px)] animate-[fadeIn_0.22s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      {/* Top Navbar */}
      <Header
        title={`${greeting}, ${profile.name.split(" ")[0]} 👋`}
        subtitle={dateDisplayStr}
        todayRevenue={todayRevenue}
      />

      <main className="max-w-[1200px] mx-auto px-8 py-7">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 min-[521px]:grid-cols-3 gap-2.5 min-[521px]:max-[768px]:gap-2 md:gap-4 mb-[28px]">
          {pageLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-bg-2 rounded-xl min-h-[90px]" />
            ))
          ) : (
            <>
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
                icon={<I.calendar />}
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
            </>
          )}
        </div>

        {/* Schedule Header */}
        <div className="flex flex-row items-center justify-between gap-4 mb-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-3">
          <div className="flex items-baseline gap-3 max-[768px]:w-full max-[768px]:justify-between">
            <h2 className="text-lg font-semibold tracking-tight m-0">Today's schedule</h2>
            <span className="text-[13px] text-ink-3 font-mono">{filtered.length} appointments</span>
          </div>
          <div className="flex items-center gap-3 max-[768px]:w-full max-[768px]:justify-between">
            <div className="inline-flex relative items-center w-[180px] p-[3px] bg-bg-2 rounded-[9px] text-[13px]">
              <div
                className="absolute top-[3px] bottom-[3px] left-[3px] bg-white rounded-[7px] transition-transform duration-220 ease-[cubic-bezier(0.16,1,0.3,1)] z-0 shadow-[0_1px_3px_rgba(0,0,0,0.08),_0_1px_0_var(--line)] will-change-transform"
                style={{
                  width: "calc(50% - 3px)",
                  transform: day === "today" ? "translateX(0)" : "translateX(100%)",
                }}
              />
              <button
                className={`flex-1 text-center py-1.5 px-1 border-0 bg-transparent rounded-[7px] cursor-pointer text-[13px] transition-colors duration-150 relative z-10 ${
                  day === "today" ? "text-ink font-medium" : "text-ink-3"
                }`}
                onClick={() => setDay("today")}
              >
                Today
              </button>
              <button
                className={`flex-1 text-center py-1.5 px-1 border-0 bg-transparent rounded-[7px] cursor-pointer text-[13px] transition-colors duration-150 relative z-10 ${
                  day === "tomorrow" ? "text-ink font-medium" : "text-ink-3"
                }`}
                onClick={() => setDay("tomorrow")}
              >
                Tomorrow
              </button>
            </div>
            <button
              onClick={() => setShowWalkIn(true)}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg border border-line-2 bg-white text-sm font-semibold text-ink cursor-pointer hover:border-ink-3 hover:bg-bg-2 active:translate-y-[1px] transition-all duration-150"
            >
              Walk-in
            </button>
            <Link
              href="/dashboard/new-booking"
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-teal !text-white text-sm font-semibold cursor-pointer hover:bg-teal-ink active:translate-y-[1px] transition-all duration-150 no-underline"
            >
              + New booking
            </Link>
          </div>
        </div>

        {/* Stylist Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {activeStylists.map((s) => (
            <button
              key={s.id}
              className={`h-8 px-3 rounded-full border inline-flex items-center gap-2 text-[13px] cursor-pointer transition-all duration-180 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-ink-3 hover:-translate-y-[1px] active:scale-96 will-change-transform ${
                filter === s.id
                  ? "bg-ink text-white border-ink"
                  : "bg-white border-line-2 text-ink-2"
              }`}
              onClick={() => setFilter(s.id)}
            >
              {s.id !== "all" && (
                <span className={`inline-grid place-items-center font-bold rounded-full w-[18px] h-[18px] text-[9px] mr-1 border-0 shrink-0 ${toneBgMap[(s.tone || "a").replace("tone-", "")] || "bg-bg-2 text-ink-2"}`}>
                  {s.name[0]}
                </span>
              )}
              {s.name}
              {s.id !== "all" && (
                <span className={`text-[11px] ml-1.5 ${filter === s.id ? "text-white/60" : "text-ink-4"}`}>
                  {appts.filter((a) => a.stylist === s.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Appointments Timeline */}
        <div className="relative pl-[88px] pt-4 transition-opacity duration-220 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-opacity">
          <div className="absolute left-[76px] top-0 bottom-0 w-[1px] bg-line"></div>
          {pageLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 mb-3 items-start">
                <div className="w-[52px] shrink-0" />
                <div className="absolute left-[-16px] top-0 -translate-y-1/2 w-[11px] h-[11px] rounded-full bg-white border-2 border-line-2 z-10" />
                <div className="flex-1 h-[72px] bg-bg-2 rounded-xl animate-pulse" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div>
              {showNowLine && day === "today" && (
                <NowLine nowTimeMin={nowTimeMin} formatTime={formatTime} />
              )}
              <div className="py-8 text-center text-ink-3 text-sm">
                No appointments for this day.
              </div>
            </div>
          ) : (
            filtered.map((appt, i) => (
              <React.Fragment key={`${day}-${filter}-${appt.id}`}>
                {showNowLine && nowIdx === i && day === "today" && (
                  <NowLine nowTimeMin={nowTimeMin} formatTime={formatTime} />
                )}
                <ApptRow
                  appt={appt}
                  expanded={expandedId === appt.id}
                  onToggle={() => setExpandedId(expandedId === appt.id ? null : appt.id)}
                  onStatus={updateStatus}
                  onWA={sendWA}
                  stylists={activeStylists}
                  nowTimeMin={nowTimeMin}
                />
              </React.Fragment>
            ))
          )}
          {showNowLine && nowIdx === -1 && day === "today" && filtered.length > 0 && (
            <NowLine nowTimeMin={nowTimeMin} formatTime={formatTime} />
          )}
        </div>

        {/* Campaign Callout */}
        {unrepliedCount > 0 && (
          <div className="mt-6 p-[18px_20px] bg-teal-soft border border-teal-soft-2 rounded-xl flex items-center gap-3.5 text-teal-ink text-[13px]">
            <div className="w-9 h-9 rounded-[10px] bg-teal text-white grid place-items-center shrink-0">
              <I.wa className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1">
              <strong className="font-semibold">
                {unrepliedCount} customer{unrepliedCount > 1 ? "s haven't" : " hasn't"} replied to their reminder.
              </strong>{" "}
              Send a follow-up WhatsApp in one tap.
            </div>
            <button
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-teal !text-white text-xs font-semibold cursor-pointer hover:bg-teal-ink active:translate-y-[1px] transition-all duration-150"
              onClick={() => router.push("/dashboard/bookings")}
            >
              Review →
            </button>
          </div>
        )}
      </main>




      {/* Walk-In Modal */}
      {showWalkIn && <WalkInModal onClose={() => setShowWalkIn(false)} onAdd={addWalkIn} services={activeServices} stylists={activeStylists} />}



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
    <div className="rounded-xl bg-white border border-line flex flex-col gap-1 relative overflow-hidden p-[16px_18px] max-[768px]:p-[14px_12px] max-[520px]:flex-row max-[520px]:items-center max-[520px]:justify-between max-[520px]:p-[12px_16px] max-[520px]:gap-3">
      <div className="text-xs max-[768px]:text-[10px] max-[520px]:text-[11px] text-ink-3 tracking-wider uppercase font-medium flex items-center gap-2">
        <span className="grid place-items-center w-4 h-4 text-ink-3">{icon}</span>
        {label}
      </div>
      <div className="text-[28px] max-[768px]:text-[20px] font-semibold tracking-tight mt-1.5 max-[520px]:mt-0 flex items-baseline gap-1.5">
        {prefix && <small className="text-sm font-normal text-ink-3 tracking-normal mr-[2px]">{prefix}</small>}
        {value}
        {suffix && <small className="text-sm font-normal text-ink-3 tracking-normal">{suffix}</small>}
      </div>
      {delta && (
        <div className="mt-1.5 text-xs text-ink-3 flex items-center gap-1.5 max-[768px]:hidden">
          <span className={`${deltaTone === "down" ? "text-rose" : "text-green"} font-medium`}>
            {deltaTone === "down" ? "↓" : "↑"} {delta}
          </span>
          <span>vs. yesterday</span>
        </div>
      )}
      {spark && <div className="absolute right-4 top-4 opacity-90 max-[768px]:hidden">{spark}</div>}
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
  onStatus: (id: string | number, status: "confirmed" | "arrived" | "completed" | "noshow") => void;
  onWA: (a: Appointment) => void;
  stylists: Stylist[];
  nowTimeMin: number;
}

function ApptRow({ appt, expanded, onToggle, onStatus, onWA, stylists, nowTimeMin }: ApptRowProps) {
  const router = useRouter();
  const stylist = stylists.find((s) => s.id === appt.stylist) || stylists[1] || { id: "unknown", name: appt.stylist, tone: "a" };
  const start = toMin(appt.time);
  const end = start + appt.duration;
  const startTimeFormatted = formatTime12hFromMin(start);
  const endTimeFormatted = formatTime12hFromMin(end);
  const isActive = start <= nowTimeMin && nowTimeMin < end;

  const bookingParam = typeof appt.id === "string" ? appt.id : String(appt.id);
  const customerParam = appt.customerId ? String(appt.customerId) : String(appt.id);

  return (
    <div className="relative grid grid-cols-1 mb-3 animate-[fadeInUp_0.28s_cubic-bezier(0.16,1,0.3,1)_forwards] will-change-[opacity,transform]">
      <div className="absolute left-[-88px] top-0 -translate-y-1/2 w-16 text-right font-mono text-xs font-medium text-ink-2">
        {startTimeFormatted}
        <small className="block text-[10px] text-ink-4 mt-0.5 font-normal">{appt.duration} min</small>
      </div>
      <div className={`absolute left-[-16px] top-0 -translate-y-1/2 w-[11px] h-[11px] rounded-full border-2 z-10 ${
        isActive ? "bg-teal border-teal" : appt.status === "completed" ? "bg-ink-4 border-ink-4" : appt.status === "cancelled" ? "bg-bg-2 border-line-2" : "bg-white border-line-2"
      }`} />
      <div
        className={`bg-white border rounded-xl p-[12px_14px] grid grid-cols-[40px_1fr_auto_auto] gap-3.5 items-center cursor-pointer transition-all duration-150 ${
          expanded ? "border-teal rounded-b-none" : "border-line hover:border-line-2 hover:bg-[#FCFCFA]"
        }`}
        onClick={onToggle}
      >
        <div className={`w-10 h-10 rounded-full shrink-0 grid place-items-center font-bold text-sm ${toneBgMap[appt.tone] || 'bg-bg-2 text-ink-2'}`}>
          {appt.initials}
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className={`text-sm font-semibold tracking-tight ${appt.status === "cancelled" ? "line-through opacity-60 text-ink-3" : "text-ink"}`}>
            <Link
              href={`/dashboard/customers/${customerParam}`}
              onClick={(e) => e.stopPropagation()}
              className={`hover:underline font-semibold text-inherit ${appt.status === "cancelled" ? "line-through" : "no-underline"}`}
            >
              {appt.customer}
            </Link>
          </div>
          <div className={`text-[13px] text-ink-3 mt-0.5 ${appt.status === "cancelled" ? "line-through opacity-60" : ""}`}>
            <strong className="text-ink-2 font-medium">{appt.service}</strong> · with {stylist.name} · {startTimeFormatted}–{endTimeFormatted}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center gap-[4px] text-[9px] font-medium px-[7px] py-[3px] rounded-full tracking-[0.01em] whitespace-nowrap ${
            appt.status === 'confirmed' ? 'text-[#1957B8] bg-[#E6EEFA]' :
            appt.status === 'arrived' ? 'text-[#B47A0F] bg-amber-soft' :
            appt.status === 'completed' ? 'text-[#137A4A] bg-[#DFF1E6]' :
            appt.status === 'noshow' ? 'text-rose bg-[#FAE2DC]' :
            appt.status === 'cancelled' ? 'text-ink-3 bg-bg-2' : ''
          }`}>
            <span className="w-[5px] h-[5px] rounded-full bg-current inline-block"></span>
            {STATUS_LABEL[appt.status]}
          </span>
          <div className="text-[13px] text-ink-2 font-mono font-medium">₹{appt.price.toLocaleString("en-IN")}</div>
        </div>
        <div className={`grid place-items-center transition-transform duration-150 ${expanded ? "rotate-180 text-ink-2" : "text-ink-4"}`}>
          <I.chev className="w-[18px] h-[18px]" />
        </div>
      </div>

      {expanded && (
        <div className="mt-[-1px] border border-t-0 border-teal rounded-b-xl bg-white p-[18px_20px_20px] max-[768px]:p-3.5 grid grid-cols-3 max-[768px]:grid-cols-2 max-[480px]:grid-cols-1 gap-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] text-ink-3 tracking-wider uppercase font-medium mb-1.5">Customer</div>
            <div className="text-[13px] text-ink leading-relaxed">
              <Link
                href={`/dashboard/customers/${customerParam}`}
                className="text-teal font-semibold no-underline hover:underline"
              >
                {appt.customer} ↗
              </Link>
              <br />
              <span className="text-ink-3">{appt.phone}</span>
              <br />
              <span className="text-ink-3">{appt.visits} previous visits</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] text-ink-3 tracking-wider uppercase font-medium mb-1.5">Service</div>
            <div className="text-[13px] text-ink leading-relaxed">
              <strong className="font-semibold">{appt.service}</strong>
              <br />
              <span className="text-ink-3">{appt.duration} min · ₹{appt.price.toLocaleString("en-IN")}</span>
              <br />
              <span className="text-ink-3">Stylist: {stylist.name}</span>
              <br />
              <Link
                href={`/dashboard/bookings/${bookingParam}`}
                className="text-teal font-semibold text-xs inline-block mt-1 no-underline hover:underline"
              >
                View full detail ↗
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] text-ink-3 tracking-wider uppercase font-medium mb-1.5">Notes</div>
            <div className={`text-[13px] leading-relaxed ${appt.note ? "text-ink-2" : "text-ink-4"}`}>
              {appt.note || "No notes yet — tap to add."}
            </div>
          </div>
          <div className="col-span-full flex gap-2 pt-4 border-t border-line flex-wrap">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                className={`h-[34px] px-3 rounded-lg border text-[13px] cursor-pointer inline-flex items-center gap-1.5 transition-colors duration-150 ${
                  appt.status === s
                    ? "border-teal text-teal bg-teal-soft font-medium"
                    : "border-line bg-white text-ink-2 hover:border-ink-3 hover:text-ink"
                } ${s === "noshow" ? "hover:border-rose hover:text-rose" : ""}`}
                onClick={() => {
                  if (s === "completed") {
                    router.push(`/dashboard/checkout/${bookingParam}`);
                  } else {
                    onStatus(appt.id, s);
                  }
                }}
              >
                {appt.status === s && "✓ "}
                {STATUS_LABEL[s]}
              </button>
            ))}
            <Link
              href={`/dashboard/checkout/${bookingParam}`}
              className="h-[34px] px-3 rounded-lg border border-teal !text-white bg-teal text-[13px] cursor-pointer inline-flex items-center gap-1.5 font-semibold hover:bg-teal-ink transition-colors duration-150 no-underline"
            >
              Checkout / POS
            </Link>
            <button
              className="h-[34px] px-3 rounded-lg border border-wa text-wa bg-white text-[13px] cursor-pointer inline-flex items-center gap-1.5 ml-auto hover:bg-wa-soft/10 transition-colors duration-150"
              onClick={() => onWA(appt)}
            >
              <I.wa className="w-3.5 h-3.5" /> Message on WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// "Now" timeline indicator
function NowLine({ nowTimeMin, formatTime }: { nowTimeMin: number; formatTime: (min: number) => string }) {
  return (
    <div className="relative h-6 mb-2 pointer-events-none flex items-center z-20">
      <div className="absolute left-[-88px] top-0 w-16 text-right font-mono text-xs font-medium text-rose">
        {formatTime(nowTimeMin).replace(" AM", "").replace(" PM", "")}
        <small className="block text-[10px] text-rose/70 mt-0.5 font-normal">now</small>
      </div>
      <div className="absolute left-[-16px] top-2 w-[11px] h-[11px] rounded-full bg-rose shadow-[0_0_0_4px_rgba(196,69,43,0.15)] z-20"></div>
      <div className="absolute left-[-5px] right-0 top-[13px] h-[1px] bg-rose opacity-35"></div>
    </div>
  );
}

// Add Walk-In Appointment Modal
interface WalkInModalProps {
  onClose: () => void;
  onAdd: (data: { name: string; phone: string; svc: Service; stylistId: string | number }) => void;
  services: Service[];
  stylists: Stylist[];
}

function WalkInModal({ onClose, onAdd, services, stylists }: WalkInModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  
  const defaultSvcId = services[0]?.id || "s1";
  const defaultStylistId = stylists.filter((s) => s.id !== "all")[0]?.id || "anjali";

  const [svcId, setSvcId] = useState(defaultSvcId);
  const [stylistId, setStylistId] = useState(defaultStylistId);

  const selectedSvc = services.find((s) => s.id === svcId) || services[0];
  const canSubmit = name.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/45 z-100 grid place-items-center p-6 backdrop-blur-[2px] animate-[fadeIn_0.15s_ease]" onClick={onClose}>
      <div className="w-[min(440px,100%)] max-w-[calc(100vw-32px)] bg-white rounded-2xl border border-line overflow-hidden animate-[pop_0.18s_cubic-bezier(0.2,0.9,0.3,1.2)]" onClick={(e) => e.stopPropagation()}>
        <div className="p-[20px_24px] border-b border-line flex items-center justify-between">
          <h3 className="text-[17px] font-semibold tracking-tight m-0">Add walk-in booking</h3>
          <button className="w-8 h-8 rounded-lg border-0 bg-bg-2 text-ink-2 cursor-pointer grid place-items-center" onClick={onClose}>
            <I.x className="w-4 h-4" />
          </button>
        </div>
        <div className="p-[20px_24px] flex flex-col gap-3.5">
          <div className="grid grid-cols-2 max-[480px]:grid-cols-1 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-3 font-medium">Customer name</label>
              <input
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="w-full h-[42px] px-3.5 rounded-[10px] border border-line-2 bg-white font-sans text-sm text-ink outline-none transition-colors duration-150 focus:border-teal min-w-0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-3 font-medium">Phone (optional)</label>
              <input
                placeholder="+91 98xxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-[42px] px-3.5 rounded-[10px] border border-line-2 bg-white font-sans text-sm text-ink outline-none transition-colors duration-150 focus:border-teal min-w-0"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink-3 font-medium">Service</label>
            <div className="grid grid-cols-2 gap-2">
              {services.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  className={`p-[10px_12px] border rounded-[10px] cursor-pointer text-[13px] text-left font-sans flex justify-between items-center transition-all duration-150 ${
                    svcId === s.id ? "border-teal bg-teal-soft text-teal-ink font-medium" : "border-line bg-white text-ink hover:border-ink-3"
                  }`}
                  onClick={() => setSvcId(s.id)}
                >
                  <span>{s.name}</span>
                  <small className={`font-mono text-xs ${svcId === s.id ? "text-teal" : "text-ink-3"}`}>
                    {s.duration}m · ₹{s.price}
                  </small>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink-3 font-medium">Stylist</label>
            <select
              value={stylistId}
              onChange={(e) => setStylistId(e.target.value)}
              className="w-full h-[42px] px-3.5 rounded-[10px] border border-line-2 bg-white font-sans text-sm text-ink outline-none transition-colors duration-150 focus:border-teal"
            >
              {stylists.filter((s) => s.id !== "all").map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-[16px_24px] border-t border-line bg-bg flex gap-2.5 justify-end">
          <button
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] font-sans text-sm font-medium border border-transparent cursor-pointer bg-transparent text-ink-2 hover:text-ink hover:bg-bg-2 transition-all duration-150"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] font-sans text-sm font-medium border border-transparent cursor-pointer bg-teal !text-white hover:bg-teal-ink transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canSubmit}
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
