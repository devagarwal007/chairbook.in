"use client";

import React, { useMemo } from "react";
import StylistShell from "@/components/layout/StylistShell";
import { Avatar, Badge, Icons as I } from "@/components/ui";
import { DOW_FULL, END_HOUR, SLOT_HEIGHT, START_HOUR, TIME_LABELS } from "@/constants/bookings";
import { STYLIST_STATUS_LABEL } from "@/constants/stylist";
import { formatDateKey, formatTime12hFromMin, toMin } from "@/lib/utils";
import type { StylistAppointment } from "@/types";

function weekDays() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

const slotTopPx = (time: string) => ((toMin(time) - START_HOUR * 60) / 30) * SLOT_HEIGHT;
const slotHeightPx = (duration: number) => Math.max((duration / 30) * SLOT_HEIGHT - 2, 20);
const gridHeight = TIME_LABELS.length * SLOT_HEIGHT * 2;

function AppointmentBlock({ appointment }: { appointment: StylistAppointment }) {
  const startMin = toMin(appointment.time);
  const endMin = startMin + appointment.duration;
  const top = slotTopPx(appointment.time);
  const height = slotHeightPx(appointment.duration);
  const start = appointment.time;
  const end = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
  const visible = endMin > START_HOUR * 60 && startMin < END_HOUR * 60;

  if (!visible) return null;

  return (
    <div
      className={`absolute left-0.5 right-0.5 rounded-lg p-[6px_10px] flex flex-col gap-1 z-10 overflow-hidden transition-all duration-120 hover:-translate-y-0.5 hover:shadow-[0_6px_14px_-6px_rgba(0,0,0,0.18)] hover:z-20 ${
        appointment.status === "confirmed" ? "bg-blue-soft text-blue border-l-[3px] border-blue" :
        appointment.status === "arrived" ? "bg-amber-soft text-amber-ink border-l-[3px] border-amber" :
        appointment.status === "in_service" ? "bg-teal-soft text-teal-ink border-l-[3px] border-teal" :
        appointment.status === "completed" ? "bg-green-soft text-green border-l-[3px] border-green" :
        appointment.status === "noshow" ? "bg-rose-soft text-rose border-l-[3px] border-rose" : ""
      }`}
      style={{ top: Math.max(top, 0), height }}
      title={`${appointment.customerName} · ${appointment.service} · ${start}-${end}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className={`font-bold text-[11px] tracking-[-0.005em] whitespace-nowrap overflow-hidden text-ellipsis flex-1 ${appointment.status === "noshow" ? "text-rose line-through" : "text-ink"}`}>
          {appointment.customerName}
        </div>
        <span className="font-mono text-[9px] shrink-0">{start}</span>
      </div>
      {height > 28 && (
        <div className="text-[10px] opacity-85 whitespace-nowrap overflow-hidden text-ellipsis">{appointment.service}</div>
      )}
      {height > 52 && (
        <div className="mt-auto flex items-center justify-between gap-2">
          <Avatar initials={appointment.customerInitials} tone={appointment.tone} size="sm" className="!w-5 !h-5 !text-[9px]" />
          <Badge tone={appointment.status} className="!text-[9px] !py-0.5 !px-1.5">
            {STYLIST_STATUS_LABEL[appointment.status]}
          </Badge>
        </div>
      )}
    </div>
  );
}

export default function StylistCalendarPage() {
  const days = useMemo(() => weekDays(), []);
  const range = `${days[0].getDate()}-${days[6].getDate()} ${days[6].toLocaleDateString("en-US", { month: "short" }).toUpperCase()}`;
  const todayKey = formatDateKey(new Date());
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMin - START_HOUR * 60) / 30) * SLOT_HEIGHT;
  const nowStr = formatTime12hFromMin(nowMin);

  return (
    <StylistShell title="My calendar" subtitle={`THIS WEEK · ${range}`}>
      {({ weekAppointments, loading }) => (
        <main className="max-w-[1200px] mx-auto px-4 md:px-8 py-7">
          <div className="bg-white border border-line rounded-xl overflow-hidden">
            <div className="overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[56px_repeat(7,minmax(120px,1fr))] border-b border-line bg-white sticky top-0 z-10">
                  <div className="bg-bg border-r border-line relative" />
                  {days.map((day) => {
                    const key = formatDateKey(day);
                    const isToday = key === todayKey;
                    const count = weekAppointments.filter((item) => item.date === key).length;
                    return (
                      <div key={key} className={`p-3 border-r border-line flex flex-col items-start gap-[2px] last:border-r-0 max-[720px]:p-[8px_6px] ${isToday ? "bg-teal-soft" : ""}`}>
                        <div className={`font-mono text-[10px] font-medium tracking-[0.06em] ${isToday ? "text-teal" : "text-ink-3"}`}>{DOW_FULL[day.getDay()]}</div>
                        <div className={`font-semibold leading-none mt-0.5 text-[22px] max-[720px]:text-base ${isToday ? "text-teal-ink" : "text-ink-2"}`}>{day.getDate()}</div>
                        <div className={`text-[11px] mt-1 max-[720px]:text-[10px] ${isToday ? "text-teal-ink" : "text-ink-3"}`}>
                          {count} booking{count === 1 ? "" : "s"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-[56px_repeat(7,minmax(120px,1fr))] relative">
                  <div className="bg-bg border-r border-line relative">
                    {TIME_LABELS.map((label, index) => (
                      <div key={label} className="border-b border-dashed border-line relative first:border-t-0 h-[56px]">
                        <span className="font-mono text-[10px] text-ink-3 absolute left-2 -top-[7px] bg-white px-1 max-[720px]:text-[9px] first:top-0">{index === 0 ? "" : label}</span>
                      </div>
                    ))}
                  </div>

                  {days.map((day) => {
                    const key = formatDateKey(day);
                    const isToday = key === todayKey;
                    const dayAppointments = weekAppointments.filter((item) => item.date === key);
                    return (
                      <div key={key} className={`relative border-r border-line last:border-r-0 ${isToday ? "bg-[rgba(15,110,86,0.025)]" : ""}`} style={{ height: gridHeight }}>
                        {TIME_LABELS.map((label) => (
                          <div key={label} className="border-b border-dashed border-line first:border-t-0 odd:bg-black/[0.005] h-[56px]" />
                        ))}

                        {loading && (
                          <div className="absolute left-2 right-2 top-4 h-20 rounded-lg bg-bg-2 animate-pulse" />
                        )}

                        {!loading && dayAppointments.length === 0 && (
                          <div className="absolute inset-x-0 top-[190px] text-center text-xs text-ink-3">Free</div>
                        )}

                        {isToday && nowTop >= 0 && nowTop <= gridHeight && (
                          <div className="absolute left-0 right-0 h-0.5 bg-teal z-20 pointer-events-none before:content-[''] before:absolute before:-left-1 before:-top-0.75 before:w-2 before:h-2 before:rounded-full before:bg-teal" style={{ top: nowTop }}>
                            <span className="absolute left-2 -top-2 bg-teal text-white text-[9px] font-mono py-0.25 px-1 rounded">{nowStr}</span>
                          </div>
                        )}

                        {!loading && dayAppointments.map((appointment) => (
                          <AppointmentBlock key={appointment.id} appointment={appointment} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-ink-3">
            <I.lock /> Calendar data is scoped to your stylist account.
          </div>
        </main>
      )}
    </StylistShell>
  );
}
