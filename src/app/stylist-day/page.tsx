"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

function StylistDayContent() {
  const searchParams = useSearchParams();
  const stylistId = searchParams.get("stylist");
  const salonId = searchParams.get("salon");

  const [appts, setAppts] = useState<any[]>([]);
  const [stylistName, setStylistName] = useState("Stylist");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !salonId) { setLoading(false); return; }

    const loadData = async () => {
      if (stylistId) {
        const { data: s } = await supabase.from("stylists").select("name").eq("id", stylistId).maybeSingle();
        if (s) setStylistName(s.name);
      }

      const today = new Date().toISOString().slice(0, 10);
      let q = supabase
        .from("bookings")
        .select("id, start_time, duration, status, notes, customer:customers(name), booking_services(service:services(name))")
        .eq("salon_id", salonId)
        .eq("date", today)
        .order("start_time");

      if (stylistId) q = q.eq("stylist_id", stylistId);

      const { data } = await q;
      setAppts(data || []);
      setLoading(false);
    };

    loadData();
  }, [stylistId, salonId]);

  const updateStatus = async (id: string, status: string) => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.from("bookings").update({ status }).eq("id", id);
      setAppts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{stylistName}</h1>
      <p style={{ color: "#666", fontSize: 14 }}>Today's schedule · {appts.length} appointments</p>

      {appts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>No appointments today</div>
      ) : (
        <div style={{ marginTop: 20 }}>
          {appts.map(a => {
            const svcNames = a.booking_services?.map((bs: any) => bs.service?.name).join(", ") || "Service";
            const statusColors: Record<string, string> = {
              Confirmed: "#e0f5e9", Arrived: "#fff3e0", Completed: "#e8e8e8", "In Progress": "#dff0d8",
            };
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
                <button
                  onClick={() => {
                    const next = a.status === "Confirmed" ? "Arrived" : a.status === "Arrived" ? "Completed" : "Confirmed";
                    updateStatus(a.id, next);
                  }}
                  style={{
                    padding: "6px 12px", borderRadius: 8, border: 0,
                    background: a.status === "Completed" ? "#e0e0e0" : "#0BAA84", color: a.status === "Completed" ? "#555" : "#fff",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {a.status === "Confirmed" ? "Arrived" : a.status === "Arrived" ? "Done" : "Undo"}
                </button>
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
