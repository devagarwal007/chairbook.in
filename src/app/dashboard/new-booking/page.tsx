"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ===== TYPES =====
interface Customer {
  id: number | string;
  name: string;
  phone: string;
  visits: number;
  lastDays: number;
  spend: number;
  tone: string;
  isNew?: boolean;
}

interface Service {
  id: string;
  name: string;
  cat: string;
  duration: number;
  price: number;
}

interface Stylist {
  id: string;
  name: string;
  tone: string;
  short: string;
  skills: string[];
}

// ===== ICONS =====
const IN = {
  back: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  search: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  plus: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  check: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  clock: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 2"/>
    </svg>
  ),
  x: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
};

// ===== MOCK DATA =====
const EXISTING_CUSTOMERS: Customer[] = [
  { id: 1,  name: "Priya Sharma",   phone: "+91 98xxx 12345", visits: 12, lastDays: 6,  spend: 12400, tone: "b" },
  { id: 2,  name: "Meera Iyer",     phone: "+91 98xxx 22119", visits: 5,  lastDays: 42, spend: 6800,  tone: "c" },
  { id: 3,  name: "Kavya Reddy",    phone: "+91 98xxx 30247", visits: 8,  lastDays: 81, spend: 9200,  tone: "e" },
  { id: 4,  name: "Sneha P.",       phone: "+91 98xxx 41902", visits: 3,  lastDays: 2,  spend: 2150,  tone: "d" },
  { id: 5,  name: "Anita Verma",    phone: "+91 98xxx 50819", visits: 22, lastDays: 9,  spend: 28400, tone: "a" },
  { id: 6,  name: "Lakshmi Nair",   phone: "+91 98xxx 60372", visits: 1,  lastDays: 4,  spend: 350,   tone: "f" },
  { id: 9,  name: "Aisha Khan",     phone: "+91 98xxx 81234", visits: 18, lastDays: 21, spend: 21800, tone: "d" },
  { id: 15, name: "Madhuri Desai",  phone: "+91 98xxx 56790", visits: 25, lastDays: 7,  spend: 34200, tone: "b" },
];

const SERVICES: Service[] = [
  { id: "haircut",   name: "Haircut",          cat: "Hair",  duration: 30, price: 300 },
  { id: "color",     name: "Hair Color",       cat: "Hair",  duration: 90, price: 1800 },
  { id: "spa",       name: "Hair Spa",         cat: "Hair",  duration: 60, price: 900 },
  { id: "highlights",name: "Highlights",       cat: "Hair",  duration: 150, price: 3500 },
  { id: "facial",    name: "Facial — Classic", cat: "Skin",  duration: 45, price: 700 },
  { id: "facial_g",  name: "Facial — Gold",    cat: "Skin",  duration: 75, price: 1400 },
  { id: "threading", name: "Threading",        cat: "Skin",  duration: 15, price: 80 },
  { id: "mani",      name: "Manicure",         cat: "Hands", duration: 30, price: 350 },
  { id: "pedi",      name: "Pedicure",         cat: "Hands", duration: 45, price: 500 },
];

const STYLISTS: Stylist[] = [
  { id: "any",     name: "First available", tone: "a", short: "?", skills: [] },
  { id: "anjali",  name: "Anjali",          tone: "b", short: "A", skills: ["hair", "color"] },
  { id: "pooja",   name: "Pooja",           tone: "d", short: "P", skills: ["skin"] },
  { id: "kiran",   name: "Kiran",           tone: "c", short: "K", skills: ["hair"] },
  { id: "rekha",   name: "Rekha",           tone: "e", short: "R", skills: ["nails"] },
];

const DAYS = (() => {
  const today = new Date(2026, 4, 19);
  const arr = [];
  const dayNames = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    arr.push({
      key: d.toISOString().slice(0, 10),
      dow: dayNames[d.getDay()],
      dom: d.getDate(),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : null,
      full: d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
    });
  }
  return arr;
})();

const ALL_SLOTS = ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00"];

const slotsFor = (date: string, stylistId: string) => {
  const seed = date.charCodeAt(8) + date.charCodeAt(9) + (stylistId === "any" ? 0 : stylistId.charCodeAt(0));
  return ALL_SLOTS.map((s, i) => ({ time: s, taken: ((seed * (i+1) * 37) % 7) < 2 }));
};

const initialsOf = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();

const formatLast = (days: number) => {
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
  onAddNew: (n: any) => void;
  newCust: any;
  setNewCust: any;
  mode: string;
  setMode: (m: string) => void;
}

function StepCustomer({ customer, onSelect, onAddNew, newCust, setNewCust, mode, setMode }: StepCustomerProps) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return EXISTING_CUSTOMERS.slice(0, 6);
    const query = q.toLowerCase();
    return EXISTING_CUSTOMERS.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query)
    );
  }, [q]);

  return (
    <div className="nb-step-content">
      <h1 className="nb-title">Who's the booking for?</h1>
      <p className="nb-sub">Search your existing customers, or add someone new in 2 fields.</p>

      <div className="nb-mode-toggle">
        <button className={`nb-mode ${mode === "existing" ? "on" : ""}`} onClick={() => setMode("existing")}>
          <IN.search /> Search existing
          <span className="nb-mode-count">{EXISTING_CUSTOMERS.length}</span>
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
            {filtered.length === 0 && (
              <div className="nb-empty">
                <strong>No customer matches &ldquo;{q}&rdquo;</strong>
                <p>Switch to &ldquo;Add new customer&rdquo; to create them now.</p>
                <button className="btn btn-primary btn-sm" onClick={() => { setNewCust({ ...newCust, name: q }); setMode("new"); }}>
                  <IN.plus /> Add &ldquo;{q}&rdquo; as new customer
                </button>
              </div>
            )}
            {filtered.map(c => (
              <button
                key={c.id}
                className={`nb-cust-row ${customer?.id === c.id ? "on" : ""}`}
                onClick={() => onSelect(c)}
              >
                <div className={`avatar md tone-${c.tone}`}>{initialsOf(c.name)}</div>
                <div className="nb-cust-main">
                  <div className="nb-cust-name">{c.name}</div>
                  <div className="nb-cust-meta">
                    <span>{c.phone}</span>
                    <span className="dot-sep">·</span>
                    <span>{c.visits} visit{c.visits === 1 ? "" : "s"} · Last {formatLast(c.lastDays)}</span>
                  </div>
                </div>
                <div className="nb-cust-spend mono">₹{c.spend.toLocaleString("en-IN")}</div>
                {customer?.id === c.id && <div className="nb-cust-tick"><IN.check /></div>}
              </button>
            ))}
          </div>
        </>
      )}

      {mode === "new" && (
        <div className="nb-new-form">
          <div className="field">
            <label>Full name</label>
            <input
              placeholder="e.g. Priya Sharma"
              value={newCust.name}
              onChange={e => setNewCust({ ...newCust, name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="field-row" style={{ marginTop: 14 }}>
            <div className="field">
              <label>Phone (optional for walk-ins)</label>
              <div className="phone-input">
                <span className="phone-prefix">+91</span>
                <input
                  type="tel"
                  placeholder="98xxx xxxxx"
                  value={newCust.phone}
                  onChange={e => setNewCust({ ...newCust, phone: e.target.value.replace(/[^\d ]/g, "") })}
                  maxLength={11}
                />
              </div>
            </div>
            <div className="field">
              <label>How did they hear about us?</label>
              <select value={newCust.source} onChange={e => setNewCust({ ...newCust, source: e.target.value })} style={{ width: "100%", height: 42, background: "#fff", border: "1px solid var(--line-2)", borderRadius: 10, padding: "0 10px", outline: 0 }}>
                <option value="">— Optional —</option>
                <option>Walk-in</option>
                <option>WhatsApp / link</option>
                <option>Referral</option>
                <option>Instagram</option>
                <option>Google</option>
                <option>Existing customer</option>
              </select>
            </div>
          </div>
          <label className="checkbox-row" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={newCust.noPhone} onChange={e => setNewCust({ ...newCust, noPhone: e.target.checked })} />
            <span>This customer doesn&apos;t want to share a phone number (guest mode — no WhatsApp reminders)</span>
          </label>
          {newCust.name.trim() && (
            <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => onAddNew(newCust)}>
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
}

function StepServices({ services, toggleService }: StepServicesProps) {
  const cats = ["Hair", "Skin", "Hands"];
  return (
    <div className="nb-step-content">
      <h1 className="nb-title">What service{services.length > 1 ? "s" : ""}?</h1>
      <p className="nb-sub">Pick one or more. Total duration and price update at the bottom.</p>
      {cats.map(cat => (
        <div key={cat} className="svc-cat" style={{ marginBottom: 18 }}>
          <div className="svc-cat-name" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>{cat}</div>
          <div className="svc-list" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {SERVICES.filter(s => s.cat === cat).map(s => {
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
  stylist: string;
  date: string;
  time: string | null;
  onStylist: (id: string) => void;
  onDate: (d: string) => void;
  onTime: (t: string) => void;
  overrideAvail: boolean;
  setOverrideAvail: (val: boolean) => void;
}

function StepWhen({ services, totalDuration, stylist, date, time, onStylist, onDate, onTime, overrideAvail, setOverrideAvail }: StepWhenProps) {
  const slots = useMemo(() => slotsFor(date, stylist), [date, stylist]);
  const dateLabel = DAYS.find(d => d.key === date);
  return (
    <div className="nb-step-content">
      <h1 className="nb-title">When &amp; with whom?</h1>
      <p className="nb-sub">
        {services.length} service{services.length === 1 ? "" : "s"} · {totalDuration} min total
      </p>

      <div className="block-label" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-3)", marginBottom: 10 }}>Stylist</div>
      <div className="stylist-row" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 10, marginBottom: 18 }}>
        {STYLISTS.map(s => (
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
            <div className={`avatar lg tone-${s.tone}`} style={{ width: 40, height: 40, borderRadius: "50%", background: stylist === s.id ? "var(--teal-soft)" : "var(--bg-2)", color: stylist === s.id ? "var(--teal)" : "var(--ink-2)", display: "grid", placeItems: "center", fontWeight: "bold", fontSize: 16 }}>{s.short}</div>
            <div className="stylist-name" style={{ fontSize: 13, fontWeight: 500, marginTop: 8, color: "var(--ink)", textAlign: "center", whiteSpace: "nowrap" }}>{s.name}</div>
          </button>
        ))}
      </div>

      <div className="block-label" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-3)", marginBottom: 10 }}>Date</div>
      <div className="date-row" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 18 }}>
        {DAYS.map(d => (
          <button
            key={d.key}
            className={`date-pill ${date === d.key ? "on" : ""}`}
            onClick={() => onDate(d.key)}
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

      <label className="checkbox-row" style={{ marginTop: 16, padding: "12px 14px", background: "var(--amber-soft)", borderRadius: 10, color: "var(--amber-ink)", display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
        <input type="checkbox" checked={overrideAvail} onChange={e => setOverrideAvail(e.target.checked)} />
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
  stylist: string;
  date: string;
  time: string;
  note: string;
  setNote: (n: string) => void;
  sendConfirm: boolean;
  setSendConfirm: (val: boolean) => void;
  takePayment: boolean;
  setTakePayment: (val: boolean) => void;
}

function StepConfirm({ customer, services, totalDuration, totalPrice, stylist, date, time, note, setNote, sendConfirm, setSendConfirm, takePayment, setTakePayment }: StepConfirmProps) {
  const stylistObj = STYLISTS.find(s => s.id === stylist);
  const dateObj = DAYS.find(d => d.key === date);
  const endMin = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]) + totalDuration;
  const endTime = `${String(Math.floor(endMin/60)).padStart(2,"0")}:${String(endMin%60).padStart(2,"0")}`;
  return (
    <div className="nb-step-content">
      <h1 className="nb-title">Confirm booking</h1>
      <p className="nb-sub">Review &amp; create. You can edit anything later from the booking detail.</p>

      <div className="nb-summary">
        <div className="nb-summary-head">
          <div className={`avatar lg tone-${customer.tone}`}>{initialsOf(customer.name)}</div>
          <div style={{ flex: 1 }}>
            <div className="nb-summary-name">{customer.name}</div>
            {customer.phone && <div className="nb-summary-phone">{customer.phone}</div>}
            {customer.isNew && <span className="badge confirmed no-dot" style={{ marginTop: 6 }}>NEW CUSTOMER</span>}
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
        <div className="nb-summary-row"><span>Stylist</span><strong>{stylistObj?.name}</strong></div>
        <div className="nb-summary-row nb-summary-total">
          <span>Total</span>
          <strong className="mono">₹{totalPrice.toLocaleString("en-IN")}</strong>
        </div>
      </div>

      <div className="field" style={{ marginTop: 18 }}>
        <label>Note (internal)</label>
        <textarea
          placeholder="e.g. Customer prefers ammonia-free color. Will come 10 min late."
          value={note}
          onChange={e => setNote(e.target.value)}
          style={{ minHeight: 64, width: "100%", padding: 12, borderRadius: 10, border: "1px solid var(--line-2)", outline: 0, resize: "vertical", fontFamily: "inherit" }}
        />
      </div>

      <div className="nb-toggles">
        <label className="checkbox-row" style={{ display: "flex", gap: 10, alignItems: "center", cursor: customer.phone ? "pointer" : "not-allowed" }}>
          <input type="checkbox" checked={sendConfirm} onChange={e => setSendConfirm(e.target.checked)} disabled={!customer.phone} />
          <span>
            Send a WhatsApp confirmation to {customer.name.split(" ")[0]}
            {!customer.phone && <small style={{ color: "var(--ink-3)" }}> · no phone on file</small>}
          </span>
        </label>
        <label className="checkbox-row" style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", marginTop: 10 }}>
          <input type="checkbox" checked={takePayment} onChange={e => setTakePayment(e.target.checked)} />
          <span>Take payment in advance after creating</span>
        </label>
      </div>
    </div>
  );
}

// ===== MAIN PAGE COMPONENT =====
export default function NewBookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("existing"); // existing | new
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [newCust, setNewCust] = useState({ name: "", phone: "", source: "", noPhone: false });
  const [services, setServices] = useState<Service[]>([]);
  const [stylist, setStylist] = useState("anjali");
  const [date, setDate] = useState(DAYS[1].key); // tomorrow
  const [time, setTime] = useState<string | null>(null);
  const [overrideAvail, setOverrideAvail] = useState(false);
  const [note, setNote] = useState("");
  const [sendConfirm, setSendConfirm] = useState(true);
  const [takePayment, setTakePayment] = useState(false);
  const [created, setCreated] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const totalDuration = services.reduce((s, x) => s + x.duration, 0);
  const totalPrice = services.reduce((s, x) => s + x.price, 0);

  const toggleService = (s: Service) => {
    setServices(prev => prev.some(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]);
  };

  const selectCustomer = (c: Customer) => setCustomer(c);
  const addNewCustomer = (n: any) => {
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
    setStep(2); // Auto-advance to services
  };

  const canAdvance =
    (step === 1 && !!customer) ||
    (step === 2 && services.length > 0) ||
    (step === 3 && !!time) ||
    (step === 4);

  const advance = () => {
    if (step < 4) setStep(step + 1);
    else {
      setCreated(true);
      setFlash(`Booking created · ${customer?.name} · ${date} · ${time}`);
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
              />
            )}
            {step === 2 && (
              <StepServices services={services} toggleService={toggleService} />
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
              {customer.name} · {DAYS.find(d => d.key === date)?.full} at {time}
              {sendConfirm && customer.phone && <> · WhatsApp confirmation sent ✓</>}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <Link className="btn btn-outline btn-lg" href="/dashboard">Back to calendar</Link>
                <Link className="btn btn-primary btn-lg" href="/dashboard/bookings/BK-2026-0517">View booking →</Link>
              </div>
              {takePayment && (
                <Link className="btn btn-wa btn-lg" style={{ marginTop: 10, display: "inline-flex", width: "fit-content", background: "var(--teal)", color: "#fff" }} href="/dashboard/checkout/BK-2026-0517">
                  Take payment now →
                </Link>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 24 }} onClick={() => {
              setCreated(false); setStep(1); setCustomer(null); setServices([]); setTime(null); setNote("");
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

      {flash && (
        <div className="my-flash" style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: 13, zIndex: 60, boxShadow: "0 12px 24px -10px rgba(0,0,0,0.3)" }}>{flash}</div>
      )}
    </div>
  );
}
