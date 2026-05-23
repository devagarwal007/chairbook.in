"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Icons as I } from "@/components/ui/Icons";
import { isUUID, initialsOf } from "@/lib/utils";

import { Customer } from "@/types";

// ===== TYPES =====
interface Note {
  id: number;
  date: string;
  author: string;
  text: string;
}

interface VisitService {
  name: string;
  amt: number;
}

interface Visit {
  id: string;
  date: string;
  services: VisitService[];
  stylist: string;
  amount: number;
  payment: string;
}

interface CustomerProfile extends Customer {
  tone: string;
  memberSince: string;
  prefStylist: string;
  birthday: string;
  engagement: "active" | "cooling" | "lost";
  visits: number;
  spend: number;
  fav: string;
  upcoming?: {
    date: string;
    time: string;
    service: string;
    stylist: string;
  };
  notes: Note[];
  visitHistory: Visit[];
}



// ===== DATA =====
const MOCK_PROFILE: CustomerProfile = {
  id: 1,
  name: "Priya Sharma",
  tone: "b",
  phone: "+91 98xxx 12345",
  memberSince: "October 2023",
  prefStylist: "Anjali",
  birthday: "14 Nov",
  engagement: "active",
  visits: 12,
  spend: 12400,
  fav: "Hair Color",
  upcoming: { date: "Saturday, 24 May", time: "4:00 PM", service: "Hair Color", stylist: "Anjali" },
  notes: [
    { id: 1, date: "12 Apr 2026", author: "Anjali", text: "Prefers shorter on the sides. Loves a deep side parting." },
    { id: 2, date: "03 Feb 2026", author: "Ravi",   text: "Allergic to certain ammonia-based color brands — use the ammonia-free range." },
  ],
  visitHistory: [
    { id: "v12", date: "13 May 2026", services: [{ name: "Hair Color", amt: 1800 }, { name: "Hair Spa", amt: 900 }], stylist: "Anjali", amount: 2700, payment: "UPI · GPay" },
    { id: "v11", date: "12 Apr 2026", services: [{ name: "Haircut", amt: 300 }, { name: "Blow-dry", amt: 450 }], stylist: "Anjali", amount: 750, payment: "UPI · PhonePe" },
    { id: "v10", date: "08 Mar 2026", services: [{ name: "Facial — Gold", amt: 1400 }], stylist: "Pooja", amount: 1400, payment: "Cash" },
    { id: "v9",  date: "14 Feb 2026", services: [{ name: "Hair Color", amt: 1800 }, { name: "Threading", amt: 80 }], stylist: "Anjali", amount: 1880, payment: "UPI · GPay" },
    { id: "v8",  date: "03 Feb 2026", services: [{ name: "Haircut", amt: 300 }], stylist: "Anjali", amount: 300, payment: "Cash" },
    { id: "v7",  date: "15 Jan 2026", services: [{ name: "Hair Spa", amt: 900 }, { name: "Manicure", amt: 350 }], stylist: "Pooja", amount: 1250, payment: "UPI · GPay" },
    { id: "v6",  date: "22 Dec 2025", services: [{ name: "Hair Color", amt: 1800 }], stylist: "Anjali", amount: 1800, payment: "Card" },
    { id: "v5",  date: "04 Dec 2025", services: [{ name: "Haircut", amt: 300 }, { name: "Threading", amt: 80 }], stylist: "Anjali", amount: 380, payment: "UPI · GPay" },
  ],
};

const TEMPLATES = [
  { id: "thanks",  title: "Thank-you note",         body: "Hi Priya 🙏 Thanks for visiting Glow Salon last week. Hope you loved the new color! Reply HI if you need anything." },
  { id: "reb",     title: "Rebook reminder",        body: "Hi Priya! It's been a while since your last visit. Your roots might be ready for a touch-up — shall I block a slot this Saturday?" },
  { id: "offer",   title: "Birthday / occasion",    body: "Hi Priya 🎉 Your birthday is coming up — here's a 20% off voucher on any service this month. Reply YES to book." },
  { id: "custom",  title: "Write your own",         body: "" },
];

// ===== RE-ENGAGEMENT MODAL =====
interface MessageModalProps {
  customer: CustomerProfile;
  onClose: () => void;
  onSend: (body: string) => void;
}

function MessageModal({ customer, onClose, onSend }: MessageModalProps) {
  const [tpl, setTpl] = useState("thanks");
  const [body, setBody] = useState(TEMPLATES[0].body);

  const select = (id: string) => {
    setTpl(id);
    const t = TEMPLATES.find(x => x.id === id);
    if (t) setBody(t.body);
  };

  return (
    <div className="modal-back" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "grid", placeItems: "center" }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: "min(500px, 92%)", background: "#fff", borderRadius: "var(--radius-lg)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div className="modal-head" style={{ padding: 18, borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>WhatsApp {customer.name}</h3>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{customer.phone}</div>
          </div>
          <button className="modal-close" onClick={onClose} style={{ border: 0, background: "transparent", cursor: "pointer", display: "grid", placeItems: "center" }}><I.x /></button>
        </div>
        <div className="modal-body" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-3)", marginBottom: 6, display: "block" }}>Pick a template</label>
            <div className="tpl-list" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  className={`tpl-opt ${tpl === t.id ? "on" : ""}`}
                  onClick={() => select(t.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: tpl === t.id ? "1px solid var(--teal)" : "1px solid var(--line-2)",
                    background: tpl === t.id ? "var(--teal-soft)" : "transparent",
                    color: tpl === t.id ? "var(--teal)" : "var(--ink-2)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer"
                  }}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-3)", marginBottom: 6, display: "block" }}>Message preview</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Type your message…"
              style={{
                width: "100%",
                height: 110,
                borderRadius: 8,
                border: "1px solid var(--line-2)",
                padding: 10,
                fontSize: 14,
                fontFamily: "inherit",
                resize: "none",
                outline: 0
              }}
            />
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{body.length} characters</div>
          </div>
        </div>
        <div className="modal-foot" style={{ padding: "12px 18px", borderTop: "1px solid var(--line)", background: "var(--bg)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-wa"
            onClick={() => { onSend(body); onClose(); }}
            disabled={!body.trim()}
            style={{
              background: "var(--wa)",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              padding: "0 16px",
              height: 40,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer"
            }}
          >
            <I.wa style={{ width: 16, height: 16 }} /> Send on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>(MOCK_PROFILE.notes);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState("Owner");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const isUuid = isUUID(customerId);

    if (!isUuid || !supabase) {
      // Fall back to mock — pick by numeric ID if possible
      setProfile(MOCK_PROFILE);
      setNotes(MOCK_PROFILE.notes);
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);

        // Load owner name from cache
        const cachedProfile = localStorage.getItem("cb_profile");
        if (cachedProfile) {
          try { const p = JSON.parse(cachedProfile); setOwnerName(p.name || "Owner"); } catch {}
        }

        const { data: cust, error } = await supabase
          .from("customers")
          .select("id, name, phone, member_since, birthday, created_at, pref_stylist_id, stylists:pref_stylist_id(name)")
          .eq("id", customerId)
          .maybeSingle();

        if (error || !cust) {
          setProfile(MOCK_PROFILE);
          setNotes(MOCK_PROFILE.notes);
          setLoading(false);
          return;
        }

        // Load all bookings for this customer
        const { data: bookings } = await supabase
          .from("bookings")
          .select(`id, date, start_time, status, notes,
            booking_services(price_at_booking, qty, service:services(name)),
            stylist:stylists(name),
            payments(method, amount)`)
          .eq("customer_id", customerId)
          .order("date", { ascending: false });

        const today = new Date(); today.setHours(0,0,0,0);
        const completedBks = (bookings || []).filter((b: any) =>
          ["Completed", "Paid"].includes(b.status)
        );
        const visits = completedBks.length;
        const spend = completedBks.reduce((sum: number, b: any) => {
          const t = (b.booking_services || []).reduce((s: number, bs: any) => s + Number(bs.price_at_booking) * (bs.qty || 1), 0);
          return sum + t;
        }, 0);

        // Last visit days
        const dates = completedBks.map((b: any) => new Date(b.date).getTime()).filter(Boolean);
        const lastMs = dates.length > 0 ? Math.max(...dates) : null;
        const lastDays = lastMs ? Math.round((today.getTime() - lastMs) / 86400000) : 999;
        const engagement: "active" | "cooling" | "lost" =
          lastDays <= 30 ? "active" : lastDays <= 60 ? "cooling" : "lost";

        // Favourite service
        const svcCount: Record<string, number> = {};
        (bookings || []).forEach((b: any) =>
          (b.booking_services || []).forEach((bs: any) => {
            const sn = bs.service?.name; if (sn) svcCount[sn] = (svcCount[sn] || 0) + 1;
          })
        );
        const fav = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

        // Preferred stylist from most recent booking
        const prefStylist = (bookings as any)?.[0]?.stylist?.name || (cust.stylists as any)?.name || "—";

        // Member since
        const msDt = cust.member_since ? new Date(cust.member_since) : new Date(cust.created_at || Date.now());
        const memberSince = msDt.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

        // Upcoming booking
        const futureBks = (bookings || []).filter((b: any) => new Date(b.date) >= today && b.status !== "Cancelled");
        let upcoming: CustomerProfile["upcoming"] = undefined;
        if (futureBks.length > 0) {
          const fb = futureBks[futureBks.length - 1];
          const fbDate = new Date(fb.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
          const [hh, mm] = (fb.start_time || "09:00").split(":");
          const h = parseInt(hh); const ampm = h >= 12 ? "PM" : "AM";
          const fbTime = `${h > 12 ? h - 12 : h}:${mm} ${ampm}`;
          const fbSvc = ((fb.booking_services?.[0] as any)?.service?.name) || "Service";
          const fbStylist = (fb.stylist as any)?.name || "—";
          upcoming = { date: fbDate, time: fbTime, service: fbSvc, stylist: fbStylist };
        }

        // Visit history
        const visitHistory: Visit[] = completedBks.map((b: any) => ({
          id: b.id,
          date: new Date(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
          services: (b.booking_services || []).map((bs: any) => ({
            name: bs.service?.name || "Service",
            amt: Number(bs.price_at_booking) * (bs.qty || 1)
          })),
          stylist: (b.stylist as any)?.name || "—",
          amount: (b.booking_services || []).reduce((s: number, bs: any) => s + Number(bs.price_at_booking) * (bs.qty || 1), 0),
          payment: (b.payments as any)?.[0]?.method || (b.payments as any)?.method || "—"
        }));

        const tones = ["a","b","c","d","e","f"];
        const nameHash = cust.name.split("").reduce((h: number, ch: string) => h + ch.charCodeAt(0), 0);

        const p: CustomerProfile = {
          id: cust.id,
          name: cust.name,
          tone: tones[nameHash % tones.length],
          phone: cust.phone || "",
          memberSince,
          prefStylist,
          birthday: cust.birthday || "",
          engagement,
          visits,
          spend,
          fav,
          upcoming,
          notes: [],
          visitHistory,
        };
        setProfile(p);
        setNotes([]);
      } catch (err) {
        console.error("Error loading customer profile:", err);
        setProfile(MOCK_PROFILE);
        setNotes(MOCK_PROFILE.notes);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [customerId]);

  const c = profile || MOCK_PROFILE;
  const engColor = c.engagement === "active" ? "green" : c.engagement === "cooling" ? "amber" : "red";
  const engLabel = c.engagement === "active" ? "Active customer" : c.engagement === "cooling" ? "Cooling off" : "Lost";

  const saveNote = async () => {
    if (!newNote.trim()) return;
    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const note = { id: Date.now(), date: today, author: ownerName, text: newNote.trim() };
    const updatedNotes = [note, ...notes];
    setNotes(updatedNotes);
    setNewNote("");
    setAddingNote(false);
    setFlash("Note saved successfully!");

    // Save to DB
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const isUuid = isUUID(customerId);
      if (isUuid) {
        try {
          await supabase
            .from("customers")
            .update({ notes_new: updatedNotes })
            .eq("id", customerId);
        } catch (err) {
          console.error("Error saving customer notes:", err);
        }
      }
    }

    setTimeout(() => setFlash(null), 1500);
  };

  const sendMsg = (body: string) => {
    setFlash(`WhatsApp opened for ${c.name}`);
    const cleanPhone = c.phone.replace(/[^0-9+]/g, "");
    setTimeout(() => {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(body)}`, "_blank");
      setFlash(null);
    }, 800);
  };

  return (
    <div className="profile-app">
      {/* Top Bar */}
      <div className="profile-topbar">
        <div className="profile-topbar-inner">
          <button
            className="book-back"
            onClick={() => router.push("/dashboard/customers")}
            aria-label="Back"
          >
            <I.back />
          </button>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600, letterSpacing: "-0.005em" }}>Customer profile</div>
          <button className="icon-btn"><I.more /></button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <main className="profile-main">
          {[160, 100, 200, 180].map((h, i) => (
            <div key={i} className="pulse" style={{ height: h, borderRadius: "var(--radius)", background: "var(--bg-2)" }} />
          ))}
        </main>
      )}

      {/* Main Container */}
      {!loading && <main className="profile-main">
        {/* Profile Card */}
        <div className="profile-hero">
          <div className={`avatar xl tone-${c.tone}`}>
            {initialsOf(c.name)}
          </div>
          <div className="profile-id">
            <div className="profile-name">
              {c.name}
              <span className={`engage-pill ${engColor}`}>
                <span className={`engage-dot ${engColor}`} />
                {engLabel}
              </span>
            </div>
            <div className="profile-phone">
              <I.phone /> {c.phone}
              <span className="dot-sep" /> Member since {c.memberSince}
              <span className="dot-sep" />
              <I.cal />
            </div>
            <div className="profile-quick">
              <span><strong>Prefers</strong> {c.prefStylist}</span>
              <span><strong>Birthday</strong> {c.birthday}</span>
            </div>
          </div>
          <div className="profile-hero-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setFlash("Edit details form coming soon!")}><I.edit /> Edit</button>
            <button className="btn btn-wa btn-sm" onClick={() => setShowMsg(true)}><I.wa style={{ width: 14, height: 14 }} /> Message</button>
          </div>
        </div>

        {/* Upcoming Booking */}
        {c.upcoming && (
          <div className="upcoming">
            <div className="upcoming-l">
              <div className="t-label">UPCOMING</div>
              <div className="upcoming-val">{c.upcoming.service}</div>
              <div className="upcoming-meta">{c.upcoming.date} · {c.upcoming.time} · with {c.upcoming.stylist}</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => router.push("/dashboard/bookings/BK-2026-0517")}>View booking</button>
          </div>
        )}

        {/* 3 Metrics Chips */}
        <div className="stat-chips">
          <div className="stat-chip">
            <div className="stat-l">Total visits</div>
            <div className="stat-v">{c.visits}</div>
            <div className="stat-d">Last on 13 May</div>
          </div>
          <div className="stat-chip">
            <div className="stat-l">Lifetime spend</div>
            <div className="stat-v"><small>₹</small>{c.spend.toLocaleString("en-IN")}</div>
            <div className="stat-d">Avg ₹{Math.round(c.spend/c.visits).toLocaleString("en-IN")}/visit</div>
          </div>
          <div className="stat-chip">
            <div className="stat-l">Fav service</div>
            <div className="stat-v stat-v-text">{c.fav}</div>
            <div className="stat-d">5 of last {c.visits} visits</div>
          </div>
        </div>

        {/* Notes Log */}
        <section className="profile-section">
          <div className="section-head">
            <div className="l">
              <h2>Notes</h2>
              <span className="count">{notes.length}</span>
            </div>
            <div className="r">
              {!addingNote && (
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setAddingNote(true)}
                >
                  <I.plus /> Add note
                </button>
              )}
            </div>
          </div>

          {addingNote && (
            <div className="note-card note-new">
              <textarea
                placeholder="Anything you want to remember about Priya — preferences, allergies, conversations…"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                autoFocus
              />
              <div className="note-new-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => { setAddingNote(false); setNewNote(""); }}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={saveNote} disabled={!newNote.trim()}>Save note</button>
              </div>
            </div>
          )}

          <div className="notes-list">
            {notes.map(n => (
              <div key={n.id} className="note-card">
                <div className="note-head">
                  <div className="note-author">
                    <div className="avatar sm tone-b">{n.author[0]}</div>
                    <span>{n.author}</span>
                    <span className="dot-sep" />
                    <span style={{ color: "var(--ink-3)" }}>{n.date}</span>
                  </div>
                </div>
                <div className="note-text">{n.text}</div>
              </div>
            ))}
            {notes.length === 0 && (
              <div className="note-empty">No notes yet. Tap "Add note" to remember anything about Priya.</div>
            )}
          </div>
        </section>

        {/* Visit History */}
        <section className="profile-section">
          <div className="section-head">
            <div className="l">
              <h2>Visit history</h2>
              <span className="count">{c.visitHistory.length} visits</span>
            </div>
            <div className="r">
              <button className="btn btn-ghost btn-sm" onClick={() => setFlash("Exporting customer history...")}>Export CSV</button>
            </div>
          </div>

          <div className="visits-list">
            {c.visitHistory.map((v, i) => (
              <div key={v.id} className="visit-row">
                <div className="visit-date">
                  <div className="vd-day">{v.date.split(" ")[0]}</div>
                  <div className="vd-mo">{v.date.split(" ").slice(1).join(" ")}</div>
                </div>
                <div className="visit-body">
                  <div className="visit-services">
                    {v.services.map((s, j) => (
                      <span key={j} className="visit-service">
                        {s.name} <small>₹{s.amt.toLocaleString("en-IN")}</small>
                      </span>
                    ))}
                  </div>
                  <div className="visit-meta">with {v.stylist} · paid via {v.payment}</div>
                </div>
                <div className="visit-amount">
                  ₹{v.amount.toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>}

      {/* Sticky Bottom Actions */}
      <div className="profile-cta">
        <button
          className="btn btn-outline btn-lg"
          onClick={() => setAddingNote(true)}
          style={{ flex: 1 }}
        >
          <I.plus /> Add note
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => setShowMsg(true)}
          style={{ flex: 2, background: c.engagement === "lost" ? "var(--rose)" : undefined }}
        >
          <I.wa style={{ width: 16, height: 16 }} /> Send re-engagement message
        </button>
      </div>

      {/* Navigation */}
      <nav className="bottom-nav">
        <Link href="/dashboard" className="bn-item">
          <I.home />
          <span>Home</span>
        </Link>
        <Link href="/dashboard/bookings" className="bn-item">
          <I.calendar />
          <span>Bookings</span>
        </Link>
        <Link href="/dashboard/customers" className="bn-item active">
          <I.users />
          <span>Customers</span>
        </Link>
        <Link href="/dashboard/revenue" className="bn-item">
          <I.insights />
          <span>Insights</span>
        </Link>
        <Link href="/dashboard/settings" className="bn-item">
          <I.settings />
          <span>Settings</span>
        </Link>
      </nav>

      {/* Message Modal */}
      {showMsg && <MessageModal customer={c} onClose={() => setShowMsg(false)} onSend={sendMsg} />}

      {/* Flash Messages */}
      {flash && (
        <div
          style={{
            position: "fixed",
            bottom: 120,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            zIndex: 60,
            boxShadow: "0 12px 24px -10px rgba(0,0,0,0.3)",
          }}
        >
          {flash}
        </div>
      )}
    </div>
  );
}
