"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function MyBookingPage() {
  const params = useParams();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setLoading(false); return; }

    supabase
      .from("bookings")
      .select("id, date, start_time, duration, status, notes, customer:customers(name, phone), stylist:stylists(name), booking_services(service:services(name, duration_min, price))")
      .eq("id", bookingId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBooking(data);
          setStatus(data.status);
        }
        setLoading(false);
      });
  }, [bookingId]);

  const updateStatus = async (newStatus: string) => {
    const supabase = getSupabaseBrowserClient();
    if (supabase && bookingId) {
      await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId);
      setStatus(newStatus);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;
  if (!booking) return <div style={{ padding: 40, textAlign: "center" }}><h2>Booking not found</h2></div>;

  const custName = booking.customer?.name || "Customer";
  const stylistName = booking.stylist?.name || "Unassigned";
  const serviceNames = booking.booking_services?.map((bs: any) => bs.service?.name).join(", ") || "Service";
  const date = new Date(booking.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>{custName}'s Booking</h1>
      <p style={{ color: "#666", marginTop: 4 }}>{serviceNames} with {stylistName}</p>

      <div style={{ background: "#f5f5f5", borderRadius: 12, padding: 16, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#666" }}>Date</span><strong>{date}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#666" }}>Time</span><strong>{booking.start_time?.slice(0, 5)} · {booking.duration} min</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#666" }}>Status</span>
          <span style={{
            padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600,
            background: status === "Confirmed" ? "#e0f5e9" : status === "Arrived" ? "#fff3e0" : status === "Cancelled" ? "#ffeaea" : "#e8e8e8",
            color: status === "Confirmed" ? "#0a7e3e" : status === "Arrived" ? "#b35c00" : status === "Cancelled" ? "#c43" : "#555",
          }}>{status}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
        {status === "Pending" && (
          <button onClick={() => updateStatus("Confirmed")} style={{ padding: 14, borderRadius: 10, border: 0, background: "#0BAA84", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Confirm booking
          </button>
        )}
        {status !== "Cancelled" && status !== "Completed" && status !== "Paid" && (
          <button onClick={() => updateStatus("Cancelled")} style={{ padding: 14, borderRadius: 10, border: "1px solid #c43", background: "#fff", color: "#c43", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Cancel booking
          </button>
        )}
      </div>
    </div>
  );
}
