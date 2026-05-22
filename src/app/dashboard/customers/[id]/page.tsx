"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

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

interface CustomerProfile {
  id: string | number;
  name: string;
  tone: string;
  phone: string;
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

// ===== ICONS =====
const I = {
  back: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  more: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
    </svg>
  ),
  phone: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.6a2 2 0 0 1-.5 2L7.9 9.7a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2-.5c.9.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/>
    </svg>
  ),
  wa: ({ style }: { style?: React.CSSProperties }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.2 3.2.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.3c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
    </svg>
  ),
  cal: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>
    </svg>
  ),
  edit: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>
    </svg>
  ),
  plus: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  x: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
  home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/>
    </svg>
  ),
  users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
    </svg>
  ),
};

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

const initialsOf = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();

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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);

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
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
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
    <div className="app">
      {/* Top Bar */}
      <div className="profile-topbar" style={{ background: "#fff", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, zIndex: 30 }}>
        <div className="profile-topbar-inner" style={{ display: "flex", alignItems: "center", height: 50, padding: "0 16px" }}>
          <button
            onClick={() => router.push("/dashboard/customers")}
            style={{ border: 0, background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: "50%" }}
            aria-label="Back"
          >
            <I.back />
          </button>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600, letterSpacing: "-0.005em", marginLeft: 8 }}>Customer profile</div>
          <button style={{ border: 0, background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", width: 32, height: 32 }}><I.more /></button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <main style={{ padding: "16px 16px 120px", display: "flex", flexDirection: "column", gap: 16 }}>
          {[160, 100, 200, 180].map((h, i) => (
            <div key={i} className="pulse" style={{ height: h, borderRadius: "var(--radius)", background: "var(--bg-2)" }} />
          ))}
        </main>
      )}

      {/* Main Container */}
      {!loading && <main className="profile-main" style={{ padding: "16px 16px 120px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Profile Card */}
        <div className="profile-hero card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: 20, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative" }}>
          <div
            className={`avatar xl tone-${c.tone}`}
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: 24,
              marginBottom: 12,
              background: c.tone === "a" ? "var(--teal-soft)" : c.tone === "b" ? "var(--amber-soft)" : c.tone === "c" ? "var(--blue-soft)" : c.tone === "d" ? "var(--green-soft)" : c.tone === "e" ? "var(--rose-soft)" : "var(--bg-2)",
              color: c.tone === "a" ? "var(--teal)" : c.tone === "b" ? "var(--amber-ink)" : c.tone === "c" ? "var(--blue)" : c.tone === "d" ? "var(--green)" : c.tone === "e" ? "var(--rose)" : "var(--ink-2)"
            }}
          >
            {initialsOf(c.name)}
          </div>
          <div className="profile-id" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div className="profile-name" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
              {c.name}
              <span
                className={`engage-pill ${engColor}`}
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: "2px 8px",
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: engColor === "green" ? "var(--green-soft)" : engColor === "amber" ? "var(--amber-soft)" : "var(--rose-soft)",
                  color: engColor === "green" ? "var(--green)" : engColor === "amber" ? "var(--amber-ink)" : "var(--rose)"
                }}
              >
                <span
                  className={`engage-dot ${engColor}`}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: engColor === "green" ? "var(--green)" : engColor === "amber" ? "var(--amber)" : "var(--rose)"
                  }}
                />
                {engLabel}
              </span>
            </div>
            <div className="profile-phone" style={{ fontSize: 13, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 4 }}>
              <I.phone /> {c.phone}
              <span style={{ margin: "0 4px" }}>·</span>
              <I.cal /> Member since {c.memberSince}
            </div>
            <div className="profile-quick" style={{ fontSize: 12, color: "var(--ink-2)", display: "flex", gap: 12, marginTop: 4 }}>
              <span><strong>Prefers</strong> {c.prefStylist}</span>
              <span><strong>Birthday</strong> {c.birthday}</span>
            </div>
          </div>
          <div className="profile-hero-actions" style={{ display: "flex", gap: 10, marginTop: 16, width: "100%", justifyContent: "center" }}>
            <button className="btn btn-outline btn-sm" onClick={() => setFlash("Edit details form coming soon!")} style={{ height: 32, padding: "0 12px", border: "1px solid var(--line-2)", background: "#fff", borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}><I.edit /> Edit</button>
            <button className="btn btn-wa btn-sm" onClick={() => setShowMsg(true)} style={{ height: 32, padding: "0 12px", background: "var(--wa-soft)", color: "var(--wa)", border: 0, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}><I.wa style={{ width: 14, height: 14 }} /> Message</button>
          </div>
        </div>

        {/* Upcoming Booking */}
        {c.upcoming && (
          <div className="upcoming card" style={{ background: "var(--teal-soft)", border: "1px solid var(--teal-soft-2)", borderRadius: "var(--radius)", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="upcoming-l">
              <div className="t-label" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: "var(--teal-ink)", marginBottom: 4 }}>UPCOMING</div>
              <div className="upcoming-val" style={{ fontSize: 15, fontWeight: 600, color: "var(--teal-ink)" }}>{c.upcoming.service}</div>
              <div className="upcoming-meta" style={{ fontSize: 12, color: "var(--teal-ink)", opacity: 0.8, marginTop: 2 }}>{c.upcoming.date} · {c.upcoming.time} · with {c.upcoming.stylist}</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => router.push("/dashboard/bookings/BK-2026-0517")} style={{ background: "#fff", border: "1px solid var(--teal-soft-2)", color: "var(--teal)", fontSize: 12, height: 32, borderRadius: 8, padding: "0 12px", cursor: "pointer" }}>View booking</button>
          </div>
        )}

        {/* 3 Metrics Chips */}
        <div className="stat-chips" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <div className="stat-chip" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "12px 10px", textAlign: "center" }}>
            <div className="stat-l" style={{ fontSize: 11, color: "var(--ink-3)" }}>Total visits</div>
            <div className="stat-v" style={{ fontSize: 20, fontWeight: 700, margin: "4px 0 2px" }}>{c.visits}</div>
            <div className="stat-d" style={{ fontSize: 10, color: "var(--ink-3)" }}>Last on 13 May</div>
          </div>
          <div className="stat-chip" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "12px 10px", textAlign: "center" }}>
            <div className="stat-l" style={{ fontSize: 11, color: "var(--ink-3)" }}>Lifetime spend</div>
            <div className="stat-v" style={{ fontSize: 20, fontWeight: 700, margin: "4px 0 2px", color: "var(--teal)" }}><small style={{ fontSize: 14 }}>₹</small>{c.spend.toLocaleString("en-IN")}</div>
            <div className="stat-d" style={{ fontSize: 10, color: "var(--ink-3)" }}>Avg ₹{Math.round(c.spend/c.visits).toLocaleString("en-IN")}/visit</div>
          </div>
          <div className="stat-chip" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "12px 10px", textAlign: "center" }}>
            <div className="stat-l" style={{ fontSize: 11, color: "var(--ink-3)" }}>Fav service</div>
            <div className="stat-v stat-v-text" style={{ fontSize: 14, fontWeight: 700, margin: "8px 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.fav}</div>
            <div className="stat-d" style={{ fontSize: 10, color: "var(--ink-3)" }}>5 of 12 visits</div>
          </div>
        </div>

        {/* Notes Log */}
        <section className="profile-section" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="l" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Notes</h2>
              <span className="count" style={{ fontSize: 11, background: "var(--bg-2)", padding: "2px 6px", borderRadius: 999, color: "var(--ink-3)" }}>{notes.length}</span>
            </div>
            <div className="r">
              {!addingNote && (
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setAddingNote(true)}
                  style={{
                    height: 28,
                    borderRadius: 6,
                    border: "1px solid var(--line-2)",
                    background: "#fff",
                    fontSize: 12,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4
                  }}
                >
                  <I.plus /> Add note
                </button>
              )}
            </div>
          </div>

          {addingNote && (
            <div className="note-card note-new" style={{ background: "#fff", border: "1px solid var(--teal-soft-2)", borderRadius: "var(--radius)", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <textarea
                placeholder="Anything you want to remember about Priya — preferences, allergies, conversations…"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  height: 80,
                  border: 0,
                  outline: 0,
                  resize: "none",
                  fontSize: 13,
                  fontFamily: "inherit"
                }}
              />
              <div className="note-new-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setAddingNote(false); setNewNote(""); }} style={{ height: 28, fontSize: 12 }}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={saveNote} disabled={!newNote.trim()} style={{ height: 28, fontSize: 12, background: "var(--teal)", color: "#fff", border: 0, padding: "0 12px", borderRadius: 6, cursor: "pointer" }}>Save note</button>
              </div>
            </div>
          )}

          <div className="notes-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notes.map(n => (
              <div key={n.id} className="note-card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 12 }}>
                <div className="note-head" style={{ marginBottom: 6 }}>
                  <div className="note-author" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-2)", fontWeight: 500 }}>
                    <div className="avatar sm tone-b" style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--amber-soft)", color: "var(--amber-ink)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: "bold" }}>
                      {n.author[0]}
                    </div>
                    <span>{n.author}</span>
                    <span style={{ color: "var(--ink-4)" }}>·</span>
                    <span style={{ color: "var(--ink-3)", fontSize: 11 }}>{n.date}</span>
                  </div>
                </div>
                <div className="note-text" style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.4 }}>{n.text}</div>
              </div>
            ))}
            {notes.length === 0 && (
              <div className="note-empty" style={{ padding: "20px 10px", fontStyle: "italic", fontSize: 12, color: "var(--ink-3)", textAlign: "center" }}>No notes yet. Tap &quot;Add note&quot; to remember anything about Priya.</div>
            )}
          </div>
        </section>

        {/* Visit History */}
        <section className="profile-section" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="l" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Visit history</h2>
              <span className="count" style={{ fontSize: 11, background: "var(--bg-2)", padding: "2px 6px", borderRadius: 999, color: "var(--ink-3)" }}>{c.visitHistory.length} visits</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setFlash("Exporting customer history...")} style={{ height: 28, fontSize: 12, color: "var(--teal)", cursor: "pointer", border: 0, background: "transparent" }}>Export CSV</button>
          </div>

          <div className="visits-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {c.visitHistory.map((v, i) => (
              <div key={v.id} className="visit-row" style={{ display: "flex", alignItems: "center", padding: "12px 14px", background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
                <div className="visit-date" style={{ marginRight: 14, minWidth: 46, textAlign: "center" }}>
                  <div className="vd-day" style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{v.date.split(" ")[0]}</div>
                  <div className="vd-mo" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.02em", marginTop: 2 }}>{v.date.split(" ").slice(1).join(" ")}</div>
                </div>
                <div className="visit-body" style={{ flex: 1, minWidth: 0 }}>
                  <div className="visit-services" style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px" }}>
                    {v.services.map((s, j) => (
                      <span key={j} className="visit-service" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                        {s.name} <small style={{ color: "var(--ink-3)", marginLeft: 2 }}>₹{s.amt}</small>
                      </span>
                    ))}
                  </div>
                  <div className="visit-meta" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>with {v.stylist} · paid via {v.payment}</div>
                </div>
                <div className="visit-amount" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-2)", flexShrink: 0 }}>
                  ₹{v.amount.toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>}

      {/* Sticky Bottom Actions */}
      <div
        className="profile-cta"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderTop: "1px solid var(--line)",
          padding: 12,
          display: "flex",
          gap: 10,
          zIndex: 40
        }}
      >
        <button
          className="btn btn-outline btn-lg"
          onClick={() => setAddingNote(true)}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 10,
            border: "1px solid var(--line-2)",
            background: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6
          }}
        >
          <I.plus /> Add note
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => setShowMsg(true)}
          style={{
            flex: 2,
            height: 48,
            borderRadius: 10,
            background: c.engagement === "lost" ? "var(--rose)" : "var(--teal)",
            color: "#fff",
            border: 0,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6
          }}
        >
          <I.wa style={{ width: 16, height: 16 }} /> Re-engage customer
        </button>
      </div>

      {/* Navigation */}
      <nav className="bottom-nav">
        <Link href="/dashboard" className="bn-item">
          <I.home />
          <span>Home</span>
        </Link>
        <Link href="/dashboard/bookings" className="bn-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>
          </svg>
          <span>Bookings</span>
        </Link>
        <Link href="/dashboard/customers" className="bn-item active">
          <I.users />
          <span>Customers</span>
        </Link>
        <Link href="/dashboard/revenue" className="bn-item">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21V3M21 21H3" />
            <rect x="7" y="11" width="3" height="6" rx="0.5" />
            <rect x="12" y="7" width="3" height="10" rx="0.5" />
            <rect x="17" y="13" width="3" height="4" rx="0.5" />
          </svg>
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
