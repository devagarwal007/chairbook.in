"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useProfile } from "@/context/ProfileContext";

export default function BroadcastPage() {
  const { salonId } = useProfile();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [segment, setSegment] = useState("all");
  const [template, setTemplate] = useState("Hi {{name}}, we have an exciting offer for you at {{salon}}. Book your appointment now!");
  const [audienceCount, setAudienceCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!salonId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("salon_id", salonId).then(({ count }) => {
      setAudienceCount(count || 0);
    });
  }, [salonId]);

  const handleLaunch = async () => {
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    if (supabase && salonId) {
      await supabase.from("broadcasts").insert({
        salon_id: salonId,
        template_text: template,
        audience_count: audienceCount,
        status: "Scheduled",
      });
    }
    setSaving(false);
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  return (
    <div className="app animate-fade-in">
      <div className="app-top">
        <div className="app-top-inner">
          <div className="brand" style={{ display: "flex", alignItems: "center" }}>
            <Link className="book-back" href="/dashboard" aria-label="Back" style={{ background: "transparent", display: "inline-grid", placeItems: "center", width: 36, height: 36 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
            </Link>
            <span className="brand-text" style={{ marginLeft: 8 }}>Broadcast</span>
          </div>
        </div>
      </div>

      <main className="app-main" style={{ paddingBottom: 120 }}>
        {done ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Broadcast scheduled!</h2>
            <p style={{ color: "var(--ink-3)", marginTop: 8 }}>Your message will be sent to ~{audienceCount} customers.</p>
          </div>
        ) : (
          <>
            {/* Step indicator */}
            <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: step >= s ? "var(--teal)" : "var(--bg-2)" }} />
              ))}
            </div>

            {step === 1 && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Step 1: Choose your audience</h2>
                <p style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 16 }}>Select which customers you want to reach.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { id: "all", label: "All customers", desc: `Send to every customer (~${audienceCount} people)` },
                    { id: "active", label: "Active customers", desc: "Visited in the last 30 days" },
                    { id: "cooling", label: "Cooling off", desc: "Last visit 30-60 days ago" },
                    { id: "lost", label: "Lost customers", desc: "Haven't visited in 60+ days" },
                  ].map(op => (
                    <button
                      key={op.id}
                      onClick={() => setSegment(op.id)}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: segment === op.id ? "1px solid var(--teal)" : "1px solid var(--line-2)",
                        background: segment === op.id ? "var(--teal-soft)" : "#fff",
                        textAlign: "left", cursor: "pointer", width: "100%",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{op.label}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{op.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Step 2: Write your message</h2>
                <p style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 16 }}>Use {"{{name}}"} and {"{{salon}}"} as placeholders.</p>
                <textarea
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                  rows={5}
                  style={{
                    width: "100%", padding: 14, borderRadius: 10, border: "1px solid var(--line-2)",
                    outline: 0, fontFamily: "inherit", fontSize: 14, resize: "vertical",
                  }}
                />
                <div style={{ marginTop: 12, padding: 14, background: "var(--wa-soft)", borderRadius: 10, fontSize: 13, color: "var(--wa)" }}>
                  <strong>Preview:</strong><br/>
                  {template.replace("{{name}}", "Priya").replace("{{salon}}", "Glow Salon")}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Step 3: Review &amp; launch</h2>
                <div style={{ background: "#fff", border: "1px solid var(--line-2)", borderRadius: 10, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "var(--ink-3)" }}>Audience</span>
                    <strong>~{audienceCount} customers</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "var(--ink-3)" }}>Segment</span>
                    <strong>{segment}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-3)" }}>Message</span>
                    <strong style={{ fontSize: 12, maxWidth: "60%", textAlign: "right" }}>{template.slice(0, 80)}...</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom actions */}
            <div style={{ position: "fixed", bottom: 80, left: 0, right: 0, padding: "12px 16px", background: "#fff", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-ghost" onClick={() => step > 1 ? setStep(step - 1) : router.push("/dashboard")}>
                {step > 1 ? "Back" : "Cancel"}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => step < 3 ? setStep(step + 1) : handleLaunch()}
                disabled={saving}
                style={{ background: "var(--teal)", color: "#fff", border: 0, padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
              >
                {step < 3 ? "Continue →" : saving ? "Sending..." : "Launch broadcast"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
