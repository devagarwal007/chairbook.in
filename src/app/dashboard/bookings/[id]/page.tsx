"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

// ===== ICONS =====
const IBD = {
  home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/>
    </svg>
  ),
  cal: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M8 3v4M16 3v4M3 10h18"/>
    </svg>
  ),
  users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/>
      <circle cx="10" cy="7" r="4"/>
      <path d="M21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  chart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M3 21V3M21 21H3"/>
      <rect x="7" y="11" width="3" height="6" rx="0.5"/>
      <rect x="12" y="7" width="3" height="10" rx="0.5"/>
      <rect x="17" y="13" width="3" height="4" rx="0.5"/>
    </svg>
  ),
  settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
    </svg>
  ),
  back: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  more: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1.5"/>
      <circle cx="12" cy="12" r="1.5"/>
      <circle cx="12" cy="19" r="1.5"/>
    </svg>
  ),
  clock: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 2"/>
    </svg>
  ),
  pin: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  rupee: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12M6 8h12M6 13c8 0 8-10 0-10M6 13l8 8"/>
    </svg>
  ),
  wa: ({ style }: { style?: React.CSSProperties }) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={style}>
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.2 3.2.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.3c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
    </svg>
  ),
  check: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  x: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
  edit: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>
    </svg>
  ),
  trash: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
    </svg>
  ),
};

// ===== TYPES =====
interface BookingData {
  id: string;
  status: "confirmed" | "arrived" | "completed" | "noshow" | "cancelled";
  date: string;
  time: string;
  duration: number;
  customer: {
    id: string | number;
    name: string;
    initials: string;
    tone: string;
    phone: string;
    visits: number;
    lastVisit: string;
    spend: number;
    memberSince: string;
  };
  services: { name: string; duration: number; price: number }[];
  stylist: { name: string; short: string; tone: string };
  notes: string;
  payment: { status: "paid" | "pending"; method: string | null };
  activity: { ts: string; icon: string; text: string; meta: string; tone: string }[];
}

// ===== MOCK DATA =====
const BOOKING: BookingData = {
  id: "BK-2026-0517",
  status: "confirmed",
  date: "Saturday, 24 May 2026",
  time: "16:00",
  duration: 90,
  customer: {
    id: 1,
    name: "Priya Sharma",
    initials: "PS",
    tone: "b",
    phone: "+91 98xxx 12345",
    visits: 12,
    lastVisit: "13 May 2026",
    spend: 12400,
    memberSince: "Oct 2023",
  },
  services: [
    { name: "Hair Color",  duration: 60, price: 1800 },
    { name: "Hair Spa",    duration: 30, price: 900 },
  ],
  stylist: { name: "Anjali", short: "A", tone: "b" },
  notes: "Allergic to ammonia-based color brands. Use ammonia-free range.",
  payment: { status: "pending", method: null },
  activity: [
    { ts: "24 May, 09:12 AM", icon: "wa",    text: "Reminder sent on WhatsApp", meta: "Auto", tone: "wa" },
    { ts: "23 May, 11:34 AM", icon: "check", text: "Customer confirmed", meta: "Via WhatsApp", tone: "green" },
    { ts: "17 May, 04:21 PM", icon: "cal",   text: "Booking created",    meta: "Online via salonbook.in/glow-andheri", tone: "neutral" },
  ],
};

const STATUS_LABEL = { confirmed: "Confirmed", arrived: "Arrived", completed: "Completed", noshow: "No-show", cancelled: "Cancelled" };

const CANCEL_REASONS = [
  { id: "customer", label: "Customer requested" },
  { id: "stylist",  label: "Stylist unavailable" },
  { id: "emerg",    label: "Salon emergency / closed" },
  { id: "noshow",   label: "Customer did not show up" },
  { id: "other",    label: "Other reason" },
];

const RESCH_DAYS = (() => {
  const today = new Date(2026, 4, 19);
  const arr = [];
  const dayNames = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    arr.push({
      key: d.toISOString().slice(0,10),
      dow: dayNames[d.getDay()],
      dom: d.getDate(),
      label: i === 5 ? "Original" : null,
      full: d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
    });
  }
  return arr;
})();

const ALL_SLOTS = ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00"];

// ===== RESCHEDULE MODAL =====
interface RescheduleModalProps {
  booking: BookingData;
  onClose: () => void;
  onConfirm: (data: { date: string; time: string; note: string }) => void;
}

function RescheduleModal({ booking, onClose, onConfirm }: RescheduleModalProps) {
  const [date, setDate] = useState(RESCH_DAYS[5].key); // original date
  const [time, setTime] = useState(booking.time);
  const [note, setNote] = useState("");
  return (
    <div className="modal-back" onClick={onClose} style={{ zIndex: 100 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: "min(520px, 100%)" }}>
        <div className="modal-head">
          <div>
            <h3>Reschedule booking</h3>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
              {booking.customer.name} · {booking.services.map(s => s.name).join(" + ")}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><IBD.x /></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>New date</label>
            <div className="date-row" style={{ margin: 0, padding: "0 0 6px", display: "flex", gap: 6, overflowX: "auto" }}>
              {RESCH_DAYS.map(d => (
                <button
                  key={d.key}
                  className={`date-pill ${date === d.key ? "on" : ""}`}
                  onClick={() => setDate(d.key)}
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: date === d.key ? "1px solid var(--teal)" : "1px solid var(--line-2)",
                    background: date === d.key ? "var(--teal-soft)" : "#fff",
                    cursor: "pointer",
                    minWidth: 54
                  }}
                >
                  <span className="date-dow" style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)" }}>{d.dow}</span>
                  <span className="date-dom" style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>{d.dom}</span>
                  {d.label && <span className="date-lbl" style={{ fontSize: 8, fontWeight: 600, color: "var(--teal)", marginTop: 2 }}>{d.label}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label>New time</label>
            <div className="time-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
              {ALL_SLOTS.map(s => (
                <button
                  key={s}
                  className={`time-pill ${time === s ? "on" : ""}`}
                  onClick={() => setTime(s)}
                  style={{
                    padding: "8px 0",
                    borderRadius: 8,
                    border: "1px solid var(--line-2)",
                    background: time === s ? "var(--teal)" : "#fff",
                    color: time === s ? "#fff" : "var(--ink-2)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label>Add a note to the customer (optional)</label>
            <textarea
              placeholder='e.g. "Sorry, Anjali had a family emergency. Hope this works!"'
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ minHeight: 64, width: "100%", padding: 12, borderRadius: 10, border: "1px solid var(--line-2)", outline: 0, resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
          <div className="trust" style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "flex-start", background: "var(--wa-soft)", padding: 12, borderRadius: 10, color: "#1F5A37", fontSize: 13 }}>
            <IBD.wa style={{ color: "var(--wa)", width: 18, height: 18, flexShrink: 0 }} />
            <div>The customer will get a WhatsApp message with the new time and a &ldquo;Reply YES to confirm&rdquo; prompt.</div>
          </div>
        </div>
        <div className="modal-foot" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Keep original</button>
          <button className="btn btn-primary" onClick={() => onConfirm({ date, time, note })}>
            Reschedule &amp; notify
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== CANCEL MODAL =====
interface CancelModalProps {
  booking: BookingData;
  onClose: () => void;
  onConfirm: (data: { reason: string; note: string; notify: boolean }) => void;
}

function CancelModal({ booking, onClose, onConfirm }: CancelModalProps) {
  const [reason, setReason] = useState("customer");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  return (
    <div className="modal-back" onClick={onClose} style={{ zIndex: 100 }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3 style={{ color: "var(--rose)" }}>Cancel booking</h3>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
              {booking.customer.name} · {booking.date} · {booking.time}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><IBD.x /></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Reason for cancellation</label>
            <div className="reason-list" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {CANCEL_REASONS.map(r => (
                <label key={r.id} className={`reason-opt ${reason === r.id ? "on" : ""}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid var(--line-2)", borderRadius: 10, cursor: "pointer", background: reason === r.id ? "var(--bg-2)" : "#fff" }}>
                  <input
                    type="radio"
                    name="cancel_reason"
                    checked={reason === r.id}
                    onChange={() => setReason(r.id)}
                    style={{ accentColor: "var(--rose)" }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label>Internal note (optional)</label>
            <textarea
              placeholder="For your records — won't be shared with customer"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ minHeight: 60, width: "100%", padding: 12, borderRadius: 10, border: "1px solid var(--line-2)", outline: 0, resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
          <label className="checkbox-row" style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} style={{ accentColor: "var(--teal)" }} />
            <span style={{ fontSize: 13 }}>Notify {booking.customer.name.split(" ")[0]} via WhatsApp with an apology + 10% off voucher</span>
          </label>
        </div>
        <div className="modal-foot" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Keep booking</button>
          <button className="btn btn-danger" onClick={() => onConfirm({ reason, note, notify })} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IBD.trash /> Cancel booking
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN PAGE COMPONENT =====
export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string || "BK-2026-0517";

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"confirmed" | "arrived" | "completed" | "noshow" | "cancelled">("confirmed");
  const [showResch, setShowResch] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [activity, setActivity] = useState(BOOKING.activity);
  const [rescheduled, setRescheduled] = useState<{ date: string; time: string } | null>(null);
  const [salonInfo, setSalonInfo] = useState({
    name: "Glow Salon & Spa",
    area: "Andheri West",
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const loadSalon = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) return;

        const { data: userProfile } = await supabase
          .from("users")
          .select("org_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (userProfile?.org_id) {
          const { data: salon } = await supabase
            .from("salons")
            .select("name, area")
            .eq("org_id", userProfile.org_id)
            .eq("is_primary", true)
            .maybeSingle();

          if (salon) {
            setSalonInfo({
              name: salon.name,
              area: salon.area || "",
            });
          } else {
            const { data: firstSalon } = await supabase
              .from("salons")
              .select("name, area")
              .eq("org_id", userProfile.org_id)
              .limit(1)
              .maybeSingle();
            if (firstSalon) {
              setSalonInfo({
                name: firstSalon.name,
                area: firstSalon.area || "",
              });
            }
          }
        }
      } catch (err) {
        console.error("Error loading salon details:", err);
      }
    };

    loadSalon();
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);

    if (!isUuid || !supabase) {
      setBooking(BOOKING);
      setStatus(BOOKING.status);
      setActivity(BOOKING.activity);
      setLoading(false);
      return;
    }

    const loadBooking = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("bookings")
          .select(`
            id,
            customer_id,
            date,
            start_time,
            duration,
            status,
            notes,
            created_at,
            source,
            customer:customers (id, name, phone, created_at),
            stylist:stylists (id, name, tone),
            booking_services (
              qty,
              price_at_booking,
              service:services (id, name, duration_min, price)
            )
          `)
          .eq("id", bookingId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          let visits = 0;
          let spend = 0;
          let lastVisit = "Never";
          let memberSince = "Oct 2023";

          const customerRaw = data.customer;
          const customerObj = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;

          const stylistRaw = data.stylist;
          const stylistObj = Array.isArray(stylistRaw) ? stylistRaw[0] : stylistRaw;

          if (data.customer_id) {
            const { data: customerBookings } = await supabase
              .from("bookings")
              .select(`
                id,
                date,
                status,
                booking_services (
                  qty,
                  price_at_booking
                )
              `)
              .eq("customer_id", data.customer_id);

            if (customerBookings) {
              const completedBookings = customerBookings.filter(cb => ["Completed", "Paid"].includes(cb.status));
              visits = completedBookings.length;
              
              spend = completedBookings.reduce((sum, cb) => {
                const cbSum = cb.booking_services?.reduce((s: number, bs: any) => s + (Number(bs.price_at_booking) * (bs.qty || 1)), 0) || 0;
                return sum + cbSum;
              }, 0);

              const sortedCompleted = [...completedBookings].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
              if (sortedCompleted.length > 0) {
                const lastDate = new Date(sortedCompleted[0].date);
                lastVisit = lastDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
              }
            }

            if (customerObj?.created_at) {
              const memberDate = new Date(customerObj.created_at);
              memberSince = memberDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
            }
          }

          const { data: paymentData } = await supabase
            .from("payments")
            .select("method, amount")
            .eq("booking_id", bookingId)
            .maybeSingle();

          const cleanTone = (t: string) => t.replace("tone-", "");
          const custName = customerObj?.name || "Walk-in Customer";
          const custInitials = custName
            .split(" ")
            .map((p: string) => p[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "WC";

          const bDate = new Date(data.date);
          const formattedDate = bDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

          const mapDbStatusToUi = (s: string): "confirmed" | "arrived" | "completed" | "noshow" | "cancelled" => {
            const lower = (s || "").toLowerCase();
            if (lower === "confirmed") return "confirmed";
            if (lower === "arrived") return "arrived";
            if (lower === "completed" || lower === "paid") return "completed";
            if (lower === "no-show") return "noshow";
            if (lower === "cancelled") return "cancelled";
            return "confirmed";
          };

          const uiStatus = mapDbStatusToUi(data.status);
          
          const actList = [];
          if (data.status === "Cancelled") {
            actList.push({
              ts: "Today",
              icon: "x",
              text: "Booking cancelled",
              meta: "Status updated in system",
              tone: "rose"
            });
          } else if (data.status === "No-show") {
            actList.push({
              ts: "Today",
              icon: "x",
              text: "Customer marked as No-show",
              meta: "Status updated in system",
              tone: "rose"
            });
          } else if (data.status === "Completed" || data.status === "Paid") {
            actList.push({
              ts: "Today",
              icon: "check",
              text: `Booking completed ${paymentData ? `via ${paymentData.method}` : ""}`,
              meta: paymentData ? `Total Paid: ₹${paymentData.amount}` : "Marked completed",
              tone: "green"
            });
          } else if (data.status === "Arrived") {
            actList.push({
              ts: "Today",
              icon: "check",
              text: "Customer arrived at salon",
              meta: "Status updated",
              tone: "green"
            });
          }

          actList.push({
            ts: new Date(data.created_at || data.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
            icon: "cal",
            text: "Booking created",
            meta: `Source: ${data.source || 'Web'}`,
            tone: "neutral"
          });

          const services = data.booking_services?.map((bs: any) => ({
            name: bs.service?.name || "Unknown Service",
            duration: bs.service?.duration_min || 30,
            price: Number(bs.price_at_booking)
          })) || [];

          const bData: BookingData = {
            id: data.id,
            status: uiStatus,
            date: formattedDate,
            time: (data.start_time || "09:00").slice(0, 5),
            duration: data.duration || 30,
            customer: {
              id: customerObj?.id || "",
              name: custName,
              initials: custInitials,
              tone: stylistObj?.tone ? cleanTone(stylistObj.tone) : "b",
              phone: customerObj?.phone || "",
              visits,
              lastVisit,
              spend,
              memberSince
            },
            services,
            stylist: {
              name: stylistObj?.name || "Unassigned",
              short: (stylistObj?.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
              tone: stylistObj?.tone ? cleanTone(stylistObj.tone) : "a"
            },
            notes: data.notes || "",
            payment: {
              status: (data.status === "Paid" || data.status === "Completed") ? "paid" : "pending",
              method: paymentData?.method || null
            },
            activity: actList
          };

          setBooking(bData);
          setStatus(uiStatus);
          setActivity(actList);
        }
      } catch (err) {
        console.error("Error loading booking details:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [bookingId]);

  const b = booking || BOOKING;
  const totalDur = b.services.reduce((s, x) => s + x.duration, 0);
  const totalPrice = b.services.reduce((s, x) => s + x.price, 0);
  const isCancelled = status === "cancelled";
  const isPast = status === "completed" || status === "noshow" || status === "cancelled";
  const isConfirmed = status === "confirmed";
  const isArrived = status === "arrived";
  const isCompleted = status === "completed";
  const isNoShow = status === "noshow";

  const changeStatus = async (s: "confirmed" | "arrived" | "completed" | "noshow") => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
    
    const mapUiStatusToDb = (u: string) => {
      if (u === "confirmed") return "Confirmed";
      if (u === "arrived") return "Arrived";
      if (u === "completed") return "Completed";
      if (u === "noshow") return "No-show";
      return "Confirmed";
    };

    if (isUuid) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        try {
          const { error } = await supabase
            .from("bookings")
            .update({ status: mapUiStatusToDb(s) })
            .eq("id", bookingId);

          if (error) throw error;
        } catch (err) {
          console.error("Failed to update status in Supabase:", err);
          alert("Failed to update status in database. Keeping client-side change.");
        }
      }
    }

    setStatus(s);
    setActivity([{
      ts: "Just now",
      icon: "check",
      text: `Status changed to ${STATUS_LABEL[s]}`,
      meta: "You",
      tone: "neutral"
    }, ...activity]);
    setFlash(`Marked as ${STATUS_LABEL[s]}`);
    setTimeout(() => setFlash(null), 1800);
  };

  const handleReschedule = async ({ date, time, note }: { date: string; time: string; note: string }) => {
    const day = RESCH_DAYS.find(d => d.key === date);
    if (day) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
      if (isUuid) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          try {
            const { error } = await supabase
              .from("bookings")
              .update({
                date: date,
                start_time: time + ":00",
                notes: note ? (b.notes ? `${b.notes}\nReschedule Note: ${note}` : note) : b.notes
              })
              .eq("id", bookingId);

            if (error) throw error;
          } catch (err) {
            console.error("Failed to reschedule booking in Supabase:", err);
            alert("Failed to reschedule booking in database.");
            return;
          }
        }
      }

      setRescheduled({ date: day.full, time });
      setActivity([{
        ts: "Just now",
        icon: "cal",
        text: `Rescheduled to ${day.full} at ${time}`,
        meta: note ? `Note: "${note}"` : "WhatsApp sent",
        tone: "amber"
      }, ...activity]);
      setShowResch(false);
      setFlash(`Rescheduled — WhatsApp sent to ${b.customer.name}`);
      setTimeout(() => setFlash(null), 2000);
    }
  };

  const handleCancel = async ({ reason, note, notify }: { reason: string; note: string; notify: boolean }) => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
    if (isUuid) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        try {
          const { error } = await supabase
            .from("bookings")
            .update({
              status: "Cancelled",
              notes: note ? (b.notes ? `${b.notes}\nCancel Note: ${note}` : note) : b.notes
            })
            .eq("id", bookingId);

          if (error) throw error;
        } catch (err) {
          console.error("Failed to cancel booking in Supabase:", err);
          alert("Failed to cancel booking in database.");
          return;
        }
      }
    }

    setStatus("cancelled");
    const reasonLabel = CANCEL_REASONS.find(r => r.id === reason)?.label || "Other reason";
    setActivity([{
      ts: "Just now",
      icon: "x",
      text: `Booking cancelled — ${reasonLabel}`,
      meta: notify ? "WhatsApp + voucher sent" : "No notification",
      tone: "rose"
    }, ...activity]);
    setShowCancel(false);
    setFlash(`Booking cancelled${notify ? " — customer notified" : ""}`);
    setTimeout(() => setFlash(null), 2000);
  };

  const handleRestore = async () => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
    if (isUuid) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        try {
          const { error } = await supabase
            .from("bookings")
            .update({ status: "Confirmed" })
            .eq("id", bookingId);

          if (error) throw error;
        } catch (err) {
          console.error("Failed to restore booking in Supabase:", err);
          alert("Failed to restore booking in database.");
          return;
        }
      }
    }
    setStatus("confirmed");
    setRescheduled(null);
  };

  const displayDate = rescheduled?.date || b.date;
  const displayTime = rescheduled?.time || b.time;
  const endMin = parseInt(displayTime.split(":")[0]) * 60 + parseInt(displayTime.split(":")[1]) + totalDur;
  const displayEnd = `${String(Math.floor(endMin/60)).padStart(2,"0")}:${String(endMin%60).padStart(2,"0")}`;

  if (loading) {
    return (
      <div className="app profile-app">
        {/* Top bar */}
        <div className="profile-topbar">
          <div className="profile-topbar-inner" style={{ display: "flex", alignItems: "center", width: "100%" }}>
            <div className="book-back" style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-2)" }} />
            <div style={{ flex: 1, marginLeft: 8 }}>
              <div className="pulse" style={{ width: 100, height: 16, borderRadius: 4 }} />
              <div className="pulse" style={{ width: 140, height: 10, borderRadius: 3, marginTop: 6 }} />
            </div>
          </div>
        </div>

        <main className="profile-main" style={{ paddingBottom: 120 }}>
          {/* Hero card skeleton */}
          <div className="bd-hero card" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
            <div className="bd-hero-l" style={{ flex: 1 }}>
              <div className="pulse" style={{ width: 80, height: 20, borderRadius: 10 }} />
              <div className="pulse" style={{ width: "60%", height: 28, borderRadius: 6, marginTop: 12 }} />
              <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
                <div className="pulse" style={{ width: 150, height: 14, borderRadius: 4 }} />
                <div className="pulse" style={{ width: 120, height: 14, borderRadius: 4 }} />
              </div>
            </div>
            <div className="bd-hero-r">
              <div className="bd-stylist-card" style={{ display: "flex", gap: 12 }}>
                <div className="pulse" style={{ width: 44, height: 44, borderRadius: "50%" }} />
                <div>
                  <div className="pulse" style={{ width: 50, height: 10, borderRadius: 3 }} />
                  <div className="pulse" style={{ width: 80, height: 16, borderRadius: 4, marginTop: 6 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Columns */}
          <div className="bd-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Customer Card skeleton */}
              <div className="card bd-customer" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                  <div className="pulse" style={{ width: 80, height: 11, borderRadius: 3 }} />
                  <div className="pulse" style={{ width: 100, height: 12, borderRadius: 3 }} />
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                  <div className="pulse" style={{ width: 44, height: 44, borderRadius: "50%" }} />
                  <div style={{ flex: 1 }}>
                    <div className="pulse" style={{ width: 120, height: 16, borderRadius: 4 }} />
                    <div className="pulse" style={{ width: 80, height: 12, borderRadius: 3, marginTop: 6 }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "12px 0" }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ textAlign: "center", borderRight: i < 3 ? "1px solid var(--line)" : "none" }}>
                      <div className="pulse" style={{ width: 30, height: 18, margin: "0 auto", borderRadius: 4 }} />
                      <div className="pulse" style={{ width: 40, height: 10, margin: "6px auto 0", borderRadius: 3 }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Service list skeleton */}
              <div className="card" style={{ padding: 20 }}>
                <div className="pulse" style={{ width: 100, height: 16, borderRadius: 4, marginBottom: 16 }} />
                {[1, 2].map(i => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--bg-2)" }}>
                    <div style={{ flex: 1 }}>
                      <div className="pulse" style={{ width: "50%", height: 14, borderRadius: 4 }} />
                      <div className="pulse" style={{ width: 80, height: 10, borderRadius: 3, marginTop: 6 }} />
                    </div>
                    <div className="pulse" style={{ width: 60, height: 14, borderRadius: 4 }} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Payment Summary Skeleton */}
              <div className="card" style={{ padding: 20 }}>
                <div className="pulse" style={{ width: 120, height: 16, borderRadius: 4, marginBottom: 16 }} />
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                    <div className="pulse" style={{ width: 80, height: 12, borderRadius: 3 }} />
                    <div className="pulse" style={{ width: 50, height: 12, borderRadius: 3 }} />
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 8 }}>
                  <div className="pulse" style={{ width: 60, height: 16, borderRadius: 4 }} />
                  <div className="pulse" style={{ width: 70, height: 18, borderRadius: 4 }} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app profile-app">
      {/* Top bar */}
      <div className="profile-topbar">
        <div className="profile-topbar-inner" style={{ display: "flex", alignItems: "center", width: "100%" }}>
          <Link className="book-back" href="/dashboard" aria-label="Back" style={{ background: "transparent", display: "inline-grid", placeItems: "center" }}>
            <IBD.back />
          </Link>
          <div style={{ flex: 1, marginLeft: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.005em" }}>Booking detail</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, letterSpacing: "0.04em" }}>{bookingId}</div>
          </div>
          <button className="icon-btn" style={{ background: "transparent", border: 0, cursor: "pointer", display: "grid", placeItems: "center" }}><IBD.more /></button>
        </div>
      </div>

      <main className="profile-main" style={{ paddingBottom: 120 }}>
        {/* Hero card */}
        <div className={`bd-hero card ${isCancelled ? "is-cancelled" : ""}`} style={{ marginBottom: 16 }}>
          <div className="bd-hero-l">
            <span className={`badge ${status}`}>{STATUS_LABEL[status]}</span>
            <h1 className="bd-hero-title" style={{ fontSize: 22, fontWeight: 600, marginTop: 8 }}>
              {b.services.map(s => s.name).join(" + ")}
            </h1>
            <div className="bd-hero-meta" style={{ display: "flex", gap: 14, fontSize: 13, color: "var(--ink-2)", marginTop: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IBD.clock /> {displayDate} · {displayTime}–{displayEnd} <span style={{ color: "var(--ink-3)" }}>({totalDur} min)</span></span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IBD.pin /> {salonInfo.name}{salonInfo.area ? `, ${salonInfo.area}` : ""}</span>
            </div>
            {rescheduled && (
              <div className="bd-resch-note" style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, color: "var(--amber-ink)", background: "var(--amber-soft)", padding: "4px 8px", borderRadius: 6, fontSize: 12 }}>
                <IBD.cal /> Rescheduled from {b.date} · {b.time}
              </div>
            )}
          </div>
          <div className="bd-hero-r">
            <div className="bd-stylist-card">
              <div className={`avatar lg tone-${b.stylist.tone}`} style={{ display: "grid", placeItems: "center", fontWeight: "bold" }}>{b.stylist.short}</div>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>STYLIST</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{b.stylist.name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Two columns: customer + services & payment */}
        <div className="bd-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Customer mini-card */}
          <div className="card bd-customer" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 20 }}>
            <div className="bd-section-lbl" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 14 }}>
              <span>CUSTOMER</span>
              <Link href={`/dashboard/customers/${b.customer.id}`} style={{ fontSize: 12, color: "var(--teal)", fontWeight: 500, textTransform: "none" }}>View profile →</Link>
            </div>
            <div className="bd-cust-head" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div className={`avatar lg tone-${b.customer.tone}`} style={{ width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: "bold", fontSize: 16 }}>{b.customer.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="bd-cust-name" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{b.customer.name}</div>
                <div className="bd-cust-phone" style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>{b.customer.phone}</div>
              </div>
              <a href={`https://wa.me/${b.customer.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ color: "var(--wa)", borderColor: "var(--wa)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IBD.wa /> WhatsApp
              </a>
            </div>
            <div className="bd-cust-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "12px 0", marginBottom: 14 }}>
              <div style={{ textAlign: "center", borderRight: "1px solid var(--line)" }}>
                <div className="num" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{b.customer.visits}</div>
                <div className="lbl" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.02em", marginTop: 2 }}>Visits</div>
              </div>
              <div style={{ textAlign: "center", borderRight: "1px solid var(--line)" }}>
                <div className="num" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>₹{b.customer.spend.toLocaleString("en-IN")}</div>
                <div className="lbl" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.02em", marginTop: 2 }}>Lifetime</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div className="num" style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", padding: "3px 0" }}>{b.customer.lastVisit}</div>
                <div className="lbl" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.02em" }}>Last visit</div>
              </div>
            </div>
            {b.notes && (
              <div className="bd-cust-note" style={{ background: "var(--bg-2)", padding: 12, borderRadius: 10 }}>
                <div className="bd-section-lbl" style={{ fontSize: 9, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>NOTES</div>
                <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.4, margin: 0 }}>{b.notes}</p>
              </div>
            )}
          </div>

          {/* Services + payment */}
          <div className="card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 20 }}>
            <div className="bd-section-lbl" style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 14 }}>SERVICES &amp; PAYMENT</div>
            <div className="bd-svc-list" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {b.services.map((s, i) => (
                <div key={i} className="bd-svc-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{s.duration} min</div>
                  </div>
                  <div className="bd-svc-price mono" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>₹{s.price.toLocaleString("en-IN")}</div>
                </div>
              ))}
            </div>
            <div className="bd-total" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-2)" }}>Total</span>
              <strong className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>₹{totalPrice.toLocaleString("en-IN")}</strong>
            </div>
            <div className={`bd-payment ${b.payment.status}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: b.payment.status === "paid" ? "var(--green-soft)" : "var(--amber-soft)", color: b.payment.status === "paid" ? "var(--green)" : "var(--amber-ink)", borderRadius: 10, marginTop: 14 }}>
              <IBD.rupee />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {b.payment.status === "paid" ? "Paid" : "Payment pending"}
                </div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 1 }}>
                  {b.payment.status === "paid" ? b.payment.method : "Take payment at counter after service"}
                </div>
              </div>
              {b.payment.status !== "paid" && (
                <Link className="btn btn-primary btn-sm" href={`/dashboard/checkout/${bookingId}`} style={{ background: "var(--teal)", color: "#fff", display: "inline-grid", placeItems: "center" }}>Take payment</Link>
              )}
            </div>
          </div>
        </div>

        {/* Status quick actions */}
        {!isPast && (
          <div className="card bd-quick-status" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div className="bd-section-lbl" style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 14 }}>MARK AS</div>
            <div className="bd-status-row" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className={`bd-status ${isConfirmed ? "on" : ""}`}
                onClick={() => changeStatus("confirmed")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: isConfirmed ? "1px solid var(--teal)" : "1px solid var(--line-2)",
                  background: isConfirmed ? "var(--teal-soft)" : "#fff",
                  color: isConfirmed ? "var(--teal)" : "var(--ink-2)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                {isConfirmed && <IBD.check />}
                <span className="dot status-confirmed-bg" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue)" }}></span> Confirmed
              </button>
              <button
                className={`bd-status ${isArrived ? "on" : ""}`}
                onClick={() => changeStatus("arrived")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: isArrived ? "1px solid var(--teal)" : "1px solid var(--line-2)",
                  background: isArrived ? "var(--teal-soft)" : "#fff",
                  color: isArrived ? "var(--teal)" : "var(--ink-2)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                {isArrived && <IBD.check />}
                <span className="dot status-arrived-bg" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--amber)" }}></span> Arrived
              </button>
              <button
                className={`bd-status ${isCompleted ? "on" : ""}`}
                onClick={() => changeStatus("completed")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: isCompleted ? "1px solid var(--teal)" : "1px solid var(--line-2)",
                  background: isCompleted ? "var(--teal-soft)" : "#fff",
                  color: isCompleted ? "var(--teal)" : "var(--ink-2)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                {isCompleted && <IBD.check />}
                <span className="dot status-completed-bg" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }}></span> Completed
              </button>
              <button
                className={`bd-status danger ${isNoShow ? "on" : ""}`}
                onClick={() => changeStatus("noshow")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: isNoShow ? "1px solid var(--rose)" : "1px solid var(--line-2)",
                  background: isNoShow ? "var(--rose-soft)" : "#fff",
                  color: isNoShow ? "var(--rose)" : "var(--ink-2)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                {isNoShow && <IBD.check />}
                <span className="dot status-noshow-bg" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--rose)" }}></span> No-show
              </button>
            </div>
          </div>
        )}

        {/* Activity log */}
        <div className="card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 20 }}>
          <div className="bd-section-lbl" style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 14 }}>ACTIVITY</div>
          <div className="bd-activity" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {activity.map((a, i) => (
              <div key={i} className={`bd-act-row tone-${a.tone}`} style={{ display: "flex", gap: 12 }}>
                <div className="bd-act-ic" style={{ width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  {a.icon === "wa" && <IBD.wa style={{ width: 14, height: 14 }} />}
                  {a.icon === "check" && <IBD.check />}
                  {a.icon === "cal" && <IBD.cal />}
                  {a.icon === "x" && <IBD.x />}
                </div>
                <div className="bd-act-body" style={{ flex: 1 }}>
                  <div className="bd-act-text" style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{a.text}</div>
                  <div className="bd-act-meta" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{a.ts} · {a.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Sticky bottom CTAs */}
      {!isCancelled && (
        <div className="profile-cta" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(250,250,247,0.94)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--line)", padding: "14px 24px", display: "flex", gap: 10, zIndex: 30 }}>
          <button className="btn btn-outline btn-lg" style={{ flex: 1 }} onClick={() => setShowResch(true)}>
            <IBD.edit /> Reschedule
          </button>
          <button className="btn btn-outline btn-lg" style={{ flex: 1, color: "var(--rose)", borderColor: "var(--rose-soft)" }} onClick={() => setShowCancel(true)}>
            <IBD.trash /> Cancel
          </button>
          <a href={`https://wa.me/${b.customer.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="btn btn-wa btn-lg" style={{ flex: 1.5, display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8, background: "var(--wa)", color: "#fff" }}>
            <IBD.wa /> Message {b.customer.name.split(" ")[0]}
          </a>
        </div>
      )}
      {isCancelled && (
        <div className="profile-cta" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(250,250,247,0.94)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--line)", padding: "14px 24px", display: "flex", gap: 10, zIndex: 30, alignItems: "center" }}>
          <div style={{ flex: 1, fontSize: 13, color: "var(--ink-3)" }}>
            This booking was cancelled.
          </div>
          <button className="btn btn-primary btn-lg" onClick={handleRestore} style={{ background: "var(--teal)", color: "#fff" }}>
            Restore booking
          </button>
        </div>
      )}

      {flash && (
        <div style={{
          position: "fixed", bottom: 180, left: "50%", transform: "translateX(-50%)",
          background: "var(--ink)", color: "#fff", padding: "10px 16px",
          borderRadius: 10, fontSize: 13, zIndex: 80,
          boxShadow: "0 12px 24px -10px rgba(0,0,0,0.3)",
        }}>
          {flash}
        </div>
      )}

      {showResch && <RescheduleModal booking={b} onClose={() => setShowResch(false)} onConfirm={handleReschedule} />}
      {showCancel && <CancelModal booking={b} onClose={() => setShowCancel(false)} onConfirm={handleCancel} />}

      {/* Navigation bar */}
      <nav className="bottom-nav">
        <Link href="/dashboard" className="bn-item">
          <IBD.home />
          <span>Home</span>
        </Link>
        <Link href="/dashboard/bookings" className="bn-item active">
          <IBD.cal />
          <span>Bookings</span>
        </Link>
        <Link href="/dashboard/customers" className="bn-item">
          <IBD.users />
          <span>Customers</span>
        </Link>
        <Link href="/dashboard/revenue" className="bn-item">
          <IBD.chart />
          <span>Insights</span>
        </Link>
        <Link href="/dashboard/settings" className="bn-item">
          <IBD.settings />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
}
