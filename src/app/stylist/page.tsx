"use client";

import React from "react";
import StylistShell from "@/components/layout/StylistShell";
import { Avatar, Badge, Icons as I } from "@/components/ui";
import { getActualServiceMinutes, getNextProgressAction, PROGRESS_ACTION_LABEL } from "@/lib/booking-progress";
import { STYLIST_STATUS_LABEL } from "@/constants/stylist";
import { formatDateDisplay, formatTime12hFromMin, toMin } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import type { BookingProgressAction, StylistAppointment } from "@/types";

function AppointmentRow({ appointment, onStatus }: { appointment: StylistAppointment; onStatus: (id: string, action: BookingProgressAction) => Promise<void> }) {
  const { show } = useToast();
  const start = toMin(appointment.time);
  const end = start + appointment.duration;
  const nextAction = getNextProgressAction(appointment.status);
  const actualMinutes = getActualServiceMinutes(appointment);

  const updateStatus = async (action: BookingProgressAction) => {
    try {
      await onStatus(appointment.id, action);
      show(PROGRESS_ACTION_LABEL[action], 1600);
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not update appointment", 2600);
    }
  };

  return (
    <div className="bg-white border border-line rounded-xl p-3.5 grid grid-cols-[40px_1fr_auto] gap-3 items-start">
      <Avatar initials={appointment.customerInitials} tone={appointment.tone} />
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm font-semibold text-ink truncate">{appointment.customerName}</div>
          <Badge tone={appointment.status}>{STYLIST_STATUS_LABEL[appointment.status]}</Badge>
        </div>
        <div className="text-[13px] text-ink-3 mt-1">
          <strong className="font-medium text-ink-2">{appointment.service}</strong> · {formatTime12hFromMin(start)}-{formatTime12hFromMin(end)} · {appointment.duration} min
        </div>
        {actualMinutes !== null && (
          <div className="text-xs text-ink-3 mt-1">
            {actualMinutes} min actual · {appointment.duration} min estimate
          </div>
        )}
        {appointment.customerPhone && (
          <div className="text-xs text-ink-3 mt-1 flex items-center gap-1.5">
            <I.phone /> {appointment.customerPhone}
          </div>
        )}
        {appointment.notes && <div className="text-xs text-ink-2 mt-2 bg-bg-2 rounded-lg p-2">{appointment.notes}</div>}
        <div className="flex gap-2 flex-wrap mt-3">
          {nextAction && (
            <button
              onClick={() => updateStatus(nextAction)}
              className="h-8 px-3 rounded-lg bg-teal text-white text-xs font-semibold cursor-pointer transition-colors duration-150 hover:bg-teal-ink"
            >
              {PROGRESS_ACTION_LABEL[nextAction]}
            </button>
          )}
        </div>
      </div>
      <div className="font-mono text-xs font-semibold text-ink-2 whitespace-nowrap">{appointment.time}</div>
    </div>
  );
}

export default function StylistDashboardPage() {
  return (
    <StylistShell title="My day" subtitle={formatDateDisplay(new Date())}>
      {({ profile, todayAppointments, loading, advanceAppointmentStatus }) => {
        const upcoming = todayAppointments.filter((item) => item.status === "confirmed").length;
        const chairMinutes = todayAppointments.reduce((sum, item) => sum + item.duration, 0);

        return (
          <main className="max-w-[1200px] mx-auto px-4 md:px-8 py-7">
            <div className="grid grid-cols-1 min-[620px]:grid-cols-3 gap-3 mb-6">
              {[
                { label: "Appointments", value: todayAppointments.length, hint: "today", icon: <I.calendar /> },
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

            <div className="flex items-baseline justify-between gap-4 mb-3">
              <h2 className="text-lg font-semibold tracking-tight m-0">Today&apos;s appointments</h2>
              <span className="text-xs text-ink-3 font-mono">{profile?.name || "Stylist"}</span>
            </div>

            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((item) => <div key={item} className="h-[116px] bg-bg-2 rounded-xl animate-pulse" />)}
              </div>
            ) : todayAppointments.length === 0 ? (
              <div className="bg-white border border-line rounded-xl p-8 text-center">
                <div className="w-11 h-11 rounded-full bg-bg-2 grid place-items-center mx-auto text-ink-3"><I.calendar /></div>
                <div className="font-semibold mt-3">No appointments today</div>
                <div className="text-sm text-ink-3 mt-1">Your schedule is clear for now.</div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {todayAppointments.map((appointment) => (
                  <AppointmentRow key={appointment.id} appointment={appointment} onStatus={advanceAppointmentStatus} />
                ))}
              </div>
            )}
          </main>
        );
      }}
    </StylistShell>
  );
}
