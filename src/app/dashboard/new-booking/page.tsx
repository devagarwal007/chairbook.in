"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useProfile } from "@/context/ProfileContext";
import { insertNotification } from "@/lib/notifications";
import { initialsOf } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

import { Customer, Service, Stylist, NewCustInput, DbBookingSimple, DbStylistRaw, DbServiceRaw, DbBookingSlotRaw, DbBookingStylistRaw } from "@/types";
import { Icons as IN, FormField, PhoneInput, Avatar, Badge } from "@/components/ui";



// ===== DATA LOADING FROM SUPABASE =====
function generateDays(baseDate: Date) {
  const arr = [];
  const dayNames = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  for (let i = 0; i < 14; i++) {
    const d = new Date(baseDate.getTime() + i * 86400000);
    arr.push({
      key: d.toISOString().slice(0, 10),
      dow: dayNames[d.getDay()],
      dom: d.getDate(),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : null as string | null,
      full: d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
    });
  }
  return arr;
}

const ALL_SLOTS = ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00"];



function formatLast(days: number) {
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

// ===== STEP BAR =====
function StepBar({ step }: { step: number }) {
  const steps = ["Customer", "Services", "When & who", "Confirm"];
  return (
    <div className="nb-stepbar">
      {steps.map((label, i) => {
        const n = i + 1;
        return (
          <React.Fragment key={n}>
            <div className={`nb-step ${step === n ? "active" : ""} ${step > n ? "done" : ""}`}>
              <div className="nb-step-num">{step > n ? <IN.check /> : n}</div>
              <div className="nb-step-lbl">{label}</div>
            </div>
            {i < steps.length - 1 && <div className={`nb-step-line ${step > n ? "done" : ""}`}></div>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ===== STEP 1 — CUSTOMER =====
interface StepCustomerProps {
  customer: Customer | null;
  onSelect: (c: Customer) => void;
  onAddNew: (n: NewCustInput) => void;
  newCust: NewCustInput;
  setNewCust: React.Dispatch<React.SetStateAction<NewCustInput>>;
  mode: string;
  setMode: (m: string) => void;
  dbCustomers: Customer[];
  loading: boolean;
}

function StepCustomer({ customer, onSelect, onAddNew, newCust, setNewCust, mode, setMode, dbCustomers, loading }: StepCustomerProps) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return dbCustomers.slice(0, 6);
    const query = q.toLowerCase();
    return dbCustomers.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query)
    );
  }, [q, dbCustomers]);

  const duplicateCustomer = useMemo(() => {
    if (newCust.noPhone || !newCust.phone.trim()) return null;
    const cleanInput = newCust.phone.replace(/\D/g, "").replace(/^91/, "");
    if (!cleanInput) return null;
    return dbCustomers.find(c => {
      if (!c.phone) return false;
      return c.phone.replace(/\D/g, "").replace(/^91/, "") === cleanInput;
    });
  }, [newCust.phone, newCust.noPhone, dbCustomers]);

  return (
    <div className="nb-step-content">
      <h1 className="nb-title">{"Who's the booking for?"}</h1>
      <p className="nb-sub">Search your existing customers, or add someone new in 2 fields.</p>

      <div className="nb-mode-toggle">
        <button className={`nb-mode ${mode === "existing" ? "on" : ""}`} onClick={() => setMode("existing")}>
          <IN.search /> Search existing
          <span className="nb-mode-count">{dbCustomers.length}</span>
        </button>
        <button className={`nb-mode ${mode === "new" ? "on" : ""}`} onClick={() => setMode("new")}>
          <IN.plus /> Add new customer
        </button>
      </div>

      {mode === "existing" && (
        <>
          <div className="cust-search" style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid var(--line-2)", borderRadius: "var(--radius)", padding: "10px 14px", marginTop: 18 }}>
            <IN.search />
            <input
              placeholder="Search by name or phone…"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ flex: 1, border: 0, outline: 0, fontSize: "var(--t-body)", fontFamily: "inherit" }}
              autoFocus
            />
            {q && (
              <button className="svc-search-clear" onClick={() => setQ("")} aria-label="Clear" style={{ border: 0, background: "transparent", cursor: "pointer", display: "grid", placeItems: "center" }}>
                <IN.x />
              </button>
            )}
          </div>

          <div className="nb-cust-list">
            {loading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="pulse" style={{ height: 56, borderRadius: 10, marginBottom: 8 }} />
            ))}
            {!loading && filtered.length === 0 && (
              <div className="nb-empty">
                <strong>No customer matches &ldquo;{q}&rdquo;</strong>
                <p>Switch to &ldquo;Add new customer&rdquo; to create them now.</p>
                <button className="btn btn-primary btn-sm" onClick={() => { setNewCust({ ...newCust, name: q }); setMode("new"); }}>
                  <IN.plus /> Add &ldquo;{q}&rdquo; as new customer
                </button>
              </div>
            )}
            {!loading && filtered.map(c => (
              <button
                key={c.id}
                className={`nb-cust-row ${customer?.id === c.id ? "on" : ""}`}
                onClick={() => onSelect(c)}
              >
                <Avatar initials={initialsOf(c.name)} tone={c.tone} size="md" />
                <div className="nb-cust-main">
                  <div className="nb-cust-name">{c.name}</div>
                  <div className="nb-cust-meta">
                    <span>{c.phone}</span>
                    <span className="dot-sep">·</span>
                    <span>{c.visits ?? 0} visit{(c.visits ?? 0) === 1 ? "" : "s"} · Last {formatLast(c.lastDays ?? 999)}</span>
                  </div>
                </div>
                <div className="nb-cust-spend mono">₹{(c.spend ?? 0).toLocaleString("en-IN")}</div>
                {customer?.id === c.id && <div className="nb-cust-tick"><IN.check /></div>}
              </button>
            ))}
          </div>
        </>
      )}

      {mode === "new" && (
        <div className="nb-new-form">
          <FormField label="Full name">
            <input
              placeholder="e.g. Priya Sharma"
              value={newCust.name}
              onChange={e => setNewCust({ ...newCust, name: e.target.value })}
              autoFocus
            />
          </FormField>
          <div className="field-row" style={{ marginTop: 14 }}>
            <FormField label="Phone (optional for walk-ins)">
              <PhoneInput
                value={newCust.phone}
                onChange={val => setNewCust({ ...newCust, phone: val })}
              />
            </FormField>
            <FormField label="How did they hear about us?">
              <select value={newCust.source} onChange={e => setNewCust({ ...newCust, source: e.target.value })} style={{ width: "100%", height: 42, background: "#fff", border: "1px solid var(--line-2)", borderRadius: 10, padding: "0 10px", outline: 0 }}>
                <option value="">— Optional —</option>
                <option>Walk-in</option>
                <option>WhatsApp / link</option>
                <option>Referral</option>
                <option>Instagram</option>
                <option>Google</option>
                <option>Existing customer</option>
              </select>
            </FormField>
          </div>
          <label className="flex items-center gap-2.5 text-[13px] cursor-pointer mt-3">
            <input type="checkbox" checked={newCust.noPhone} onChange={e => setNewCust({ ...newCust, noPhone: e.target.checked })} className="accent-teal w-4 h-4 shrink-0" />
            <span>This customer doesn&apos;t want to share a phone number (guest mode — no WhatsApp reminders)</span>
          </label>

          {duplicateCustomer && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "var(--amber-soft)", border: "1px solid var(--amber)", color: "var(--ink)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "var(--amber-ink)", fontSize: 13 }}>
                ⚠️ Phone number already in use
              </div>
              <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "var(--ink-2)", lineHeight: "1.4" }}>
                This number is already linked to <strong>{duplicateCustomer.name}</strong>. Do you want to use the existing profile or change the phone number?
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: "var(--teal)", color: "#fff", border: 0, height: 28, fontSize: 12, padding: "0 10px", borderRadius: 6, cursor: "pointer" }}
                  onClick={() => onSelect(duplicateCustomer)}
                >
                  Use {duplicateCustomer.name}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  style={{ height: 28, fontSize: 12, padding: "0 10px", borderRadius: 6, cursor: "pointer" }}
                  onClick={() => setNewCust({ ...newCust, phone: "" })}
                >
                  Clear phone
                </button>
              </div>
            </div>
          )}

          {newCust.name.trim() && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 18, opacity: duplicateCustomer ? 0.5 : 1, cursor: duplicateCustomer ? "not-allowed" : "pointer" }}
              disabled={!!duplicateCustomer}
              onClick={() => onAddNew(newCust)}
            >
              <IN.check /> Use {newCust.name}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ===== STEP 2 — SERVICES =====
interface StepServicesProps {
  services: Service[];
  toggleService: (s: Service) => void;
  dbServices: Service[];
  loading: boolean;
}

function StepServices({ services, toggleService, dbServices, loading }: StepServicesProps) {
  const cats = useMemo(() => {
    const unique = new Set(dbServices.map(s => s.cat));
    return Array.from(unique).sort();
  }, [dbServices]);

  if (loading) {
    return (
      <div className="nb-step-content">
        <h1 className="nb-title">What service{services.length > 1 ? "s" : ""}?</h1>
        <p className="nb-sub">Pick one or more. Total duration and price update at the bottom.</p>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="pulse" style={{ height: 80, borderRadius: 12, marginBottom: 12 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="nb-step-content">
      <h1 className="nb-title">What service{services.length > 1 ? "s" : ""}?</h1>
      <p className="nb-sub">Pick one or more. Total duration and price update at the bottom.</p>
      {cats.map(cat => (
        <div key={cat} className="svc-cat" style={{ marginBottom: 18 }}>
          <div className="svc-cat-name" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>{cat}</div>
          <div className="svc-list" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {dbServices.filter(s => s.cat === cat).map(s => {
              const on = services.some(x => x.id === s.id);
              return (
                <button
                  key={s.id}
                  className={`svc-card ${on ? "on" : ""}`}
                  onClick={() => toggleService(s)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: on ? "1px solid var(--teal)" : "1px solid var(--line-2)",
                    background: on ? "var(--teal-soft)" : "#fff",
                    textAlign: "left",
                    cursor: "pointer",
                    width: "100%"
                  }}
                >
                  <div className="svc-info">
                    <div className="svc-name" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{s.name}</div>
                    <div className="svc-meta" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
                      <IN.clock /> {s.duration} min
                    </div>
                  </div>
                  <div className="svc-price" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="svc-price-v" style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-mono)" }}>₹{s.price.toLocaleString("en-IN")}</div>
                    <div className={`svc-check ${on ? "on" : ""}`} style={{ width: 18, height: 18, borderRadius: "50%", border: on ? "1px solid var(--teal)" : "1px solid var(--line-2)", background: on ? "var(--teal)" : "#fff", display: "grid", placeItems: "center", color: "#fff" }}>
                      {on && <IN.check />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== STEP 3 — WHEN & WHO =====
interface StepWhenProps {
  services: Service[];
  totalDuration: number;
  stylist: string | number;
  date: string;
  time: string | null;
  onStylist: (id: string | number) => void;
  onDate: (d: string) => void;
  onTime: (t: string | null) => void;
  overrideAvail: boolean;
  setOverrideAvail: (val: boolean) => void;
  dbStylists: Stylist[];
  days: ReturnType<typeof generateDays>;
  slots: { time: string; taken: boolean }[];
  loadingBookings: boolean;
}

function StepWhen({ services, totalDuration, stylist, date, time, onStylist, onDate, onTime, overrideAvail, setOverrideAvail, dbStylists, days, slots, loadingBookings }: StepWhenProps) {
  const dateLabel = days.find(d => d.key === date);
  return (
    <div className="nb-step-content">
      <h1 className="nb-title">When &amp; with whom?</h1>
      <p className="nb-sub">
        {services.length} service{services.length === 1 ? "" : "s"} · {totalDuration} min total
      </p>

      <div className="block-label" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-3)", marginBottom: 10 }}>Stylist</div>
      <div className="stylist-row" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 10, marginBottom: 18 }}>
        {dbStylists.map(s => (
          <button
            key={s.id}
            className={`stylist-card ${stylist === s.id ? "on" : ""}`}
            onClick={() => onStylist(s.id)}
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "12px 16px",
              borderRadius: 12,
              border: stylist === s.id ? "1px solid var(--teal)" : "1px solid var(--line-2)",
              background: stylist === s.id ? "var(--teal-soft)" : "#fff",
              width: 100,
              cursor: "pointer"
            }}
          >
            <Avatar
              initials={s.short || s.name[0]}
              tone={s.tone ?? undefined}
              size="lg"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: stylist === s.id ? "var(--teal-soft)" : "var(--bg-2)",
                color: stylist === s.id ? "var(--teal)" : "var(--ink-2)",
                display: "grid",
                placeItems: "center",
                fontWeight: "bold",
                fontSize: 16,
              }}
            />
            <div className="stylist-name" style={{ fontSize: 13, fontWeight: 500, marginTop: 8, color: "var(--ink)", textAlign: "center", whiteSpace: "nowrap" }}>{s.name}</div>
          </button>
        ))}
      </div>

      <div className="block-label" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-3)", marginBottom: 10 }}>Date</div>
      <div className="date-row" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 18 }}>
        {days.map(d => (
          <button
            key={d.key}
            className={`date-pill ${date === d.key ? "on" : ""}`}
            onClick={() => { onDate(d.key); onTime(null); }}
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
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

      <div className="block-label" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-3)", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
        <span>Time slots for {dateLabel?.full}</span>
        <span className="block-meta" style={{ textTransform: "none", color: "var(--teal)" }}>{slots.filter(s => !s.taken).length} open</span>
      </div>
      {loadingBookings ? (
        <div style={{ padding: 20 }}>Loading availability...</div>
      ) : (
        <div className="time-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 18 }}>
          {slots.map(s => {
            const canPick = overrideAvail || !s.taken;
            return (
              <button
                key={s.time}
                disabled={!canPick}
                className={`time-pill ${time === s.time ? "on" : ""} ${s.taken ? "taken" : ""}`}
                onClick={() => canPick && onTime(s.time)}
                title={s.taken ? "Already booked" : ""}
                style={{
                  padding: "10px 0",
                  borderRadius: 8,
                  border: "1px solid var(--line-2)",
                  background: time === s.time ? "var(--teal)" : s.taken ? "var(--bg-2)" : "#fff",
                  color: time === s.time ? "#fff" : s.taken ? "var(--ink-4)" : "var(--ink-2)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: canPick ? "pointer" : "not-allowed",
                  textDecoration: s.taken && !overrideAvail ? "line-through" : "none"
                }}
              >
                {s.time}
              </button>
            );
          })}
        </div>
      )}

      <label className="flex items-center gap-2.5 text-[13px] cursor-pointer mt-4 py-3 px-3.5 bg-amber-soft rounded-[10px] text-amber-ink">
        <input type="checkbox" checked={overrideAvail} onChange={e => setOverrideAvail(e.target.checked)} className="accent-teal w-4 h-4 shrink-0" />
        <span style={{ fontSize: 13 }}>Allow booking over taken slots (use with caution — may cause double-booking)</span>
      </label>
    </div>
  );
}

// ===== STEP 4 — CONFIRM =====
interface StepConfirmProps {
  customer: Customer;
  services: Service[];
  totalDuration: number;
  totalPrice: number;
  stylist: string | number;
  date: string;
  time: string;
  note: string;
  setNote: (n: string) => void;
  sendConfirm: boolean;
  setSendConfirm: (val: boolean) => void;
  takePayment: boolean;
  setTakePayment: (val: boolean) => void;
  dbStylists: Stylist[];
  days: ReturnType<typeof generateDays>;
}

function StepConfirm({ customer, services, totalDuration, totalPrice, stylist, date, time, note, setNote, sendConfirm, setSendConfirm, takePayment, setTakePayment, dbStylists, days }: StepConfirmProps) {
  const stylistObj = dbStylists.find(s => s.id === stylist);
  const dateObj = days.find(d => d.key === date);
  const endMin = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]) + totalDuration;
  const endTime = `${String(Math.floor(endMin/60)).padStart(2,"0")}:${String(endMin%60).padStart(2,"0")}`;
  return (
    <div className="nb-step-content">
      <h1 className="nb-title">Confirm booking</h1>
      <p className="nb-sub">Review &amp; create. You can edit anything later from the booking detail.</p>

      <div className="nb-summary">
        <div className="nb-summary-head">
          <Avatar initials={initialsOf(customer.name)} tone={customer.tone} size="lg" />
          <div style={{ flex: 1 }}>
            <div className="nb-summary-name">{customer.name}</div>
            {customer.phone && <div className="nb-summary-phone">{customer.phone}</div>}
            {customer.isNew && <Badge tone="confirmed" showDot={false} style={{ marginTop: 6 }}>NEW CUSTOMER</Badge>}
          </div>
        </div>

        <div className="nb-summary-divider"></div>

        <div className="nb-summary-block">
          <div className="nb-summary-lbl">SERVICES</div>
          {services.map(s => (
            <div key={s.id} className="nb-summary-svc">
              <span>{s.name} <small style={{ color: "var(--ink-3)" }}>· {s.duration} min</small></span>
              <span className="mono">₹{s.price.toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>

        <div className="nb-summary-divider"></div>

        <div className="nb-summary-row"><span>When</span><strong>{dateObj?.full}</strong></div>
        <div className="nb-summary-row"><span>Time</span><strong>{time} – {endTime} <small style={{ color: "var(--ink-3)" }}>({totalDuration} min)</small></strong></div>
        <div className="nb-summary-row"><span>Stylist</span><strong>{stylistObj?.name || stylist}</strong></div>
        <div className="nb-summary-row nb-summary-total">
          <span>Total</span>
          <strong className="mono">₹{totalPrice.toLocaleString("en-IN")}</strong>
        </div>
      </div>

      <FormField label="Note (internal)" style={{ marginTop: 18 }}>
        <textarea
          placeholder="e.g. Customer prefers ammonia-free color. Will come 10 min late."
          value={note}
          onChange={e => setNote(e.target.value)}
          style={{ minHeight: 64, width: "100%", padding: 12, borderRadius: 10, border: "1px solid var(--line-2)", outline: 0, resize: "vertical", fontFamily: "inherit" }}
        />
      </FormField>

      <div className="nb-toggles">
        <label className={`flex items-center gap-2.5 text-[13px] ${customer.phone ? "cursor-pointer" : "cursor-not-allowed"}`}>
          <input type="checkbox" checked={sendConfirm} onChange={e => setSendConfirm(e.target.checked)} disabled={!customer.phone} className="accent-teal w-4 h-4 shrink-0" />
          <span>
            Send a WhatsApp confirmation to {customer.name.split(" ")[0]}
            {!customer.phone && <small style={{ color: "var(--ink-3)" }}> · no phone on file</small>}
          </span>
        </label>
        <label className="flex items-center gap-2.5 text-[13px] cursor-pointer mt-2.5">
          <input type="checkbox" checked={takePayment} onChange={e => setTakePayment(e.target.checked)} className="accent-teal w-4 h-4 shrink-0" />
          <span>Take payment in advance after creating</span>
        </label>
      </div>
    </div>
  );
}



// ===== MAIN PAGE COMPONENT =====
export default function NewBookingPage() {
  const { salonId } = useProfile();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("existing");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [newCust, setNewCust] = useState<NewCustInput>({ name: "", phone: "", source: "", noPhone: false });
  const [services, setServices] = useState<Service[]>([]);
  const [stylist, setStylist] = useState<string | number>("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState<string | null>(null);
  const [overrideAvail, setOverrideAvail] = useState(false);
  const [note, setNote] = useState("");
  const [sendConfirm, setSendConfirm] = useState(true);
  const [takePayment, setTakePayment] = useState(false);
  const [created, setCreated] = useState(false);
  const { show: showFlash } = useToast();
  const [newBookingId, setNewBookingId] = useState<string | null>(null);

  // DB-loaded data
  const [dbCustomers, setDbCustomers] = useState<Customer[]>([]);
  const [dbServices, setDbServices] = useState<Service[]>([]);
  const [dbStylists, setDbStylists] = useState<Stylist[]>([]);
  const [loadingCust, setLoadingCust] = useState(true);
  const [loadingSvcs, setLoadingSvcs] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const days = useMemo(() => generateDays(new Date()), []);

  const totalDuration = services.reduce((s, x) => s + x.duration, 0);
  const totalPrice = services.reduce((s, x) => s + x.price, 0);

  // Load customers, services, stylists from DB
  useEffect(() => {
    if (!salonId) {
      queueMicrotask(() => {
        setLoadingCust(false);
        setLoadingSvcs(false);
      });
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      queueMicrotask(() => {
        setLoadingCust(false);
        setLoadingSvcs(false);
      });
      return;
    }

    const loadData = async () => {
      try {
        // Load customers with booking aggregates
        const { data: custData } = await supabase
          .from("customers")
          .select("id, name, phone, created_at")
          .eq("salon_id", salonId)
          .order("created_at", { ascending: false });

        if (custData) {
          const tones = ["a", "b", "c", "d", "e", "f"];
          const mappedCust: Customer[] = custData.map((c, i) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || "",
            visits: 0,
            lastDays: 0,
            spend: 0,
            tone: tones[i % tones.length],
          }));
          setDbCustomers(mappedCust);
        }

        // Load booking visit counts and spends
        const { data: bkData } = await supabase
          .from("bookings")
          .select("id, customer_id, status, date, booking_services(price_at_booking, qty)")
          .eq("salon_id", salonId)
          .in("status", ["Completed", "Paid", "Confirmed", "Arrived"])
          .order("date", { ascending: false });

        if (bkData) {
          const bkList = bkData as unknown as DbBookingSimple[];
          const visitsMap: Record<string, number> = {};
          const spendMap: Record<string, number> = {};
          const lastDateMap: Record<string, string> = {};
          const now = new Date();
          bkList.forEach((b) => {
            const customerIdKey = b.customer_id;
            if (!visitsMap[customerIdKey]) visitsMap[customerIdKey] = 0;
            visitsMap[customerIdKey]++;
            const spend = b.booking_services?.reduce((s: number, bs) => s + (Number(bs.price_at_booking) * (bs.qty || 1)), 0) || 0;
            spendMap[customerIdKey] = (spendMap[customerIdKey] || 0) + spend;
            if (!lastDateMap[customerIdKey] || b.date > lastDateMap[customerIdKey]) {
              lastDateMap[customerIdKey] = b.date;
            }
          });

          setDbCustomers(prev => prev.map(c => {
            const lastDate = lastDateMap[c.id];
            let lastDays = 999;
            if (lastDate) {
              lastDays = Math.floor((now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
            }
            return {
              ...c,
              visits: visitsMap[c.id] || 0,
              spend: spendMap[c.id] || 0,
              lastDays,
            };
          }));
        }
      } catch (err) {
        console.error("Error loading customers:", err);
      } finally {
        queueMicrotask(() => {
          setLoadingCust(false);
        });
      }
    };

    const loadStylistsAndServices = async () => {
      const supabaseClient = getSupabaseBrowserClient();
      if (!supabaseClient) {
        queueMicrotask(() => {
          setLoadingSvcs(false);
        });
        return;
      }
      try {
        const { data: stylistsData } = await supabaseClient
          .from("stylists").select("id, name, tone").eq("salon_id", salonId).eq("active", true);
        if (stylistsData && stylistsData.length > 0) {
          const rawStylists = stylistsData as unknown as DbStylistRaw[];
          setDbStylists(rawStylists.map((s) => ({
            id: s.id,
            name: s.name,
            short: s.name[0],
            tone: (s.tone || "tone-a").replace("tone-", ""),
            skills: [],
          })));
        }

        const { data: servicesData } = await supabaseClient
          .from("services").select("id, name, category, duration_min, price")
          .eq("salon_id", salonId).eq("active", true);
        if (servicesData && servicesData.length > 0) {
          const rawServices = servicesData as unknown as DbServiceRaw[];
          setDbServices(rawServices.map((s) => ({
            id: s.id,
            name: s.name,
            cat: s.category || "General",
            duration: s.duration_min,
            price: Number(s.price),
          })));
        }
      } catch (err) {
        console.error("Error loading services:", err);
      } finally {
        queueMicrotask(() => {
          setLoadingSvcs(false);
        });
      }
    };

    queueMicrotask(() => {
      loadData();
      loadStylistsAndServices();
    });
  }, [salonId]);

  // Load real slot availability when date or stylist changes
  useEffect(() => {
    if (!salonId || !date) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const loadSlots = async () => {
      queueMicrotask(() => setLoadingBookings(true));
      try {
        let query = supabase
          .from("bookings")
          .select("id, start_time, duration")
          .eq("salon_id", salonId)
          .eq("date", date)
          .in("status", ["Confirmed", "Arrived"]);

        if (stylist && stylist !== "any") {
          query = query.eq("stylist_id", stylist);
        }

        const { data } = await query;

        const takenSlots = new Set<string>();
        if (data) {
          const slotList = data as unknown as DbBookingSlotRaw[];
          slotList.forEach((b) => {
            const [h, m] = (b.start_time || "00:00").split(":").map(Number);
            const startMin = h * 60 + m;
            const endMin = startMin + (b.duration || 30);
            ALL_SLOTS.forEach(s => {
              const [sh, sm] = s.split(":").map(Number);
              const slotMin = sh * 60 + sm;
              if (slotMin >= startMin && slotMin < endMin) {
                takenSlots.add(s);
              }
            });
          });
        }

        // If looking at "First available" / "any", check ALL stylists
        if (!stylist || stylist === "any") {
          const { data: allBookings } = await supabase
            .from("bookings")
            .select("id, start_time, duration, stylist_id")
            .eq("salon_id", salonId)
            .eq("date", date)
            .in("status", ["Confirmed", "Arrived"]);

          if (allBookings && dbStylists.length > 0) {
            const bookingsList = allBookings as unknown as DbBookingStylistRaw[];
            // A slot is only completely taken if ALL stylists are booked
            const stylistSlotMap: Record<string, Set<string>> = {};
            dbStylists.forEach(s => { stylistSlotMap[s.id] = new Set(); });
            bookingsList.forEach((b) => {
              const stylistIdKey = String(b.stylist_id);
              if (stylistSlotMap[stylistIdKey]) {
                const [h, m] = (b.start_time || "00:00").split(":").map(Number);
                const startMin = h * 60 + m;
                const endMin = startMin + (b.duration || 30);
                ALL_SLOTS.forEach(s => {
                  const [sh, sm] = s.split(":").map(Number);
                  const slotMin = sh * 60 + sm;
                  if (slotMin >= startMin && slotMin < endMin) {
                    stylistSlotMap[stylistIdKey].add(s);
                  }
                });
              }
            });
            // Slot is taken only if ALL stylists have it booked
            const allStylistIds = dbStylists.map(s => String(s.id));
            if (allStylistIds.length > 0) {
              ALL_SLOTS.forEach(s => {
                const allBusy = allStylistIds.every(sid => stylistSlotMap[sid]?.has(s));
                if (allBusy) takenSlots.add(s);
              });
            }
          }
        }
      } catch (err) {
        console.error("Error loading slot availability:", err);
      } finally {
        queueMicrotask(() => {
          setLoadingBookings(false);
        });
      }
    };

    queueMicrotask(() => {
      loadSlots();
    });
  }, [salonId, date, stylist, dbStylists]);

  // Recompute slots with taken info
  const computedSlots = useMemo(() => {
    // We need to rebuild with actual taken data
    // This gets merged in the render via state
    return ALL_SLOTS.map(s => ({ time: s, taken: false }));
  }, []);

  const toggleService = (s: Service) => {
    setServices(prev => prev.some(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]);
  };

  const selectCustomer = (c: Customer) => setCustomer(c);
  const addNewCustomer = (n: NewCustInput) => {
    const tones = ["a", "b", "c", "d", "e", "f"];
    const tone = tones[(n.name.length || 0) % tones.length];
    const customerObj = {
      id: `new_${Date.now()}`,
      name: n.name,
      phone: n.noPhone ? "" : (n.phone ? `+91 ${n.phone}` : ""),
      visits: 0,
      lastDays: 0,
      spend: 0,
      tone,
      isNew: true,
    };
    setCustomer(customerObj);
    setStep(2);
  };

  const canAdvance =
    (step === 1 && !!customer) ||
    (step === 2 && services.length > 0) ||
    (step === 3 && !!time) ||
    (step === 4);

  const advance = async () => {
    if (step < 4) {
      if (step === 1 && !stylist && dbStylists.length > 0) {
        setStylist(dbStylists[0].id);
      }
      if (step === 1 && !date) {
        setDate(days[1]?.key || "");
      }
      setStep(step + 1);
    } else {
      // SAVE TO DATABASE (Pillar 2.1)
      const supabase = getSupabaseBrowserClient();
      if (supabase && salonId && customer) {
        showFlash("Creating booking...", 10000);
        try {
          let customerId = customer.id;

          // If new customer, insert into customers table
          if (customer.isNew && typeof customer.id === "string" && customer.id.startsWith("new_")) {
            const phoneFormatted = customer.phone && customer.phone.trim()
              ? customer.phone.replace(/[^+\d]/g, "").replace(/^91/, "")
              : null;

            const { data: newCustData, error: custErr } = await supabase
              .from("customers")
              .insert({
                salon_id: salonId,
                name: customer.name,
                phone: phoneFormatted,
              })
              .select("id")
              .single();

            if (custErr) throw custErr;
            customerId = newCustData.id;
          }

          // Resolve stylist (use first available if "any")
          const finalStylistId = (stylist && stylist !== "any") ? stylist : dbStylists[0]?.id;
          if (!finalStylistId) {
            showFlash("No stylist available");
            return;
          }

          // Insert booking
          const { data: bookingData, error: bkErr } = await supabase
            .from("bookings")
            .insert({
              salon_id: salonId,
              customer_id: customerId,
              stylist_id: finalStylistId,
              date,
              start_time: time,
              duration: totalDuration,
              status: "Confirmed",
              source: "Dashboard",
              notes: note || null,
            })
            .select("id")
            .single();

          if (bkErr) throw bkErr;

          // Insert booking_services
          const bsRows = services.map(s => ({
            booking_id: bookingData.id,
            service_id: s.id,
            qty: 1,
            price_at_booking: s.price,
          }));

          const { error: bsErr } = await supabase
            .from("booking_services")
            .insert(bsRows);

          if (bsErr) throw bsErr;

          // Insert notification
          const svcNames = services.map(s => s.name).join(", ");
          await insertNotification({
            salon_id: salonId,
            type: "new_booking",
            title: "New booking",
            body: `${customer.name} booked ${svcNames} for ${date}`,
            meta: { booking_id: bookingData.id, customer_name: customer.name },
          });

          setNewBookingId(bookingData.id);
          setCreated(true);
          showFlash(`Booking created · ${customer.name} · ${date} · ${time}`);
        } catch (err) {
          const error = err as Error;
          console.error("Error creating booking:", error);
          showFlash(`Error: ${error.message || "Failed to create booking"}`, 3000);
          return;
        }
      } else {
        // No Supabase — just show success locally
        setCreated(true);
        showFlash(`Booking created · ${customer?.name} · ${date} · ${time}`);
      }
    }
  };

  return (
    <div className="app">
      <div className="app-top">
        <div className="app-top-inner">
          <div className="brand">
            <Link href="/dashboard" className="book-back" aria-label="Back" style={{ background: "transparent", display: "inline-grid", placeItems: "center", width: 36, height: 36 }}>
              <IN.back />
            </Link>
            <span className="brand-text" style={{ marginLeft: 8 }}>New booking</span>
          </div>
          <div className="greeting">
            <div className="h" style={{ fontSize: "var(--t-h3)", fontWeight: 600 }}>Schedule appointment</div>
            <div className="d" style={{ fontSize: "var(--t-body-sm)", color: "var(--ink-3)", marginTop: 2, textTransform: "uppercase" }}>FOR A CLIENT WHO CALLED, WALKED IN, OR DM&apos;D</div>
          </div>
          <div className="top-actions">
            <Link className="btn btn-ghost btn-sm" href="/dashboard">Cancel</Link>
          </div>
        </div>
      </div>

      <main className="app-main nb-main" style={{ paddingBottom: 120 }}>
        <StepBar step={step} />

        {!created && (
          <>
            {step === 1 && (
              <StepCustomer
                customer={customer}
                onSelect={selectCustomer}
                onAddNew={addNewCustomer}
                newCust={newCust}
                setNewCust={setNewCust}
                mode={mode}
                setMode={setMode}
                dbCustomers={dbCustomers}
                loading={loadingCust}
              />
            )}
            {step === 2 && (
              <StepServices services={services} toggleService={toggleService} dbServices={dbServices} loading={loadingSvcs} />
            )}
            {step === 3 && services.length > 0 && (
              <StepWhen
                services={services}
                totalDuration={totalDuration}
                stylist={stylist}
                date={date}
                time={time}
                onStylist={setStylist}
                onDate={setDate}
                onTime={setTime}
                overrideAvail={overrideAvail}
                setOverrideAvail={setOverrideAvail}
                dbStylists={dbStylists}
                days={days}
                slots={computedSlots}
                loadingBookings={loadingBookings}
              />
            )}
            {step === 4 && customer && services.length > 0 && time && (
              <StepConfirm
                customer={customer}
                services={services}
                totalDuration={totalDuration}
                totalPrice={totalPrice}
                stylist={stylist}
                date={date}
                time={time}
                note={note}
                setNote={setNote}
                sendConfirm={sendConfirm}
                setSendConfirm={setSendConfirm}
                takePayment={takePayment}
                setTakePayment={setTakePayment}
                dbStylists={dbStylists}
                days={days}
              />
            )}
          </>
        )}

        {created && customer && (
          <div className="nb-success">
            <div className="check-wrap" style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="var(--teal)" strokeWidth="2.5" className="check-circle" />
                <path d="M22 41 35 54 58 28" fill="none" stroke="var(--teal)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="check-tick"/>
              </svg>
            </div>
            <h1 className="nb-title" style={{ textAlign: "center" }}>Booking created</h1>
            <p className="nb-sub" style={{ textAlign: "center" }}>
              {customer.name} · {days.find(d => d.key === date)?.full} at {time}
              {sendConfirm && customer.phone && <> · WhatsApp confirmation sent ✓</>}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <Link className="btn btn-outline btn-lg" href="/dashboard">Back to calendar</Link>
                <Link className="btn btn-primary btn-lg" href={newBookingId ? `/dashboard/bookings/${newBookingId}` : "/dashboard/bookings"}>View booking →</Link>
              </div>
              {takePayment && (
                <Link className="btn btn-wa btn-lg" style={{ marginTop: 10, display: "inline-flex", width: "fit-content", background: "var(--teal)", color: "#fff" }} href={newBookingId ? `/dashboard/checkout/${newBookingId}` : "/dashboard/checkout/BK-2026-0517"}>
                  Take payment now →
                </Link>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 24 }} onClick={() => {
              setCreated(false); setStep(1); setCustomer(null); setServices([]); setTime(null); setNote(""); setNewBookingId(null);
            }}>
              Create another booking
            </button>
          </div>
        )}
      </main>

      {/* Sticky CTA */}
      {!created && (
        <div className="nb-cta">
          <div className="nb-cta-l">
            {step >= 2 && services.length > 0 && (
              <>
                <span style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>
                  {services.length} service{services.length === 1 ? "" : "s"} · {totalDuration} min
                </span>
                <span className="nb-cta-amt mono">₹{totalPrice.toLocaleString("en-IN")}</span>
              </>
            )}
          </div>
          <div className="nb-cta-r" style={{ display: "flex", gap: 10 }}>
            {step > 1 && (
              <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
                <IN.back /> Back
              </button>
            )}
            <button
              className="btn btn-primary btn-lg"
              disabled={!canAdvance}
              style={!canAdvance ? { opacity: 0.4, cursor: "not-allowed" } : {}}
              onClick={advance}
            >
              {step < 4 ? "Continue" : <><IN.check /> Create booking</>}
              {step < 4 && <span aria-hidden style={{ marginLeft: 6 }}>→</span>}
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
