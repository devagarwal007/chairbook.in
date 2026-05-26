"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  BOOKING_STATUS_LABEL,
  getActualServiceMinutes,
  getNextProgressAction,
  getWaitMinutes,
  isRunningLate,
  PROGRESS_ACTION_LABEL,
  PROGRESS_ACTION_NEXT_STATUS,
} from "@/lib/booking-progress";
import { toMin, formatTime12hFromMin, isUUID } from "@/lib/utils";
import Header from "@/components/layout/Header";
import { useProfile } from "@/context/ProfileContext";
import { insertNotification } from "@/lib/notifications";
import { useSalonData, useBookings, useTimeUpdate, useBookingProgress } from "@/hooks";
import { useToast } from "@/context/ToastContext";
import { Appointment, BookingProgressAction, Stylist, Service } from "@/types";
import { Icons as I, Modal, Badge, Avatar, FormField, Toggle, FilterChip, PhoneInput } from "@/components/ui";

// ===== TYPES =====

// ===== FALLBACK DATA (only used when Supabase is unavailable) =====
const FALLBACK_STYLISTS: Stylist[] = [
  { id: "all", name: "All stylists", tone: "", short: "?" },
];

const FALLBACK_SERVICES: Service[] = [];

const STATUS_LABEL = BOOKING_STATUS_LABEL;

// ===== MAIN DASHBOARD PAGE =====
export default function DashboardPage() {
  const { profile, salonId, loading: profileLoading } = useProfile();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | number | null>(3); // Active one starts expanded
  const [filter, setFilter] = useState<string | number>("all");
  const [day, setDay] = useState("today");
  const [showWalkIn, setShowWalkIn] = useState(false);

  // Custom Hooks Extraction
  const { bookings: todayAppts, setBookings: setTodayAppts, loading: loadingToday, refresh: refreshToday } = useBookings(salonId, "today");
  const { bookings: tomorrowAppts, setBookings: setTomorrowAppts, loading: loadingTomorrow, refresh: refreshTomorrow } = useBookings(day === "tomorrow" ? salonId : null, "tomorrow");

  const appts = day === "today" ? todayAppts : tomorrowAppts;
  const setAppts = day === "today" ? setTodayAppts : setTomorrowAppts;
  const loadingBookings = day === "today" ? loadingToday : loadingTomorrow;

  const { nowTimeMin, dateDisplayStr } = useTimeUpdate(!!salonId);
  const { show: showFlash } = useToast();
  const { advanceBooking } = useBookingProgress();

  const { stylists: dbStylists, services: dbServices, loading: salonDataLoading } = useSalonData(salonId);

  const pageLoading = profileLoading || salonDataLoading || loadingBookings;
  const metricsLoading = profileLoading || salonDataLoading || loadingToday;



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
  const todayRevenue = todayAppts.filter((a) => a.status === "completed" || a.status === "arrived").reduce((s, a) => s + a.price, 0);
  const totalAppts = todayAppts.length;
  const noShows = todayAppts.filter((a) => a.status === "noshow").length;

  const timingInsights = useMemo(() => {
    const completed = todayAppts
      .map((appt) => ({ appt, actual: getActualServiceMinutes(appt) }))
      .filter((item): item is { appt: Appointment; actual: number } => item.actual !== null);

    const avgActual = completed.length
      ? Math.round(completed.reduce((sum, item) => sum + item.actual, 0) / completed.length)
      : null;
    const avgEstimate = completed.length
      ? Math.round(completed.reduce((sum, item) => sum + item.appt.duration, 0) / completed.length)
      : null;

    const late = todayAppts.filter((appt) => isRunningLate(appt.status, appt.time, appt.duration, nowTimeMin));
    const stylistStats = new Map<string | number, { total: number; onTime: number }>();

    completed.forEach(({ appt, actual }) => {
      const current = stylistStats.get(appt.stylist) || { total: 0, onTime: 0 };
      current.total += 1;
      if (actual <= appt.duration) current.onTime += 1;
      stylistStats.set(appt.stylist, current);
    });

    const bestStylist = Array.from(stylistStats.entries())
      .filter(([, stat]) => stat.total > 0)
      .sort((a, b) => (b[1].onTime / b[1].total) - (a[1].onTime / a[1].total))[0];

    const bestStylistName = bestStylist
      ? activeStylists.find((stylist) => stylist.id === bestStylist[0])?.name || "Top stylist"
      : "Need completed bookings";

    return {
      avgActual,
      avgEstimate,
      runningLate: late.length,
      urgentLate: late.sort((a, b) => toMin(a.time) - toMin(b.time))[0],
      bestStylistName,
    };
  }, [activeStylists, nowTimeMin, todayAppts]);

  const unrepliedCount = useMemo(() => {
    if (day !== "today") return 0;
    return appts.filter((a) => {
      if (a.status !== "confirmed") return false;
      const apptMin = toMin(a.time);
      return apptMin >= nowTimeMin && apptMin <= nowTimeMin + 120;
    }).length;
  }, [appts, nowTimeMin, day]);

  const advanceStatus = async (id: string | number, action: BookingProgressAction) => {
    const nextStatus = PROGRESS_ACTION_NEXT_STATUS[action];
    setAppts(prev => prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a)));

    if (typeof id === "string" && isUUID(id)) {
      try {
        const result = await advanceBooking(id, action);
        setAppts(prev => prev.map((a) => (a.id === id ? {
          ...a,
          status: result.status,
          arrivedAt: result.arrivedAt ?? a.arrivedAt,
          startedAt: result.startedAt ?? a.startedAt,
          completedAt: result.completedAt ?? a.completedAt,
          actualDurationMinutes: result.actualDurationMinutes ?? a.actualDurationMinutes,
        } : a)));
        const appt = appts.find(a => a.id === id);
        if (appt && salonId) {
          insertNotification({
            salon_id: salonId,
            stylist_id: typeof appt.stylist === "string" && isUUID(appt.stylist) ? appt.stylist : null,
            type: "status_update",
            title: "Booking updated",
            body: `${appt.customer} marked as ${STATUS_LABEL[result.status]}`,
            meta: { booking_id: id, status: result.status },
          });
        }
      } catch (error) {
        console.error("Error advancing booking status:", error);
        const errMsg = error instanceof Error
          ? error.message
          : (error && typeof error === "object" && "message" in error)
            ? String((error as { message?: string }).message)
            : "Could not update booking";
        showFlash(errMsg, 2600);
        refreshToday();
        refreshTomorrow();
        return;
      }
    }

    showFlash(PROGRESS_ACTION_LABEL[action], 1800);
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
          p_phone: phone ? `+91 ${phone}` : "+91 99999 99999",
          p_stylist_id: stylistId,
          p_date: dateStr,
          p_start_time: startTimeStr,
          p_duration: svc.duration,
          p_service_ids: [svc.id]
        });

        if (error) throw error;

        insertNotification({
          salon_id: salonId!,
          stylist_id: typeof stylistId === "string" && isUUID(stylistId) ? stylistId : null,
          type: "walk_in",
          title: "Walk-in arrived",
          body: `${name} walked in for ${svc.name}`,
          meta: { customer_name: name, service: svc.name },
        });

        showFlash(`${name} added to schedule`, 2000);
        refreshToday();
        if (day === "tomorrow") {
          refreshTomorrow();
        }
        return;
      } catch (err) {
        console.error("Error creating walk-in booking:", err);
        const errMsg = err instanceof Error ? err.message : "Failed to save booking";
        showFlash(`Error: ${errMsg}`, 3000);
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
      phone: phone ? `+91 ${phone}` : "+91 99xxx xxxxx",
      note: "Walk-in registration",
    };

    setTodayAppts(prev => [...prev, newAppt]);
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

      <main className="max-w-[1200px] mx-auto px-4 md:px-8 py-7">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 min-[521px]:grid-cols-3 gap-2.5 min-[521px]:max-[768px]:gap-2 md:gap-4 mb-[28px]">
          {metricsLoading ? (
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

        {!metricsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-[28px]">
            <TimingInsightCard
              icon={<I.clock />}
              label="Avg service time"
              value={timingInsights.avgActual !== null && timingInsights.avgEstimate !== null ? `${timingInsights.avgActual}m` : "No data yet"}
              hint={timingInsights.avgActual !== null && timingInsights.avgEstimate !== null ? `${timingInsights.avgEstimate}m estimate` : "Completes after services finish"}
            />
            <TimingInsightCard
              icon={<I.alert />}
              label="Running late"
              value={timingInsights.runningLate}
              hint={timingInsights.urgentLate ? `${timingInsights.urgentLate.customer} needs attention` : "All active bookings on track"}
              tone={timingInsights.runningLate > 0 ? "warn" : "ok"}
            />
            <TimingInsightCard
              icon={<I.scissors />}
              label="On-time stylist"
              value={timingInsights.bestStylistName}
              hint="Based on completed bookings today"
            />
          </div>
        )}

        {/* Schedule Header */}
        <div className="flex flex-row items-center justify-between gap-4 mb-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-3">
          <div className="flex items-baseline gap-3 max-[768px]:w-full max-[768px]:justify-between">
            <h2 className="text-lg font-semibold tracking-tight m-0">{day === "today" ? "Today's schedule" : "Tomorrow's schedule"}</h2>
            <span className="text-[13px] text-ink-3 font-mono">{filtered.length} appointments</span>
          </div>
          <div className="flex items-center gap-3 max-[768px]:w-full max-[768px]:justify-between max-[480px]:flex-wrap max-[480px]:gap-2">
            <Toggle
              options={[
                { value: "today", label: "Today" },
                { value: "tomorrow", label: "Tomorrow" },
              ]}
              value={day}
              onChange={(val) => setDay(val)}
              hasSlider
              className="w-[180px] shrink-0 max-[480px]:w-full"
            />
            <div className="flex items-center gap-2 max-[480px]:w-full max-[480px]:flex-1">
              <button
                onClick={() => setShowWalkIn(true)}
                className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg border border-line-2 bg-white text-sm font-semibold text-ink cursor-pointer hover:border-ink-3 hover:bg-bg-2 active:translate-y-[1px] transition-all duration-150 whitespace-nowrap max-[480px]:flex-1"
              >
                Walk-in
              </button>
              <Link
                href="/dashboard/new-booking"
                className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-teal !text-white text-sm font-semibold cursor-pointer hover:bg-teal-ink active:translate-y-[1px] transition-all duration-150 no-underline whitespace-nowrap max-[480px]:flex-1"
              >
                + New booking
              </Link>
            </div>
          </div>
        </div>

        {/* Stylist Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {activeStylists.map((s) => (
            <FilterChip
              key={s.id}
              label={s.name}
              isActive={filter === s.id}
              onClick={() => setFilter(s.id)}
              avatarInitials={s.id !== "all" ? s.name[0] : undefined}
              avatarTone={s.id !== "all" ? (s.tone ?? undefined) : undefined}
              count={s.id !== "all" ? appts.filter((a) => a.stylist === s.id).length : undefined}
            />
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
                  onStatus={advanceStatus}
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

function TimingInsightCard({ icon, label, value, hint, tone = "neutral" }: { icon: React.ReactNode; label: string; value: string | number; hint: string; tone?: "neutral" | "ok" | "warn" }) {
  const toneClass = tone === "warn" ? "text-rose" : tone === "ok" ? "text-teal" : "text-ink";
  return (
    <div className="bg-white border border-line rounded-xl p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.05em] text-ink-3 font-medium flex items-center gap-2">
          <span className="grid place-items-center w-4 h-4 text-ink-3">{icon}</span>
          {label}
        </div>
        <div className={`text-lg font-semibold tracking-tight mt-1 truncate ${toneClass}`}>{value}</div>
        <div className="text-xs text-ink-3 mt-0.5 truncate">{hint}</div>
      </div>
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
  onStatus: (id: string | number, action: BookingProgressAction) => void;
  onWA: (a: Appointment) => void;
  stylists: Stylist[];
  nowTimeMin: number;
}

function ApptRow({ appt, expanded, onToggle, onStatus, onWA, stylists, nowTimeMin }: ApptRowProps) {
  const stylist = stylists.find((s) => s.id === appt.stylist) || stylists[1] || { id: "unknown", name: appt.stylist, tone: "a" };
  const start = toMin(appt.time);
  const end = start + appt.duration;
  const startTimeFormatted = formatTime12hFromMin(start);
  const endTimeFormatted = formatTime12hFromMin(end);
  const isActive = start <= nowTimeMin && nowTimeMin < end;
  const nextAction = getNextProgressAction(appt.status);
  const waitMinutes = getWaitMinutes(appt);
  const actualMinutes = getActualServiceMinutes(appt);
  const late = isRunningLate(appt.status, appt.time, appt.duration, nowTimeMin);
  const checkoutPrimary = appt.status === "completed";

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
        <Avatar initials={appt.initials} tone={appt.tone} />
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
          <Badge tone={appt.status}>
            {STATUS_LABEL[appt.status]}
          </Badge>
          {late && <span className="text-[11px] text-rose font-medium">Running late</span>}
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
              {actualMinutes !== null && (
                <>
                  <br />
                  <span className="text-ink-3">{actualMinutes} min actual · {appt.duration} min estimate</span>
                </>
              )}
              {waitMinutes !== null && (
                <>
                  <br />
                  <span className="text-ink-3">{waitMinutes} min wait before service</span>
                </>
              )}
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
            {nextAction && (
              <button
                className="h-[34px] px-3 rounded-lg border border-teal bg-teal text-white text-[13px] cursor-pointer inline-flex items-center gap-1.5 font-semibold hover:bg-teal-ink transition-colors duration-150"
                onClick={() => onStatus(appt.id, nextAction)}
              >
                {PROGRESS_ACTION_LABEL[nextAction]}
              </button>
            )}
            <Link
              href={`/dashboard/checkout/${bookingParam}`}
              className={`h-[34px] px-3 rounded-lg border border-teal text-[13px] cursor-pointer inline-flex items-center gap-1.5 font-semibold transition-colors duration-150 no-underline ${
                checkoutPrimary ? "!text-white bg-teal hover:bg-teal-ink" : "!text-teal bg-white hover:bg-teal-soft"
              }`}
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
    <div className="relative h-10 mb-4 pointer-events-none flex items-center z-20">
      <div className="absolute left-[-88px] top-0 w-16 text-right font-mono text-xs font-medium text-rose">
        {formatTime(nowTimeMin).replace(" AM", "").replace(" PM", "")}
        <small className="block text-[10px] text-rose/70 mt-0.5 font-normal">now</small>
      </div>
      <div className="absolute left-[-16px] top-[14.5px] w-[11px] h-[11px] rounded-full bg-rose shadow-[0_0_0_4px_rgba(196,69,43,0.15)] z-20"></div>
      <div className="absolute left-[-5px] right-0 top-[20px] h-[1px] bg-rose opacity-35"></div>
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
  const [svcQuery, setSvcQuery] = useState("");
  
  const defaultSvcId = services[0]?.id || "s1";
  const defaultStylistId = stylists.filter((s) => s.id !== "all")[0]?.id || "anjali";

  const [svcId, setSvcId] = useState(defaultSvcId);
  const [stylistId, setStylistId] = useState(defaultStylistId);

  const filteredServices = React.useMemo(() => {
    if (!svcQuery.trim()) return services;
    const q = svcQuery.toLowerCase();
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.cat && s.cat.toLowerCase().includes(q))
    );
  }, [svcQuery, services]);

  const selectedSvc = services.find((s) => s.id === svcId) || services[0];
  const isPhoneValid = !phone || phone.length === 10;
  const canSubmit = name.trim().length > 0 && isPhoneValid && selectedSvc;

  return (
    <Modal
      title="Add walk-in booking"
      onClose={onClose}
      width="min(440px, 100%)"
      footer={
        <>
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
        </>
      }
    >
      <div className="grid grid-cols-2 max-[480px]:grid-cols-1 gap-3">
        <FormField label="Customer name">
          <input
            placeholder="e.g. Priya Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full h-[42px] px-3.5 rounded-[10px] border border-line-2 bg-white font-sans text-sm text-ink outline-none transition-colors duration-150 focus:border-teal min-w-0"
          />
        </FormField>
        <FormField label="Phone (optional)">
          <PhoneInput
            value={phone}
            onChange={setPhone}
          />
        </FormField>
      </div>
      <FormField label="Service">
        <div className="flex items-center gap-2 border border-line-2 rounded-[10px] px-3.5 py-2 mb-3 bg-white">
          <I.search className="text-ink-3 shrink-0 w-4 h-4" />
          <input
            placeholder="Search service..."
            value={svcQuery}
            onChange={(e) => setSvcQuery(e.target.value)}
            className="flex-1 border-0 outline-0 text-sm font-sans bg-transparent min-w-0"
          />
          {svcQuery && (
            <button className="border-0 bg-transparent cursor-pointer grid place-items-center text-ink-3 hover:text-ink" onClick={() => setSvcQuery("")}>
              <I.x className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
          {filteredServices.map((s) => (
            <button
              key={s.id}
              className={`p-[10px_12px] border rounded-[10px] cursor-pointer text-[13px] text-left font-sans flex justify-between items-center transition-all duration-150 ${
                svcId === s.id ? "border-teal bg-teal-soft text-teal-ink font-medium" : "border-line bg-white text-ink hover:border-ink-3"
              }`}
              onClick={() => setSvcId(s.id)}
            >
              <span className="truncate mr-1">{s.name}</span>
              <small className={`font-mono text-xs shrink-0 ${svcId === s.id ? "text-teal" : "text-ink-3"}`}>
                {s.duration}m · ₹{s.price}
              </small>
            </button>
          ))}
          {filteredServices.length === 0 && (
            <div className="col-span-2 text-center text-xs text-ink-3 py-4">No services match your search.</div>
          )}
        </div>
      </FormField>
      <FormField label="Stylist">
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
      </FormField>
    </Modal>
  );
}
