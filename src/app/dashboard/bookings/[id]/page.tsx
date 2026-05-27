"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useProfile } from "@/context/ProfileContext";
import { useToast } from "@/context/ToastContext";
import { insertNotification } from "@/lib/notifications";
import {
  BOOKING_STATUS_LABEL,
  formatZonedTimestamp,
  getActualServiceMinutes,
  getNextProgressAction,
  getWaitMinutes,
  mapDbStatusToUiStatus,
  PROGRESS_ACTION_LABEL,
} from "@/lib/booking-progress";
import { useBookingProgress } from "@/hooks";
import { BookingData, BookingProgressAction, BookingStatus, DbServiceRaw } from "@/types";
import { isUUID } from "@/lib/utils";
import { Modal, Badge, Avatar, FormField } from "@/components/ui";
import {
  BOOKING_SERVICE_SELECT_WITH_BUNDLE_DETAILS,
  getBundleOriginalPrice,
  getBundleSavings,
  getBundleSavingsPct,
  getServiceDuration,
  mapServiceWithBundleDetails,
} from "@/lib/service-bundles";

// ===== ICONS =====
type IconProps = React.SVGProps<SVGSVGElement>;

const IBD = {
  home: (p?: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" {...p}>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/>
    </svg>
  ),
  cal: (p?: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M8 3v4M16 3v4M3 10h18"/>
    </svg>
  ),
  users: (p?: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/>
      <circle cx="10" cy="7" r="4"/>
      <path d="M21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  chart: (p?: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" {...p}>
      <path d="M3 21V3M21 21H3"/>
      <rect x="7" y="11" width="3" height="6" rx="0.5"/>
      <rect x="12" y="7" width="3" height="10" rx="0.5"/>
      <rect x="17" y="13" width="3" height="4" rx="0.5"/>
    </svg>
  ),
  settings: (p?: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" {...p}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
    </svg>
  ),
  back: (p?: IconProps) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  more: (p?: IconProps) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="5" r="1.5"/>
      <circle cx="12" cy="12" r="1.5"/>
      <circle cx="12" cy="19" r="1.5"/>
    </svg>
  ),
  clock: (p?: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 2"/>
    </svg>
  ),
  pin: (p?: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  rupee: (p?: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 3h12M6 8h12M6 13c8 0 8-10 0-10M6 13l8 8"/>
    </svg>
  ),
  wa: (p?: IconProps) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...p}>
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.2 3.2.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.3c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
    </svg>
  ),
  check: (p?: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  x: (p?: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
  edit: (p?: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>
    </svg>
  ),
  trash: (p?: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
    </svg>
  ),
};

// ===== TYPES =====

import { CANCEL_REASONS, RESCH_DAYS, ALL_SLOTS } from "@/constants/bookings";

const STATUS_LABEL = BOOKING_STATUS_LABEL;

const EMPTY_BOOKING: BookingData = {
  id: "",
  status: "confirmed",
  date: "",
  time: "00:00",
  duration: 0,
  customer: {
    id: "",
    name: "",
    initials: "",
    tone: "a",
    phone: "",
    visits: 0,
    lastVisit: "",
    spend: 0,
    memberSince: "",
  },
  services: [],
  stylist: { name: "", short: "", tone: "a" },
  notes: "",
  payment: { status: "pending", method: null },
  activity: [],
};

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
    <Modal
      title="Reschedule booking"
      onClose={onClose}
      width="min(520px, 100%)"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Keep original</button>
          <button className="btn btn-primary" onClick={() => onConfirm({ date, time, note })}>
            Reschedule &amp; notify
          </button>
        </>
      }
    >
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: -14, marginBottom: 14 }}>
        {booking.customer.name} · {booking.services.map(s => s.name).join(" + ")}
      </div>
      <FormField label="New date">
        <div className="date-row" style={{ margin: 0, padding: 0, maxWidth: "100%" }}>
          {RESCH_DAYS.map(d => (
            <button
              key={d.key}
              className={`date-pill ${date === d.key ? "on" : ""}`}
              onClick={() => setDate(d.key)}
            >
              <span className="date-dow">{d.dow}</span>
              <span className="date-dom">{d.dom}</span>
              {d.label && <span className="date-lbl">{d.label}</span>}
            </button>
          ))}
        </div>
      </FormField>
      <FormField label="New time" style={{ marginTop: 14 }}>
        <div className="time-grid" style={{ marginTop: 0 }}>
          {ALL_SLOTS.map(s => (
            <button
              key={s}
              className={`time-pill ${time === s ? "on" : ""}`}
              onClick={() => setTime(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </FormField>
      <FormField label="Add a note to the customer (optional)" style={{ marginTop: 14 }}>
        <textarea
          placeholder='e.g. "Sorry, Anjali had a family emergency. Hope this works!"'
          value={note}
          onChange={e => setNote(e.target.value)}
          style={{ minHeight: 64 }}
        />
      </FormField>
      <div className="trust" style={{ marginTop: 12 }}>
        <IBD.wa style={{ color: "var(--wa)", width: 18, height: 18, flexShrink: 0 }} />
        <div>The customer will get a WhatsApp message with the new time and a &ldquo;Reply YES to confirm&rdquo; prompt.</div>
      </div>
    </Modal>
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
    <Modal
      title="Cancel booking"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Keep booking</button>
          <button className="btn btn-danger" onClick={() => onConfirm({ reason, note, notify })}>
            <IBD.trash /> Cancel booking
          </button>
        </>
      }
    >
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: -14, marginBottom: 14 }}>
        {booking.customer.name} · {booking.date} · {booking.time}
      </div>
      <FormField label="Reason for cancellation">
        <div className="reason-list">
          {CANCEL_REASONS.map(r => (
            <label key={r.id} className={`reason-opt ${reason === r.id ? "on" : ""}`}>
              <input
                type="radio"
                checked={reason === r.id}
                onChange={() => setReason(r.id)}
              />
              <span>{r.label}</span>
            </label>
          ))}
        </div>
      </FormField>
      <FormField label="Internal note (optional)" style={{ marginTop: 12 }}>
        <textarea
          placeholder="For your records — won't be shared with customer"
          value={note}
          onChange={e => setNote(e.target.value)}
          style={{ minHeight: 60 }}
        />
      </FormField>
      <label className="flex items-center gap-2.5 text-[13px] cursor-pointer mt-2">
        <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="accent-teal w-4 h-4 shrink-0" />
        <span>Notify {booking.customer.name.split(" ")[0]} via WhatsApp with an apology + 10% off voucher</span>
      </label>
    </Modal>
  );
}

function BookingComboDetails({ service }: { service: BookingData["services"][number] }) {
  if (service.kind !== "bundle") return null;

  const included = service.includedServices || [];
  if (included.length === 0 && !service.bundle_note) return null;

  const savings = getBundleSavings(service);
  const savingsPct = getBundleSavingsPct(service);
  const originalPrice = getBundleOriginalPrice(service);

  return (
    <div className="mt-2 rounded-lg border border-line bg-bg-2 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {savings > 0 && (
          <span className="font-mono text-[11px] font-semibold text-teal">
            Save {savingsPct}% · ₹{savings.toLocaleString("en-IN")}
          </span>
        )}
      </div>
      {included.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {included.map((item) => (
            <span key={item.id} className="rounded-full border border-line bg-white px-2 py-0.5 text-[11px] leading-tight text-ink-2">
              {item.name}
            </span>
          ))}
        </div>
      )}
      {service.bundle_note && <div className="mt-1.5 text-[11px] leading-snug text-ink-3">{service.bundle_note}</div>}
    </div>
  );
}

// ===== MAIN PAGE COMPONENT =====
export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.id as string || "BK-2026-0517";
  const { salonId } = useProfile();

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<BookingStatus>("confirmed");
  const [showResch, setShowResch] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const { show: showFlash } = useToast();
  const { advanceBooking } = useBookingProgress();
  const [activity, setActivity] = useState<BookingData["activity"]>([]);
  const [rescheduled, setRescheduled] = useState<{ date: string; time: string } | null>(null);
  const [salonInfo, setSalonInfo] = useState({
    name: "ChairBook",
    area: "",
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
    const isUuid = isUUID(bookingId);

    if (!isUuid || !supabase) {
      queueMicrotask(() => {
        setBooking(null);
        setActivity([]);
        setLoading(false);
      });
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
            payment_status,
            bill_total,
            amount_paid,
            amount_due,
            arrived_at,
            started_at,
            completed_at,
            actual_duration_minutes,
            notes,
            created_at,
            source,
            customer:customers (id, name, phone, created_at),
            stylist:stylists (id, name, tone),
            booking_services (${BOOKING_SERVICE_SELECT_WITH_BUNDLE_DETAILS})
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
                amount_paid,
                bill_total,
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
                const legacySum = cb.booking_services?.reduce((s: number, bs: { price_at_booking: number; qty?: number | null }) => s + (Number(bs.price_at_booking) * (bs.qty || 1)), 0) || 0;
                return sum + Number(cb.amount_paid || (cb.status === "Paid" ? cb.bill_total || legacySum : 0));
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
            .order("received_at", { ascending: false });

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

          const uiStatus = mapDbStatusToUiStatus(data.status);
          const payments = Array.isArray(paymentData) ? paymentData : [];
          const ledgerPaid = payments.reduce((sum: number, row: { amount?: number | string | null }) => sum + Number(row.amount || 0), 0);
          const totalFromServices = (data.booking_services as unknown as Array<{ price_at_booking: number; qty?: number | null }> | null)?.reduce((sum, bs) => sum + Number(bs.price_at_booking) * (bs.qty || 1), 0) || 0;
          const amountPaid = Number(data.amount_paid || ledgerPaid || 0);
          const billTotal = Number(data.bill_total || (data.status === "Paid" ? amountPaid : totalFromServices));
          const amountDue = Math.max(0, Number(data.amount_due ?? Math.max(0, billTotal - amountPaid)));
          const paymentStatus = (data.payment_status || (data.status === "Paid" || amountDue <= 0 && amountPaid > 0 ? "paid" : amountPaid > 0 ? "partial" : "due")) as "paid" | "partial" | "due";
          const lastPaymentMethod = payments[0]?.method || null;
          
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
              ts: data.completed_at ? formatZonedTimestamp(data.completed_at) : "Today",
              icon: "check",
              text: paymentStatus === "paid" ? `Booking completed ${lastPaymentMethod ? `via ${lastPaymentMethod}` : ""}` : "Booking completed",
              meta: paymentStatus === "paid"
                ? `Total paid: ₹${amountPaid.toLocaleString("en-IN")}`
                : paymentStatus === "partial"
                  ? `Partially paid: ₹${amountPaid.toLocaleString("en-IN")} · ₹${amountDue.toLocaleString("en-IN")} due`
                  : `Payment due: ₹${amountDue.toLocaleString("en-IN")}`,
              tone: paymentStatus === "paid" ? "green" : "amber"
            });
          } else if (data.status === "In Service") {
            actList.push({
              ts: data.started_at ? formatZonedTimestamp(data.started_at) : "Today",
              icon: "check",
              text: "Service started",
              meta: "In progress",
              tone: "amber"
            });
          } else if (data.status === "Arrived") {
            actList.push({
              ts: data.arrived_at ? formatZonedTimestamp(data.arrived_at) : "Today",
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

          interface DbBookingServiceRow {
            qty: number | null;
            price_at_booking: number;
            service: DbServiceRaw | null;
          }
          const services = (data.booking_services as unknown as DbBookingServiceRow[] | null)?.flatMap((bs) => {
            if (!bs.service) return [];
            const service = mapServiceWithBundleDetails(bs.service);
            const duration = getServiceDuration(service);
            return [{
              ...service,
              qty: bs.qty || 1,
              duration,
              duration_min: duration,
              price: Number(bs.price_at_booking)
            }];
          }) || [];

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
              status: paymentStatus,
              method: lastPaymentMethod,
              amountPaid,
              amountDue,
              billTotal,
            },
            timing: {
              arrivedAt: data.arrived_at,
              startedAt: data.started_at,
              completedAt: data.completed_at,
              actualDurationMinutes: data.actual_duration_minutes,
            },
            activity: actList
          };

          setBooking(bData);
          setStatus(uiStatus);
          setActivity(actList);
        }
      } catch (err) {
        console.error("Error loading booking details:", err);
        setBooking(null);
        setActivity([]);
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [bookingId]);

  const b = booking || EMPTY_BOOKING;
  const totalDur = b.services.reduce((s, x) => s + x.duration, 0);
  const totalPrice = b.services.reduce((s, x) => s + x.price, 0);
  const displayTotal = b.payment.billTotal || totalPrice;
  const paymentLabel = b.payment.status === "paid"
    ? "Paid"
    : b.payment.status === "partial"
      ? "Partially paid"
      : "Payment due";
  const paymentMeta = b.payment.status === "paid"
    ? `${b.payment.method || "Recorded"} · ₹${(b.payment.amountPaid || displayTotal).toLocaleString("en-IN")}`
    : b.payment.status === "partial"
      ? `₹${(b.payment.amountPaid || 0).toLocaleString("en-IN")} paid · ₹${(b.payment.amountDue || 0).toLocaleString("en-IN")} due`
      : `₹${(b.payment.amountDue || displayTotal).toLocaleString("en-IN")} due`;
  const paymentToneClass = b.payment.status === "paid"
    ? "bg-green-soft text-green"
    : b.payment.status === "partial"
      ? "bg-blue-soft text-blue"
      : "bg-rose-soft text-rose";
  const isCancelled = status === "cancelled";
  const isPast = status === "completed" || status === "noshow" || status === "cancelled";
  const isNoShow = status === "noshow";
  const nextAction = getNextProgressAction(status);
  const actualMinutes = getActualServiceMinutes(b.timing || {});
  const waitMinutes = getWaitMinutes(b.timing || {});

  const advanceStatus = async (action: BookingProgressAction) => {
    const optimisticStatus = action === "mark_arrived" ? "arrived" : action === "start_service" ? "in_service" : "completed";
    setStatus(optimisticStatus);
    if (booking) {
      setBooking({ ...booking, status: optimisticStatus });
    }

    try {
      if (isUUID(bookingId)) {
        const result = await advanceBooking(bookingId, action);
        setStatus(result.status);
        setBooking((prev) => prev ? {
          ...prev,
          status: result.status,
          timing: {
            arrivedAt: result.arrivedAt ?? prev.timing?.arrivedAt,
            startedAt: result.startedAt ?? prev.timing?.startedAt,
            completedAt: result.completedAt ?? prev.timing?.completedAt,
            actualDurationMinutes: result.actualDurationMinutes ?? prev.timing?.actualDurationMinutes,
          },
        } : prev);
      }
    } catch (err) {
      console.error("Failed to advance booking status:", err);
      const errMsg = err instanceof Error
        ? err.message
        : (err && typeof err === "object" && "message" in err)
          ? String((err as { message?: string }).message)
          : "Could not update booking";
      showFlash(errMsg, 2600);
      setStatus(b.status);
      setBooking(booking);
      return;
    }

    setActivity([{
      ts: "Just now",
      icon: "check",
      text: PROGRESS_ACTION_LABEL[action],
      meta: "You",
      tone: "neutral"
    }, ...activity]);
    showFlash(PROGRESS_ACTION_LABEL[action], 1800);
  };

  const markNoShow = async () => {
    const isUuid = isUUID(bookingId);
    if (isUuid) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        try {
          const { error } = await supabase
            .from("bookings")
            .update({ status: "No-show" })
            .eq("id", bookingId);

          if (error) throw error;
        } catch (err) {
          console.error("Failed to mark no-show in Supabase:", err);
          showFlash("Failed to mark no-show", 2600);
          return;
        }
      }
    }

    setStatus("noshow");
    setBooking((prev) => prev ? { ...prev, status: "noshow" } : prev);
    setActivity([{
      ts: "Just now",
      icon: "x",
      text: "Customer marked as No-show",
      meta: "You",
      tone: "rose"
    }, ...activity]);
    showFlash("Marked as No-show", 1800);
  };

  const handleReschedule = async ({ date, time, note }: { date: string; time: string; note: string }) => {
    const day = RESCH_DAYS.find(d => d.key === date);
    if (day) {
      const isUuid = isUUID(bookingId);
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

            if (salonId) {
              insertNotification({
                salon_id: salonId,
                type: "reschedule",
                title: "Booking rescheduled",
                body: `${b.customer.name} rescheduled to ${date} at ${time}`,
                meta: { booking_id: b.id, new_date: date, new_time: time },
              });
            }
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
      showFlash(`Rescheduled — WhatsApp sent to ${b.customer.name}`, 2000);
    }
  };

  const handleCancel = async ({ reason, note, notify }: { reason: string; note: string; notify: boolean }) => {
    const isUuid = isUUID(bookingId);
    const reasonLabel = CANCEL_REASONS.find(r => r.id === reason)?.label || "Other reason";
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

          if (salonId) {
            insertNotification({
              salon_id: salonId,
              type: "cancellation",
              title: "Booking cancelled",
              body: `${b.customer.name}'s booking was cancelled — ${reasonLabel}`,
              meta: { booking_id: b.id, reason: reasonLabel },
            });
          }
        } catch (err) {
          console.error("Failed to cancel booking in Supabase:", err);
          alert("Failed to cancel booking in database.");
          return;
        }
      }
    }

    setStatus("cancelled");
    setActivity([{
      ts: "Just now",
      icon: "x",
      text: `Booking cancelled — ${reasonLabel}`,
      meta: notify ? "WhatsApp + voucher sent" : "No notification",
      tone: "rose"
    }, ...activity]);
    setShowCancel(false);
    showFlash(`Booking cancelled${notify ? " — customer notified" : ""}`, 2000);
  };

  const handleRestore = async () => {
    const isUuid = isUUID(bookingId);
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
      <div className="app pb-[120px] max-[640px]:pb-[100px]">
        {/* Top bar */}
        <div className="bg-surface border-b border-line sticky top-0 z-30">
          <div className="max-w-[760px] mx-auto flex items-center h-14 px-6 max-[640px]:px-4 max-[640px]:h-[52px]">
            <div className="grid place-items-center w-8 h-8 rounded-full bg-bg-2" />
            <div style={{ flex: 1, marginLeft: 8 }}>
              <div className="pulse" style={{ width: 100, height: 16, borderRadius: 4 }} />
              <div className="pulse" style={{ width: 140, height: 10, borderRadius: 3, marginTop: 6 }} />
            </div>
          </div>
        </div>

        <main className="max-w-[760px] mx-auto p-[22px_24px_32px] flex flex-col gap-4.5 max-[640px]:p-[18px_16px_28px] max-[640px]:gap-3.5">
          {/* Hero card skeleton */}
          <div className="bd-hero card">
            <div className="bd-hero-l">
              <div className="pulse" style={{ width: 80, height: 20, borderRadius: 10 }} />
              <div className="pulse" style={{ width: "60%", height: 28, borderRadius: 6, marginTop: 12 }} />
              <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
                <div className="pulse" style={{ width: 150, height: 14, borderRadius: 4 }} />
                <div className="pulse" style={{ width: 120, height: 14, borderRadius: 4 }} />
              </div>
            </div>
            <div className="bd-hero-r">
              <div className="bd-stylist-card">
                <div className="pulse" style={{ width: 44, height: 44, borderRadius: "50%" }} />
                <div>
                  <div className="pulse" style={{ width: 50, height: 10, borderRadius: 3 }} />
                  <div className="pulse" style={{ width: 80, height: 16, borderRadius: 4, marginTop: 6 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Columns */}
          <div className="bd-grid">
            <div>
              {/* Customer Card skeleton */}
              <div className="card bd-customer">
                <div className="bd-section-lbl">
                  <div className="pulse" style={{ width: 80, height: 11, borderRadius: 3 }} />
                  <div className="pulse" style={{ width: 100, height: 12, borderRadius: 3 }} />
                </div>
                <div className="bd-cust-head">
                  <div className="pulse" style={{ width: 44, height: 44, borderRadius: "50%" }} />
                  <div style={{ flex: 1 }}>
                    <div className="pulse" style={{ width: 120, height: 16, borderRadius: 4 }} />
                    <div className="pulse" style={{ width: 80, height: 12, borderRadius: 3, marginTop: 6 }} />
                  </div>
                </div>
                <div className="bd-cust-stats">
                  {[1, 2, 3].map(i => (
                    <div key={i}>
                      <div className="pulse" style={{ width: 30, height: 18, margin: "0 auto", borderRadius: 4 }} />
                      <div className="pulse" style={{ width: 40, height: 10, margin: "6px auto 0", borderRadius: 3 }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Service list skeleton */}
              <div className="card">
                <div className="pulse" style={{ width: 100, height: 16, borderRadius: 4, marginBottom: 16 }} />
                {[1, 2].map(i => (
                  <div key={i} className="bd-svc-row">
                    <div>
                      <div className="pulse" style={{ width: "150px", height: 14, borderRadius: 4 }} />
                      <div className="pulse" style={{ width: "80px", height: 10, borderRadius: 3, marginTop: 6 }} />
                    </div>
                    <div className="pulse" style={{ width: 60, height: 14, borderRadius: 4 }} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              {/* Payment Summary Skeleton */}
              <div className="card">
                <div className="pulse" style={{ width: 120, height: 16, borderRadius: 4, marginBottom: 16 }} />
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                    <div className="pulse" style={{ width: 80, height: 12, borderRadius: 3 }} />
                    <div className="pulse" style={{ width: 50, height: 12, borderRadius: 3 }} />
                  </div>
                ))}
                <div className="bd-total">
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

  if (!booking) {
    return (
      <div className="app pb-[calc(72px+24px)]">
        <div className="bg-surface border-b border-line sticky top-0 z-30">
          <div className="max-w-[760px] mx-auto flex items-center h-14 px-6 max-[640px]:px-4 max-[640px]:h-[52px]">
            <Link className="grid place-items-center w-9 h-9 rounded-full text-ink-2 transition-colors duration-150 no-underline hover:bg-bg-2 hover:text-ink" href="/dashboard/bookings" aria-label="Back">
              <IBD.back />
            </Link>
            <div style={{ flex: 1 }}>
              <div className="text-sm font-semibold">Booking not found</div>
              <div className="text-[11px] text-ink-3 mt-0.5">No database record was returned for this booking.</div>
            </div>
          </div>
        </div>
        <main className="max-w-[760px] mx-auto px-6 py-10 max-[640px]:px-4">
          <div className="card p-6 text-sm text-ink-2">
            This booking is unavailable. Go back to the bookings list and open a live record.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app pb-[calc(72px+24px)] max-[640px]:pb-[calc(72px+16px)]">
      {/* Top bar */}
      <div className="bg-surface border-b border-line sticky top-0 z-30">
        <div className="max-w-[760px] mx-auto flex items-center h-14 px-6 max-[640px]:px-4 max-[640px]:h-[52px]">
          <Link className="grid place-items-center w-9 h-9 rounded-full text-ink-2 transition-colors duration-150 no-underline hover:bg-bg-2 hover:text-ink" href="/dashboard/bookings" aria-label="Back">
            <IBD.back />
          </Link>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.005em" }}>Booking detail</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, letterSpacing: "0.04em" }}>{bookingId}</div>
          </div>
          <button className="icon-btn"><IBD.more /></button>
        </div>
      </div>

      <main className="max-w-[760px] mx-auto p-[22px_24px_32px] flex flex-col gap-4.5 max-[640px]:p-[18px_16px_28px] max-[640px]:gap-3.5">
        {/* Hero card */}
        <div className={`bd-hero card ${isCancelled ? "is-cancelled" : ""}`}>
          <div className="bd-hero-l">
            <Badge tone={status}>{STATUS_LABEL[status]}</Badge>
            <h1 className="bd-hero-title flex flex-wrap items-center gap-1.5">
              {b.services.map((s, i) => (
                <React.Fragment key={s.id || i}>
                  <span className="flex items-center gap-1.5">
                    <span>{s.name}</span>
                    {s.kind === "bundle" && (
                      <span className="bg-[#0f6e56] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">
                        COMBO
                      </span>
                    )}
                  </span>
                  {i < b.services.length - 1 && <span className="text-ink-3 font-normal">+</span>}
                </React.Fragment>
              ))}
            </h1>
            <div className="bd-hero-meta">
              <span><IBD.clock /> {displayDate} · {displayTime}–{displayEnd} <span style={{ color: "var(--ink-3)" }}>({totalDur} min)</span></span>
              <span><IBD.pin /> {salonInfo.name}{salonInfo.area ? `, ${salonInfo.area}` : ""}</span>
            </div>
            {(actualMinutes !== null || waitMinutes !== null) && (
              <div className="flex gap-2 flex-wrap mt-3 text-xs text-ink-3">
                {actualMinutes !== null && <span className="px-2 py-1 rounded-lg bg-bg-2 border border-line">{actualMinutes} min actual</span>}
                {waitMinutes !== null && <span className="px-2 py-1 rounded-lg bg-bg-2 border border-line">{waitMinutes} min wait</span>}
              </div>
            )}
            {rescheduled && (
              <div className="bd-resch-note">
                <IBD.cal /> Rescheduled from {b.date} · {b.time}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              {!isCancelled && (
                <button className="btn btn-outline btn-sm" onClick={() => setShowResch(true)}>
                  <IBD.edit /> Reschedule
                </button>
              )}
            </div>
          </div>
          <div className="bd-hero-r">
            <div className="bd-stylist-card">
              <Avatar initials={b.stylist.short} tone={b.stylist.tone} size="lg" />
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>STYLIST</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{b.stylist.name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Two columns: customer + services & payment */}
        <div className="bd-grid">
          {/* Customer mini-card */}
          <div className="card bd-customer">
            <div className="bd-section-lbl">
              <span>CUSTOMER</span>
              <Link href={`/dashboard/customers/${b.customer.id}`} style={{ marginLeft: "auto", fontSize: 12, color: "var(--teal)", fontWeight: 500 }}>View profile →</Link>
            </div>
            <div className="bd-cust-head">
              <Avatar initials={b.customer.initials} tone={b.customer.tone} size="lg" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="bd-cust-name">{b.customer.name}</div>
                <div className="bd-cust-phone">{b.customer.phone}</div>
              </div>
              <a href={`https://wa.me/${b.customer.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ color: "var(--wa)", borderColor: "var(--wa)" }}>
                <IBD.wa /> WhatsApp
              </a>
            </div>
            <div className="bd-cust-stats">
              <div>
                <div className="num">{b.customer.visits}</div>
                <div className="lbl">Visits</div>
              </div>
              <div>
                <div className="num">₹{b.customer.spend.toLocaleString("en-IN")}</div>
                <div className="lbl">Lifetime</div>
              </div>
              <div>
                <div className="num" style={{ fontSize: 16 }}>{b.customer.lastVisit}</div>
                <div className="lbl">Last visit</div>
              </div>
            </div>
            {b.notes && (
              <div className="bd-cust-note">
                <div className="bd-section-lbl" style={{ marginTop: 0, marginBottom: 6 }}>NOTES</div>
                <p>{b.notes}</p>
              </div>
            )}
          </div>

          {/* Services + payment */}
          <div className="card">
            <div className="bd-section-lbl">SERVICES &amp; PAYMENT</div>
            <div className="bd-svc-list">
              {b.services.map((s, i) => (
                <div key={i} className="bd-svc-row">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span>{s.name}</span>
                      {s.kind === "bundle" && (
                        <span className="bg-[#0f6e56] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">
                          COMBO
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{s.duration} min</div>
                    {s.kind === "bundle" && <BookingComboDetails service={s} />}
                  </div>
                  <div className="flex flex-col items-end justify-center shrink-0">
                    {s.kind === "bundle" && (() => {
                      const originalPrice = getBundleOriginalPrice(s);
                      return originalPrice > Number(s.price || 0) ? (
                        <span className="font-mono text-[11px] text-ink-3 line-through leading-none mb-1">
                          ₹{originalPrice.toLocaleString("en-IN")}
                        </span>
                      ) : null;
                    })()}
                    <div className="bd-svc-price">₹{s.price.toLocaleString("en-IN")}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bd-total">
              <span>Total</span>
              <strong>₹{displayTotal.toLocaleString("en-IN")}</strong>
            </div>
            <div className={`bd-payment ${paymentToneClass}`}>
              <IBD.rupee />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {paymentLabel}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
                  {paymentMeta}
                </div>
              </div>
              {b.payment.status !== "paid" && (
                <Link className="btn btn-primary btn-sm" href={`/dashboard/checkout/${bookingId}`}>
                  {b.payment.status === "partial" ? "Collect balance" : "Take payment"}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Status quick actions */}
        {!isPast && (
          <div className="card bd-quick-status">
            <div className="bd-section-lbl">NEXT ACTION</div>
            <div className="flex gap-2 flex-wrap">
              {nextAction && (
                <button
                  className="btn btn-primary"
                  onClick={() => advanceStatus(nextAction)}
                >
                  <IBD.check /> {PROGRESS_ACTION_LABEL[nextAction]}
                </button>
              )}
              <button
                className={`btn btn-outline ${isNoShow ? "opacity-70" : ""}`}
                style={{ color: "var(--rose)", borderColor: "var(--rose-soft)" }}
                onClick={markNoShow}
              >
                <IBD.x /> No-show
              </button>
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-line">
              <button className="btn btn-outline btn-sm flex-1" style={{ color: "var(--rose)", borderColor: "var(--rose-soft)" }} onClick={() => setShowCancel(true)}>
                <IBD.trash /> Cancel booking
              </button>
            </div>
          </div>
        )}

        {/* Cancelled restore */}
        {isCancelled && (
          <div className="card bd-quick-status">
            <div className="flex items-center justify-between gap-3">
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                This booking was cancelled.
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleRestore}>
                Restore booking
              </button>
            </div>
          </div>
        )}

        {/* Activity log */}
        <div className="card">
          <div className="bd-section-lbl">ACTIVITY</div>
          <div className="bd-activity">
            {activity.map((a, i) => (
              <div key={i} className={`bd-act-row tone-${a.tone}`}>
                <div className="bd-act-ic">
                  {a.icon === "wa" && <IBD.wa style={{ width: 14, height: 14 }} />}
                  {a.icon === "check" && <IBD.check />}
                  {a.icon === "cal" && <IBD.cal style={{ width: 14, height: 14 }} />}
                  {a.icon === "x" && <IBD.x />}
                </div>
                <div className="bd-act-body">
                  <div className="bd-act-text">{a.text}</div>
                  <div className="bd-act-meta">{a.ts} · {a.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>



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
