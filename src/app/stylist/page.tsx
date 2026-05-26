"use client";

import React, { useState, useEffect } from "react";
import StylistShell from "@/components/layout/StylistShell";
import { Avatar, Badge, Icons as I, Toggle } from "@/components/ui";
import { getActualServiceMinutes, getNextProgressAction, PROGRESS_ACTION_LABEL } from "@/lib/booking-progress";
import { STYLIST_STATUS_LABEL } from "@/constants/stylist";
import { formatDateDisplay, formatDateKey, formatTime12hFromMin, toMin } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import type { BookingProgressAction, StylistAppointment } from "@/types";

// "Now" timeline indicator
function NowLine({ nowTimeMin, formatTime }: { nowTimeMin: number; formatTime: (min: number) => string }) {
  return (
    <div className="relative h-10 mb-4 pointer-events-none flex items-center z-20 animate-[fadeIn_0.22s_ease-out_forwards]">
      <div className="absolute left-[-88px] top-0 w-16 text-right font-mono text-xs font-medium text-rose">
        {formatTime(nowTimeMin).replace(" AM", "").replace(" PM", "")}
        <small className="block text-[10px] text-rose/70 mt-0.5 font-normal">now</small>
      </div>
      <div className="absolute left-[-16px] top-[14.5px] w-[11px] h-[11px] rounded-full bg-rose shadow-[0_0_0_4px_rgba(196,69,43,0.15)] z-20"></div>
      <div className="absolute left-[-5px] right-0 top-[20px] h-[1px] bg-rose opacity-35"></div>
    </div>
  );
}

function AppointmentRow({
  appointment,
  onStatus,
  expanded,
  onToggle,
  nowTimeMin
}: {
  appointment: StylistAppointment;
  onStatus: (id: string, action: BookingProgressAction) => Promise<void>;
  expanded: boolean;
  onToggle: () => void;
  nowTimeMin: number;
}) {
  const { show } = useToast();
  const start = toMin(appointment.time);
  const end = start + appointment.duration;
  const startTimeFormatted = formatTime12hFromMin(start);
  const endTimeFormatted = formatTime12hFromMin(end);
  const nextAction = getNextProgressAction(appointment.status);
  const actualMinutes = getActualServiceMinutes(appointment);
  const isActive = start <= nowTimeMin && nowTimeMin < end;

  const updateStatus = async (action: BookingProgressAction) => {
    try {
      await onStatus(appointment.id, action);
      show(PROGRESS_ACTION_LABEL[action], 1600);
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not update appointment", 2600);
    }
  };

  return (
    <div className="relative grid grid-cols-1 mb-3 animate-[fadeInUp_0.28s_cubic-bezier(0.16,1,0.3,1)_forwards] will-change-[opacity,transform]">
      {/* Time column left */}
      <div className="absolute left-[-88px] top-0 -translate-y-1/2 w-16 text-right font-mono text-xs font-medium text-ink-2">
        {startTimeFormatted}
        <small className="block text-[10px] text-ink-4 mt-0.5 font-normal">{appointment.duration} min</small>
      </div>
      {/* Circle dot in timeline */}
      <div className={`absolute left-[-16px] top-0 -translate-y-1/2 w-[11px] h-[11px] rounded-full border-2 z-10 ${
        isActive ? "bg-teal border-teal" : appointment.status === "completed" ? "bg-ink-4 border-ink-4" : "bg-white border-line-2"
      }`} />
      
      {/* Expandable card */}
      <div
        className={`bg-white border rounded-xl p-[12px_14px] grid grid-cols-[40px_1fr_auto_auto] gap-3.5 items-center cursor-pointer transition-all duration-150 ${
          expanded ? "border-teal rounded-b-none" : "border-line hover:border-line-2 hover:bg-[#FCFCFA]"
        }`}
        onClick={onToggle}
      >
        <Avatar initials={appointment.customerInitials} tone={appointment.tone} />
        <div className="flex flex-col flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink truncate">
            {appointment.customerName}
          </div>
          <div className="text-[13px] text-ink-3 mt-0.5">
            <strong className="text-ink-2 font-medium">{appointment.service}</strong> · {startTimeFormatted}–{endTimeFormatted}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <Badge tone={appointment.status}>
              {STYLIST_STATUS_LABEL[appointment.status]}
            </Badge>
          </div>
        </div>
        <div className={`grid place-items-center transition-transform duration-150 ${expanded ? "rotate-180 text-ink-2" : "text-ink-4"}`}>
          <I.chev className="w-[18px] h-[18px]" />
        </div>
      </div>

      {expanded && (
        <div className="mt-[-1px] border border-t-0 border-teal rounded-b-xl bg-white p-[18px_20px_20px] max-[768px]:p-3.5 grid grid-cols-2 max-[480px]:grid-cols-1 gap-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] text-ink-3 tracking-wider uppercase font-medium mb-1.5">Customer</div>
            <div className="text-[13px] text-ink leading-relaxed">
              <span className="font-semibold text-ink-2">{appointment.customerName}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] text-ink-3 tracking-wider uppercase font-medium mb-1.5">Service</div>
            <div className="text-[13px] text-ink leading-relaxed">
              <strong className="font-semibold">{appointment.service}</strong>
              <br />
              <span className="text-ink-3">{appointment.duration} min</span>
              {actualMinutes !== null && (
                <>
                  <br />
                  <span className="text-ink-3">{actualMinutes} min actual · {appointment.duration} min estimate</span>
                </>
              )}
            </div>
          </div>
          <div className="col-span-full flex flex-col gap-1.5">
            <div className="text-[11px] text-ink-3 tracking-wider uppercase font-medium mb-1.5">Notes</div>
            <div className={`text-[13px] leading-relaxed ${appointment.notes ? "text-ink-2" : "text-ink-4"}`}>
              {appointment.notes || "No notes yet."}
            </div>
          </div>
          <div className="col-span-full flex gap-2 pt-4 border-t border-line flex-wrap">
            {nextAction && (
              <button
                className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg border border-transparent font-sans text-xs font-semibold cursor-pointer transition-colors duration-150"
                style={{ borderColor: "var(--teal)", color: "var(--teal)", background: "var(--teal-soft)" }}
                onClick={() => updateStatus(nextAction)}
              >
                {PROGRESS_ACTION_LABEL[nextAction]}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StylistDashboardPage() {
  const [day, setDay] = useState("today");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nowTimeMin, setNowTimeMin] = useState(0);

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setNowTimeMin(d.getHours() * 60 + d.getMinutes());
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (min: number) => {
    let h = Math.floor(min / 60);
    const m = min % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return (
    <StylistShell title="My day" subtitle={formatDateDisplay(new Date())}>
      {({ profile, weekAppointments, loading, advanceAppointmentStatus }) => {
        const todayDate = new Date();
        const tomorrowDate = new Date();
        tomorrowDate.setDate(todayDate.getDate() + 1);

        const todayKey = formatDateKey(todayDate);
        const tomorrowKey = formatDateKey(tomorrowDate);

        const targetKey = day === "today" ? todayKey : tomorrowKey;
        const filteredAppts = weekAppointments.filter((item) => item.date === targetKey);

        const upcoming = weekAppointments.filter((item) => item.date === todayKey && item.status === "confirmed").length;
        const chairMinutes = weekAppointments.filter((item) => item.date === todayKey).reduce((sum, item) => sum + item.duration, 0);

        const sortedAppts = [...filteredAppts].sort((a, b) => toMin(a.time) - toMin(b.time));
        const nowIdx = sortedAppts.findIndex((a) => toMin(a.time) > nowTimeMin);

        return (
          <main className="max-w-[1200px] mx-auto px-4 md:px-8 py-7">
            <div className="grid grid-cols-1 min-[620px]:grid-cols-3 gap-3 mb-6">
              {[
                { label: "Appointments", value: weekAppointments.filter(item => item.date === todayKey).length, hint: "today", icon: <I.calendar /> },
                { label: "Upcoming", value: upcoming, hint: "confirmed", icon: <I.clock /> },
                { label: "Chair time", value: `${Math.round(chairMinutes / 60)}h`, hint: `${chairMinutes} min`, icon: <I.scissors /> },
              ].map((metric) => (
                <div key={metric.label} className="bg-white border border-line rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.05em] text-ink-3 font-medium flex items-center gap-2">{metric.icon}{metric.label}</div>
                    <div className="text-2xl font-semibold tracking-tight mt-1">{metric.value}</div>
                    <div className="text-xs text-ink-3 mt-0.5">{metric.hint}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4 mb-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-3">
              <div className="flex items-baseline gap-3 max-[768px]:w-full max-[768px]:justify-between">
                <h2 className="text-lg font-semibold tracking-tight m-0 flex-1">
                  {day === "today" ? "Today's appointments" : "Tomorrow's appointments"}
                </h2>
                <span className="text-xs text-ink-3 font-mono whitespace-nowrap">{profile?.name || "Stylist"}</span>
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
              </div>
            </div>

            {loading ? (
              <div className="relative pl-[88px] pt-4">
                <div className="absolute left-[76px] top-0 bottom-0 w-[1px] bg-line animate-pulse"></div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 mb-3 items-start relative min-h-[72px]">
                    <div className="absolute left-[-88px] top-0 -translate-y-1/2 w-16 h-3 bg-bg-2 rounded animate-pulse" />
                    <div className="absolute left-[-16px] top-0 -translate-y-1/2 w-[11px] h-[11px] rounded-full bg-white border-2 border-line-2 z-10 animate-pulse" />
                    <div className="flex-1 h-[72px] bg-bg-2 rounded-xl animate-pulse" />
                  </div>
                ))}
              </div>
            ) : sortedAppts.length === 0 ? (
              <div className="bg-white border border-line rounded-xl p-8 text-center">
                <div className="w-11 h-11 rounded-full bg-bg-2 grid place-items-center mx-auto text-ink-3"><I.calendar /></div>
                <div className="font-semibold mt-3">No appointments {day === "today" ? "today" : "tomorrow"}</div>
                <div className="text-sm text-ink-3 mt-1">Your schedule is clear for now.</div>
              </div>
            ) : (
              <div className="relative pl-[88px] pt-4">
                <div className="absolute left-[76px] top-0 bottom-0 w-[1px] bg-line"></div>
                {sortedAppts.map((appointment, i) => (
                  <React.Fragment key={appointment.id}>
                    {day === "today" && nowIdx === i && (
                      <NowLine nowTimeMin={nowTimeMin} formatTime={formatTime} />
                    )}
                    <AppointmentRow
                      appointment={appointment}
                      onStatus={advanceAppointmentStatus}
                      expanded={expandedId === appointment.id}
                      onToggle={() => setExpandedId(expandedId === appointment.id ? null : appointment.id)}
                      nowTimeMin={nowTimeMin}
                    />
                  </React.Fragment>
                ))}
                {day === "today" && nowIdx === -1 && sortedAppts.length > 0 && (
                  <NowLine nowTimeMin={nowTimeMin} formatTime={formatTime} />
                )}
              </div>
            )}
          </main>
        );
      }}
    </StylistShell>
  );
}
