"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useBookingProgress } from "@/hooks";
import {
  BOOKING_STATUS_DB,
  getNextProgressAction,
  mapDbStatusToUiStatus,
  PROGRESS_ACTION_LABEL,
  PROGRESS_ACTION_NEXT_STATUS,
} from "@/lib/booking-progress";
import { BookingProgressAction, StylistAppt } from "@/types";



function StylistDayContent() {
  const searchParams = useSearchParams();
  const stylistId = searchParams.get("stylist");
  const salonId = searchParams.get("salon");

  const [appts, setAppts] = useState<StylistAppt[]>([]);
  const [stylistName, setStylistName] = useState("Stylist");
  const [loading, setLoading] = useState(true);
  const { advanceBooking } = useBookingProgress();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !salonId) {
      queueMicrotask(() => {
        setLoading(false);
      });
      return;
    }

    const loadData = async () => {
      if (stylistId) {
        const { data: s } = await supabase.from("stylists").select("name").eq("id", stylistId).maybeSingle();
        if (s) setStylistName(s.name);
      }

      const today = new Date().toISOString().slice(0, 10);
      let q = supabase
        .from("bookings")
        .select("id, start_time, duration, status, arrived_at, started_at, completed_at, actual_duration_minutes, notes, customer:customers(name), booking_services(service:services(name))")
        .eq("salon_id", salonId)
        .eq("date", today)
        .order("start_time");

      if (stylistId) q = q.eq("stylist_id", stylistId);

      const { data } = await q;
      setAppts((data as unknown as StylistAppt[]) || []);
      setLoading(false);
    };

    loadData();
  }, [stylistId, salonId]);

  const advanceStatus = async (id: string, action: BookingProgressAction) => {
    const optimisticStatus = BOOKING_STATUS_DB[PROGRESS_ACTION_NEXT_STATUS[action]];
    const previous = appts;
    setAppts(prev => prev.map(a => a.id === id ? { ...a, status: optimisticStatus } : a));

    try {
      const result = await advanceBooking(id, action);
      setAppts(prev => prev.map(a => a.id === id ? {
        ...a,
        status: BOOKING_STATUS_DB[result.status],
        arrived_at: result.arrivedAt ?? a.arrived_at,
        started_at: result.startedAt ?? a.started_at,
        completed_at: result.completedAt ?? a.completed_at,
        actual_duration_minutes: result.actualDurationMinutes ?? a.actual_duration_minutes,
      } : a));
    } catch (err) {
      console.error("Failed to advance booking:", err);
      setAppts(previous);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{stylistName}</h1>
      <p style={{ color: "#666", fontSize: 14 }}>{"Today's schedule"} · {appts.length} appointments</p>

      {appts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>No appointments today</div>
      ) : (
        <div style={{ marginTop: 20 }}>
          {appts.map(a => {
            const svcNames = a.booking_services?.map((bs) => bs.service?.name).filter(Boolean).join(", ") || "Service";
            const uiStatus = mapDbStatusToUiStatus(a.status);
            const nextAction = getNextProgressAction(uiStatus);
            return (
              <div key={a.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
                borderBottom: "1px solid #eee",
              }}>
                <div style={{ width: 48, fontSize: 14, fontWeight: 600, color: "#333" }}>
                  {a.start_time?.slice(0, 5)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{a.customer?.name || "Walk-in"}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{svcNames} · {a.duration} min</div>
                </div>
                {nextAction ? (
                  <button
                    onClick={() => advanceStatus(a.id, nextAction)}
                    style={{
                      padding: "6px 12px", borderRadius: 8, border: 0,
                      background: "#0BAA84", color: "#fff",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {PROGRESS_ACTION_LABEL[nextAction]}
                  </button>
                ) : (
                  <span style={{ padding: "6px 12px", borderRadius: 8, background: "#e0e0e0", color: "#555", fontSize: 12, fontWeight: 600 }}>
                    {BOOKING_STATUS_DB[uiStatus]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function StylistDayPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading...</div>}>
      <StylistDayContent />
    </Suspense>
  );
}
