"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { makeSalonSlug, saveOnboarding } from "@/lib/onboarding";

import { DayHour, HoursData, OnboardingData } from "@/types";
import { validateGstin, INDIAN_STATE_OPTIONS } from "@/lib/gst";

import { Icons as IO, StepBar, FormField, Avatar, PhoneInput } from "@/components/ui";


import { DAYS, PRESET_SERVICES, STEPS } from "@/constants/onboarding";



// ===== FOOTER =====
interface ObFooterProps {
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
  hint: string | null;
  nextLabel?: string;
}

function ObFooter({ onBack, onNext, canNext, hint, nextLabel = "Continue" }: ObFooterProps) {
  return (
    <div className="ob-footer">
      <button className="btn btn-ghost" onClick={onBack}>
        <IO.back /> Back
      </button>
      <div className="ob-footer-hint">{hint}</div>
      <button
        className="btn btn-primary btn-lg"
        disabled={!canNext}
        style={!canNext ? { opacity: 0.4, cursor: "not-allowed" } : {}}
        onClick={canNext ? onNext : undefined}
      >
        {nextLabel} <span aria-hidden>→</span>
      </button>
    </div>
  );
}

// ===== STEP COMPONENTS =====

// 0. Welcome
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="ob-step ob-welcome">
      <div className="ob-welcome-mark">
        <div className="brand-mark" style={{ width: 56, height: 56, fontSize: 26, borderRadius: 16 }}>C</div>
      </div>
      <h1 className="ob-h1">
        Welcome to ChairBook.<br />
        <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>{"Let's get you set up."}</span>
      </h1>
      <p className="ob-sub">
        {"We'll do this together in "}<strong style={{ color: "var(--ink)" }}>5 quick steps</strong>{" — about 4 minutes. By the end you'll have a booking link you can drop in your WhatsApp status."}
      </p>
      <ul className="ob-checklist">
        <li>
          <span className="ob-check-ic"><IO.check /></span> {"Add your salon's basics"}
        </li>
        <li>
          <span className="ob-check-ic"><IO.check /></span> Set your working hours
        </li>
        <li>
          <span className="ob-check-ic"><IO.check /></span> Add your stylists &amp; services
        </li>
        <li>
          <span className="ob-check-ic"><IO.check /></span> Connect WhatsApp
        </li>
      </ul>
      <button className="btn btn-primary btn-lg" onClick={onNext}>
        {"Let's start"} <span aria-hidden>→</span>
      </button>
      <div className="ob-skip">
        Already have an account?{" "}
        <Link href="/signin" style={{ color: "var(--teal)" }}>
          Sign in
        </Link>
      </div>
    </div>
  );
}

// 1. Salon Basics
interface StepSalonProps {
  data: OnboardingData;
  onChange: (d: OnboardingData) => void;
  onNext: () => void;
  onBack: () => void;
}

function StepSalon({ data, onChange, onNext, onBack }: StepSalonProps) {
  const valid = data.name.trim().length > 1 && data.area.trim().length > 1;
  const SALON_TYPES = ["Unisex salon", "Ladies salon", "Men's salon", "Barbershop", "Beauty parlour", "Spa"];
  return (
    <div className="ob-step">
      <div className="ob-step-head">
        <div className="ob-eyebrow">STEP 1 OF 5</div>
        <h2 className="ob-h2">First, tell us about your salon</h2>
        <p className="ob-sub">This is what your customers will see on the booking page.</p>
      </div>

      <FormField label="Salon name">
        <input
          placeholder="e.g. Glow Salon &amp; Spa"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          autoFocus
        />
      </FormField>
      <FormField label="Area / locality" style={{ marginTop: 14 }}>
        <input
          placeholder="e.g. Andheri West, Mumbai"
          value={data.area}
          onChange={(e) => onChange({ ...data, area: e.target.value })}
        />
      </FormField>
      <FormField label="Salon type" style={{ marginTop: 14 }}>
        <div className="chip-grid">
          {SALON_TYPES.map((type) => (
            <button
              key={type}
              className={`chip ${data.type === type ? "on" : ""}`}
              onClick={() => onChange({ ...data, type })}
            >
              {type}
            </button>
          ))}
        </div>
      </FormField>

      <ObFooter onBack={onBack} onNext={onNext} canNext={valid} hint={!valid ? "Add salon name and area to continue" : null} />
    </div>
  );
}

// 2. Hours
interface StepHoursProps {
  data: OnboardingData;
  onChange: (d: OnboardingData) => void;
  onNext: () => void;
  onBack: () => void;
}

function StepHours({ data, onChange, onNext, onBack }: StepHoursProps) {
  const setDay = (id: string, patch: Partial<DayHour>) => {
    onChange({
      ...data,
      hours: {
        ...data.hours,
        [id]: { ...data.hours[id], ...patch },
      },
    });
  };

  const applyToAll = (id: string) => {
    const src = data.hours[id];
    const next: HoursData = {};
    DAYS.forEach((d) => {
      next[d.id] = { ...src, open: data.hours[d.id].open };
    });
    onChange({ ...data, hours: next });
  };

  const valid = DAYS.some((d) => data.hours[d.id].open);

  return (
    <div className="ob-step">
      <div className="ob-step-head">
        <div className="ob-eyebrow">STEP 2 OF 5</div>
        <h2 className="ob-h2">When are you open?</h2>
        <p className="ob-sub">Customers will only see slots inside your working hours.</p>
      </div>

      <div className="ob-days">
        {DAYS.map((d) => {
          const h = data.hours[d.id];
          return (
            <div key={d.id} className={`ob-day ${h.open ? "on" : "off"}`}>
              <button
                className={`ob-day-toggle ${h.open ? "on" : ""}`}
                onClick={() => setDay(d.id, { open: !h.open })}
                aria-label={`${d.name} ${h.open ? "open" : "closed"}`}
              >
                {h.open && <IO.check />}
              </button>
              <div className="ob-day-name">{d.name}</div>
              {h.open ? (
                <div className="ob-day-times">
                  <input className="ob-time" value={h.from} onChange={(e) => setDay(d.id, { from: e.target.value })} />
                  <span className="ob-time-sep">to</span>
                  <input className="ob-time" value={h.to} onChange={(e) => setDay(d.id, { to: e.target.value })} />
                  <button className="ob-day-copy" onClick={() => applyToAll(d.id)}>
                    Apply to all
                  </button>
                </div>
              ) : (
                <div className="ob-day-times closed">Closed</div>
              )}
            </div>
          );
        })}
      </div>

      <ObFooter onBack={onBack} onNext={onNext} canNext={valid} hint={!valid ? "You need to be open at least one day" : null} />
    </div>
  );
}

// 3. Team
interface StepTeamProps {
  data: OnboardingData;
  onChange: (d: OnboardingData) => void;
  onNext: () => void;
  onBack: () => void;
}

function StepTeam({ data, onChange, onNext, onBack }: StepTeamProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Stylist");
  const tones = ["b", "d", "c", "e", "a", "f"];

  const addStylist = () => {
    if (!name.trim()) return;
    const tone = tones[data.stylists.length % tones.length];
    onChange({
      ...data,
      stylists: [...data.stylists, { id: Date.now(), name: name.trim(), role, tone }],
    });
    setName("");
    setRole("Stylist");
  };

  const removeStylist = (id: string | number) => {
    onChange({ ...data, stylists: data.stylists.filter((s) => s.id !== id) });
  };

  const valid = data.stylists.length >= 1;

  return (
    <div className="ob-step">
      <div className="ob-step-head">
        <div className="ob-eyebrow">STEP 3 OF 5</div>
        <h2 className="ob-h2">Add your team</h2>
        <p className="ob-sub">{"You can add more later. Even if it's just you, add yourself."}</p>
      </div>

      {data.stylists.length > 0 && (
        <div className="ob-team-list">
          {data.stylists.map((s) => (
            <div key={s.id} className="ob-team-row">
              <Avatar initials={s.name[0]} tone={s.tone} size="md" />
              <div className="ob-team-main">
                <div className="ob-team-name">{s.name}</div>
                <div className="ob-team-role">{s.role}</div>
              </div>
              <button className="ob-team-remove" onClick={() => removeStylist(s.id)} aria-label="Remove">
                <IO.x />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="ob-add-row">
        <FormField label="Name" style={{ flex: 1 }}>
          <input
            placeholder="e.g. Anjali"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addStylist()}
          />
        </FormField>
        <FormField label="Role" style={{ width: 160 }}>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ height: 42, background: "#fff", border: "1px solid var(--line-2)", borderRadius: 10, padding: "0 10px", width: "100%", outline: 0 }}>
            <option>Stylist</option>
            <option>Senior stylist</option>
            <option>Color specialist</option>
            <option>Beautician</option>
            <option>Owner / Manager</option>
          </select>
        </FormField>
        <button className="btn btn-outline" style={{ height: 42 }} onClick={addStylist} disabled={!name.trim()}>
          <IO.plus /> Add
        </button>
      </div>

      <ObFooter onBack={onBack} onNext={onNext} canNext={valid} hint={!valid ? "Add at least one team member" : null} />
    </div>
  );
}

// 4. Services
interface StepServicesProps {
  data: OnboardingData;
  onChange: (d: OnboardingData) => void;
  onNext: () => void;
  onBack: () => void;
}

function StepServices({ data, onChange, onNext, onBack }: StepServicesProps) {
  const togglePreset = (id: string | number) => {
    const exists = data.services.find((s) => s.id === id);
    if (exists) {
      onChange({ ...data, services: data.services.filter((s) => s.id !== id) });
    } else {
      const preset = PRESET_SERVICES.find((s) => s.id === id);
      if (preset) {
        onChange({ ...data, services: [...data.services, preset] });
      }
    }
  };

  const [custom, setCustom] = useState({ name: "", duration: "", price: "" });

  const addCustom = () => {
    if (!custom.name.trim() || !custom.duration || !custom.price) return;
    onChange({
      ...data,
      services: [
        ...data.services,
        {
          id: `c_${Date.now()}`,
          name: custom.name.trim(),
          duration: parseInt(custom.duration, 10),
          price: parseInt(custom.price, 10),
        },
      ],
    });
    setCustom({ name: "", duration: "", price: "" });
  };

  const valid = data.services.length >= 1;
  const customServices = data.services.filter((s) => !s.preset);

  return (
    <div className="ob-step">
      <div className="ob-step-head">
        <div className="ob-eyebrow">STEP 4 OF 5</div>
        <h2 className="ob-h2">What do you offer?</h2>
        <p className="ob-sub">Tap to add — adjust prices anytime later. Most salons start with 6–10 services.</p>
      </div>

      <div className="ob-section-lbl">Quick picks</div>
      <div className="ob-svc-grid">
        {PRESET_SERVICES.map((s) => {
          const on = !!data.services.find((x) => x.id === s.id);
          return (
            <button key={s.id} className={`ob-svc ${on ? "on" : ""}`} onClick={() => togglePreset(s.id)}>
              <div className="ob-svc-l">
                <div className="ob-svc-name">{s.name}</div>
                <div className="ob-svc-meta">
                  {s.duration} min · ₹{s.price}
                </div>
              </div>
              <div className={`svc-check ${on ? "on" : ""}`} style={{ width: 18, height: 18, border: "1.5px solid var(--line-2)", borderRadius: "50%", display: "grid", placeItems: "center" }}>
                {on && <IO.check />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="ob-section-lbl" style={{ marginTop: 18 }}>
        Add a custom service
        {customServices.length > 0 && (
          <span style={{ color: "var(--ink-3)", fontWeight: 400, fontSize: 11, marginLeft: 8 }}>
            + {customServices.length} added
          </span>
        )}
      </div>

      {customServices.map((s) => (
        <div key={s.id} className="ob-team-row" style={{ marginBottom: 6 }}>
          <Avatar initials={s.name[0]} tone="e" style={{ width: 32, height: 32, fontSize: 11 }} />
          <div className="ob-team-main">
            <div className="ob-team-name">{s.name}</div>
            <div className="ob-team-role">
              {s.duration} min · ₹{s.price.toLocaleString("en-IN")}
            </div>
          </div>
          <button className="ob-team-remove" onClick={() => onChange({ ...data, services: data.services.filter((x) => x.id !== s.id) })}>
            <IO.x />
          </button>
        </div>
      ))}

      <div className="ob-custom-row">
        <input
          placeholder="Service name"
          value={custom.name}
          onChange={(e) => setCustom({ ...custom, name: e.target.value })}
          style={{ flex: 1.5 }}
        />
        <input
          placeholder="Duration (min)"
          type="number"
          value={custom.duration}
          onChange={(e) => setCustom({ ...custom, duration: e.target.value })}
          style={{ width: 130 }}
        />
        <input
          placeholder="Price ₹"
          type="number"
          value={custom.price}
          onChange={(e) => setCustom({ ...custom, price: e.target.value })}
          style={{ width: 110 }}
        />
        <button className="btn btn-outline" style={{ height: 42 }} onClick={addCustom} disabled={!custom.name.trim() || !custom.duration || !custom.price}>
          <IO.plus /> Add
        </button>
      </div>

      <ObFooter
        onBack={onBack}
        onNext={onNext}
        canNext={valid}
        hint={!valid ? "Add at least one service" : `${data.services.length} service${data.services.length === 1 ? "" : "s"} selected`}
      />
    </div>
  );
}

// 5. WhatsApp
interface StepWhatsAppProps {
  data: OnboardingData;
  onChange: (d: OnboardingData) => void;
  onNext: () => void;
  onBack: () => void;
  isSaving: boolean;
  error: string | null;
}

function StepWhatsApp({ data, onChange, onNext, onBack, isSaving, error }: StepWhatsAppProps) {
  const valid = data.waNumber.length === 10;
  return (
    <div className="ob-step">
      <div className="ob-step-head">
        <div className="ob-eyebrow">STEP 5 OF 5</div>
        <h2 className="ob-h2">Connect your WhatsApp business number</h2>
        <p className="ob-sub">Customers will receive booking confirmations, reminders, and replies from this number.</p>
      </div>

      <FormField label="WhatsApp number">
        <PhoneInput
          size="lg"
          value={data.waNumber}
          onChange={(val) => onChange({ ...data, waNumber: val })}
          autoFocus
        />
      </FormField>

      <div className="ob-wa-preview">
        <div className="ob-wa-lbl">Sample reminder customers will receive:</div>
        <div className="wa-thread" style={{ background: "#1A2320", padding: 16, borderRadius: 12 }}>
          <div
            className="b out"
            style={{
              background: "#0E5C2C",
              color: "#DBFAE5",
              alignSelf: "flex-end",
              marginLeft: "auto",
              maxWidth: "86%",
              padding: "10px 12px",
              fontSize: 13,
              lineHeight: 1.4,
              borderRadius: 12,
              borderBottomRightRadius: 4,
              display: "block",
            }}
          >
            Hi Priya 🙏 This is a reminder from <strong>{data.name || "your salon"}</strong>: Haircut with Anjali tomorrow at 4 PM.
            <br />
            Reply <strong>YES</strong> to confirm or <strong>RESCHEDULE</strong> to pick a new slot.
          </div>
        </div>
      </div>

      <div className="trust" style={{ marginTop: 16, display: "flex", gap: 10, fontSize: 12, color: "var(--ink-3)", lineHeight: 1.4 }}>
        <IO.wa style={{ color: "var(--wa)", width: 18, height: 18, flexShrink: 0 }} />
        <div>Automated messages will be sent using the connected business API. Standard WhatsApp business policies apply.</div>
      </div>

      {error && (
        <div className="form-alert" role="alert" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      <ObFooter
        onBack={onBack}
        onNext={onNext}
        canNext={valid && !isSaving}
        hint={!valid ? "Enter a 10-digit number" : isSaving ? "Saving your setup..." : null}
        nextLabel={isSaving ? "Saving..." : "Finish setup"}
      />
    </div>
  );
}

// 5b. GST (skippable)
interface StepGstProps {
  data: OnboardingData;
  onChange: (d: OnboardingData) => void;
  onNext: () => void;
  onBack: () => void;
}

function StepGst({ data, onChange, onNext, onBack }: StepGstProps) {
  const gstEnabled = data.gst_enabled ?? false;
  const gstin = data.gstin || "";
  const legalName = data.legal_name || "";
  const gstinResult = gstin ? validateGstin(gstin) : null;
  const gstinValid = gstin ? (gstinResult?.valid ?? false) : true;

  const canContinue = !gstEnabled || (gstinValid && gstin.length === 15 && legalName.trim().length > 0);

  return (
    <div className="ob-step">
      <h2 className="ob-h2">GST invoicing</h2>
      <p className="ob-sub" style={{ marginBottom: 20, maxWidth: 520 }}>
        Generate GST-compliant tax invoices for every customer payment. You can always set this up later from Settings.
      </p>

      {/* Enable/Skip Toggle */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <button
          className={`flex-1 p-4 rounded-lg border text-sm font-medium text-left transition ${!gstEnabled ? "border-teal bg-teal-soft text-teal-ink" : "border-line bg-white text-ink-2 hover:border-ink-3"}`}
          onClick={() => onChange({ ...data, gst_enabled: false })}
        >
          <div className="font-semibold">Skip for now</div>
          <div className="text-xs mt-0.5 opacity-70">I&apos;ll set up GST later</div>
        </button>
        <button
          className={`flex-1 p-4 rounded-lg border text-sm font-medium text-left transition ${gstEnabled ? "border-teal bg-teal-soft text-teal-ink" : "border-line bg-white text-ink-2 hover:border-ink-3"}`}
          onClick={() => onChange({ ...data, gst_enabled: true })}
        >
          <div className="font-semibold">Set up GST</div>
          <div className="text-xs mt-0.5 opacity-70">Enter GSTIN to enable invoicing</div>
        </button>
      </div>

      {gstEnabled && (
        <div className="bg-white border border-line rounded-xl p-[20px_22px]" style={{ marginBottom: 20 }}>
          <FormField label="GSTIN">
            <input
              value={gstin}
              onChange={e => {
                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
                const patch: Partial<OnboardingData> = { gstin: val };
                if (val.length === 15) {
                  const result = validateGstin(val);
                  if (result.valid && result.stateCode && result.stateName) {
                    patch.gst_state = result.stateName;
                    patch.gst_state_code = result.stateCode;
                  }
                }
                onChange({ ...data, ...patch });
              }}
              placeholder="e.g. 27AABCU9603R1ZM"
              maxLength={15}
              style={{ padding: "10px 12px", border: `1px solid ${gstin && !gstinValid ? "var(--red)" : "var(--line-2)"}`, borderRadius: 8, outline: 0, fontSize: 14, fontFamily: "monospace", letterSpacing: "0.05em" }}
            />
            {gstin && !gstinValid && <div className="text-xs text-red-500 mt-1">Invalid GSTIN format</div>}
            {gstinResult?.valid && <div className="text-xs text-teal-ink mt-1">{"\u2713"} {gstinResult.stateName} ({gstinResult.stateCode})</div>}
          </FormField>

          <FormField label="Legal business name" style={{ marginTop: 14 }}>
            <input
              value={legalName}
              onChange={e => onChange({ ...data, legal_name: e.target.value })}
              placeholder="As on GST certificate"
              style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
            />
          </FormField>

          <div className="text-xs font-semibold text-ink-2 mt-4 mb-2">Pricing mode</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["tax_inclusive", "tax_exclusive"] as const).map(mode => (
              <button
                key={mode}
                className={`flex-1 p-3 rounded-lg border text-sm font-medium text-left transition ${(data.gst_pricing_mode || "tax_exclusive") === mode ? "border-teal bg-teal-soft text-teal-ink" : "border-line bg-white text-ink-2 hover:border-ink-3"}`}
                onClick={() => onChange({ ...data, gst_pricing_mode: mode })}
              >
                <div className="font-semibold text-xs">{mode === "tax_inclusive" ? "Tax inclusive" : "Tax exclusive"}</div>
                <div className="text-xs mt-0.5 opacity-70">{mode === "tax_inclusive" ? "Prices include GST" : "GST added on top"}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <ObFooter onBack={onBack} onNext={onNext} canNext={canContinue} hint={!gstEnabled ? "You can set up GST anytime from Settings" : null} />
    </div>
  );
}

// 6. Done
interface StepDoneProps {
  data: OnboardingData;
  savedSlug: string | null;
  onCopy: () => void;
  copied: boolean;
}

function StepDone({ data, savedSlug, onCopy, copied }: StepDoneProps) {
  const slug = savedSlug || makeSalonSlug(data.name || "your-salon");
  const link = `chairbook.in/${slug}`;

  return (
    <div className="ob-step ob-done">
      <div className="ob-done-check">
        <svg width="72" height="72" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="var(--teal)" strokeWidth="2.5" />
          <path d="M22 41 35 54 58 28" fill="none" stroke="var(--teal)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="ob-h1" style={{ textAlign: "center", fontSize: 32 }}>
        {"You're all set 🎉"}
      </h1>
      <p className="ob-sub" style={{ textAlign: "center", maxWidth: 480, margin: "0 auto 28px" }}>
        <strong style={{ color: "var(--ink)" }}>{data.name}</strong> is live. Share your booking link below — drop it in your WhatsApp status or pin it to your Instagram bio.
      </p>

      <div className="ob-link-card">
        <div className="ob-link-l">
          <div className="ob-eyebrow" style={{ marginBottom: 4 }}>
            YOUR BOOKING LINK
          </div>
          <div className="ob-link-url">{link}</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={onCopy} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {copied ? (
            <>
              <IO.check /> Copied
            </>
          ) : (
            <>
              <IO.copy /> Copy
            </>
          )}
        </button>
      </div>

      <div className="ob-share-row">
        <button className="btn btn-wa" style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#0E5C2C", color: "#fff", border: 0 }}>
          <IO.wa /> Share via WhatsApp
        </button>
        <button className="btn btn-outline" style={{ flex: 1 }}>
          Add to Instagram bio
        </button>
      </div>

      <div className="ob-summary">
        <div className="ob-summary-lbl">Your salon at a glance</div>
        <div className="ob-summary-grid">
          <div>
            <div className="num">{data.stylists.length}</div>
            <div className="lbl">team member{data.stylists.length === 1 ? "" : "s"}</div>
          </div>
          <div>
            <div className="num">{data.services.length}</div>
            <div className="lbl">services</div>
          </div>
          <div>
            <div className="num">{Object.values(data.hours).filter((h) => h.open).length}</div>
            <div className="lbl">days open</div>
          </div>
        </div>
      </div>

      <Link className="btn btn-primary btn-lg" href="/dashboard" style={{ width: "100%", marginTop: 20, textAlign: "center" }}>
        Open your dashboard <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

// ===== APP PAGE =====
import { defaultHours } from "@/constants/onboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    area: "",
    type: "Unisex salon",
    hours: defaultHours,
    stylists: [],
    services: [PRESET_SERVICES[0], PRESET_SERVICES[2]], // pre-select haircut and spa
    waNumber: "",
  });
  const [copied, setCopied] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const step = STEPS[stepIdx];
  const next = () => setStepIdx(Math.min(stepIdx + 1, STEPS.length - 1));
  const back = () => setStepIdx(Math.max(stepIdx - 1, 0));

  const finishSetup = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const onboardingInput = {
        ...data,
        stylists: data.stylists.map(s => ({
          name: s.name,
          role: s.role || "Stylist",
          tone: s.tone || "b",
        })),
        services: data.services.map(s => ({
          name: s.name,
          duration: s.duration,
          price: s.price,
        })),
      };
      const saved = await saveOnboarding(onboardingInput);
      setSavedSlug(saved.slug);
      setStepIdx(STEPS.length - 1);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save onboarding. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    const slug = savedSlug || makeSalonSlug(data.name || "your-salon");
    navigator.clipboard.writeText(`chairbook.in/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="ob-app">
      <header className="ob-topbar">
        <div className="ob-topbar-inner">
          <div className="brand" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="brand-mark">C</div>
            <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>ChairBook</span>
          </div>
          {step.id !== "done" && step.id !== "welcome" && <div className="ob-step-count">Step {stepIdx} of 6</div>}
          {step.id !== "done" && (
            <button className="ob-exit" onClick={() => router.push("/")}>
              Save &amp; exit
            </button>
          )}
        </div>
        {step.id !== "welcome" && step.id !== "done" && (
          <StepBar variant="onboarding" steps={STEPS.slice(1, -1)} currentStep={stepIdx} />
        )}
      </header>

      <main className="ob-main">
        {step.id === "welcome" && <StepWelcome onNext={next} />}
        {step.id === "salon" && <StepSalon data={data} onChange={setData} onNext={next} onBack={back} />}
        {step.id === "hours" && <StepHours data={data} onChange={setData} onNext={next} onBack={back} />}
        {step.id === "team" && <StepTeam data={data} onChange={setData} onNext={next} onBack={back} />}
        {step.id === "services" && <StepServices data={data} onChange={setData} onNext={next} onBack={back} />}
        {step.id === "gst" && <StepGst data={data} onChange={setData} onNext={next} onBack={back} />}
        {step.id === "whatsapp" && (
          <StepWhatsApp
            data={data}
            onChange={setData}
            onNext={finishSetup}
            onBack={back}
            isSaving={isSaving}
            error={saveError}
          />
        )}
        {step.id === "done" && <StepDone data={data} savedSlug={savedSlug} onCopy={handleCopy} copied={copied} />}
      </main>
    </div>
  );
}
