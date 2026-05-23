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
    <div className="pb-[120px] max-[640px]:pb-[100px]">
      {/* Top Bar */}
      <div className="sticky top-0 z-[100] bg-bg/85 backdrop-blur-md border-b border-line">
        <div className="max-w-[760px] mx-auto flex items-center h-14 px-6 max-[640px]:px-4 max-[640px]:h-[52px]">
          <button
            className="grid place-items-center w-9 h-9 rounded-full text-ink-2 transition-colors duration-150 no-underline hover:bg-bg-2 hover:text-ink"
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
        <main className="max-w-[760px] mx-auto p-[22px_24px_32px] flex flex-col gap-4.5 max-[640px]:p-[18px_16px_28px] max-[640px]:gap-3.5">
          {[160, 100, 200, 180].map((h, i) => (
            <div key={i} className="pulse" style={{ height: h, borderRadius: "var(--radius)", background: "var(--bg-2)" }} />
          ))}
        </main>
      )}

      {/* Main Container */}
      {!loading && <main className="max-w-[760px] mx-auto p-[22px_24px_32px] flex flex-col gap-4.5 max-[640px]:p-[18px_16px_28px] max-[640px]:gap-3.5">
        {/* Profile Card */}
        <div className="grid grid-cols-[80px_1fr] gap-5 p-6 bg-white border border-line rounded-xl items-start max-[640px]:grid-cols-1 max-[640px]:text-center max-[640px]:justify-items-center max-[640px]:p-[20px_18px] max-[640px]:gap-4">
          <div className={`avatar xl tone-${c.tone} w-20 h-20 text-[28px] max-[640px]:w-[72px] max-[640px]:h-[72px] max-[640px]:text-2xl`}>
            {initialsOf(c.name)}
          </div>
          <div className="min-w-0 flex flex-col gap-2 max-[640px]:items-center max-[640px]:gap-1.5">
            <div className="text-xl font-bold tracking-[-0.01em] text-ink flex items-center flex-wrap gap-2.5 max-[640px]:text-xl max-[640px]:flex-col max-[640px]:gap-2">
              {c.name}
              <span className={`inline-flex items-center gap-1.25 text-[11px] font-medium py-0.75 px-2.5 rounded-full ${
                engColor === "green" ? "bg-green-soft text-green" : engColor === "amber" ? "bg-amber-soft text-amber-ink" : "bg-rose-soft text-rose"
              }`}>
                <span className={`w-1.25 h-1.25 rounded-full ${
                  engColor === "green" ? "bg-[#2DA76C]" : engColor === "amber" ? "bg-amber" : "bg-rose"
                }`} />
                {engLabel}
              </span>
            </div>
            <div className="text-sm text-ink-3 flex items-center flex-wrap gap-1.5 max-[640px]:text-sm max-[640px]:flex-wrap max-[640px]:justify-center">
              <I.phone className="align-[-2px]" /> {c.phone}
              <span className="text-ink-4 mx-0.5" /> Member since {c.memberSince}
              <span className="text-ink-4 mx-0.5" />
              <I.cal />
            </div>
            <div className="text-sm text-ink-2 flex gap-4 max-[640px]:text-xs max-[640px]:gap-3 max-[640px]:justify-center">
              <span><strong className="text-ink font-semibold mr-1">Prefers</strong> {c.prefStylist}</span>
              <span><strong className="text-ink font-semibold mr-1">Birthday</strong> {c.birthday}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-start max-[640px]:flex-row max-[640px]:w-full max-[640px]:justify-center">
            <button className="btn btn-outline btn-sm flex-1 max-[640px]:flex-1 max-[640px]:max-w-[160px]" onClick={() => setFlash("Edit details form coming soon!")}><I.edit /> Edit</button>
            <button className="btn btn-wa btn-sm flex-1 max-[640px]:flex-1 max-[640px]:max-w-[160px]" onClick={() => setShowMsg(true)}><I.wa style={{ width: 14, height: 14 }} /> Message</button>
          </div>
        </div>

        {/* Upcoming Booking */}
        {c.upcoming && (
          <div className="flex items-center justify-between gap-4 p-[16px_20px] bg-teal-soft border border-teal-soft-2 rounded-xl max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-3 max-[640px]:p-4">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold tracking-[0.06em] uppercase text-teal-ink mb-1.5">UPCOMING</div>
              <div className="text-base font-semibold tracking-[-0.01em] text-teal-ink">{c.upcoming.service}</div>
              <div className="text-sm text-teal-ink opacity-80 mt-1">{c.upcoming.date} · {c.upcoming.time} · with {c.upcoming.stylist}</div>
            </div>
            <button className="btn btn-outline btn-sm shrink-0 max-[640px]:w-full max-[640px]:justify-center" onClick={() => router.push("/dashboard/bookings/BK-2026-0517")}>View booking</button>
          </div>
        )}

        {/* 3 Metrics Chips */}
        <div className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1 max-[640px]:gap-2.5">
          <div className="bg-surface border border-line rounded-xl p-4 text-left max-[640px]:p-4 max-[640px]:grid max-[640px]:grid-cols-[1fr_auto] max-[640px]:grid-rows-[auto_auto] max-[640px]:gap-y-1 max-[640px]:items-center">
            <div className="text-xs text-ink-3 font-medium mb-1.5 max-[640px]:col-start-1 max-[640px]:mb-0">Total visits</div>
            <div className="text-2xl font-bold text-ink tracking-[-0.02em] max-[640px]:col-start-2 max-[640px]:row-start-1 max-[640px]:row-span-2 max-[640px]:text-[22px]">{c.visits}</div>
            <div className="text-[11px] text-ink-3 mt-1 max-[640px]:col-start-1 max-[640px]:mt-0">Last on 13 May</div>
          </div>
          <div className="bg-surface border border-line rounded-xl p-4 text-left max-[640px]:p-4 max-[640px]:grid max-[640px]:grid-cols-[1fr_auto] max-[640px]:grid-rows-[auto_auto] max-[640px]:gap-y-1 max-[640px]:items-center">
            <div className="text-xs text-ink-3 font-medium mb-1.5 max-[640px]:col-start-1 max-[640px]:mb-0">Lifetime spend</div>
            <div className="text-2xl font-bold text-ink tracking-[-0.02em] max-[640px]:col-start-2 max-[640px]:row-start-1 max-[640px]:row-span-2 max-[640px]:text-[22px]"><small className="text-base font-medium">₹</small>{c.spend.toLocaleString("en-IN")}</div>
            <div className="text-[11px] text-ink-3 mt-1 max-[640px]:col-start-1 max-[640px]:mt-0">Avg ₹{Math.round(c.spend/c.visits).toLocaleString("en-IN")}/visit</div>
          </div>
          <div className="bg-surface border border-line rounded-xl p-4 text-left max-[640px]:p-4 max-[640px]:grid max-[640px]:grid-cols-[1fr_auto] max-[640px]:grid-rows-[auto_auto] max-[640px]:gap-y-1 max-[640px]:items-center">
            <div className="text-xs text-ink-3 font-medium mb-1.5 max-[640px]:col-start-1 max-[640px]:mb-0">Fav service</div>
            <div className="text-base overflow-hidden text-ellipsis whitespace-nowrap mt-1 max-[640px]:col-start-2 max-[640px]:row-start-1 max-[640px]:row-span-2 max-[640px]:text-lg">{c.fav}</div>
            <div className="text-[11px] text-ink-3 mt-1 max-[640px]:col-start-1 max-[640px]:mt-0">5 of last {c.visits} visits</div>
          </div>
        </div>

        {/* Notes Log */}
        <section className="bg-white rounded-xl border border-line p-[20px_22px] flex flex-col gap-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold m-0">Notes</h2>
              <span className="text-xs bg-bg-2 py-0.5 px-2 rounded-full text-ink-3">{notes.length}</span>
            </div>
            <div className="flex items-center gap-2">
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
            <div className="bg-surface border border-line rounded-xl p-[14px_16px] border-teal bg-teal-soft">
              <textarea
                placeholder="Anything you want to remember about Priya — preferences, allergies, conversations…"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                autoFocus
                className="border-0 bg-transparent w-full h-20 font-inherit text-[13px] resize-none outline-none text-ink"
              />
              <div className="flex justify-end gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => { setAddingNote(false); setNewNote(""); }}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={saveNote} disabled={!newNote.trim()}>Save note</button>
              </div>
            </div>
          )}

          <div className="notes-list">
            {notes.map(n => (
              <div key={n.id} className="bg-surface border border-line rounded-xl p-[14px_16px] mb-3 last:mb-0">
                <div className="mb-2">
                  <div className="flex items-center gap-2 text-xs text-ink-2 font-medium">
                    <div className="avatar sm tone-b w-5.5 h-5.5 text-[10px]">{n.author[0]}</div>
                    <span>{n.author}</span>
                    <span className="text-ink-4 mx-0.5" />
                    <span style={{ color: "var(--ink-3)" }}>{n.date}</span>
                  </div>
                </div>
                <div className="text-[13px] text-ink-2 leading-[1.5]">{n.text}</div>
              </div>
            ))}
            {notes.length === 0 && (
              <div className="p-5 italic text-[13px] text-ink-3 text-center">No notes yet. Tap "Add note" to remember anything about Priya.</div>
            )}
          </div>
        </section>

        {/* Visit History */}
        <section className="bg-white rounded-xl border border-line p-[20px_22px] flex flex-col gap-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold m-0">Visit history</h2>
              <span className="text-xs bg-bg-2 py-0.5 px-2 rounded-full text-ink-3">{c.visitHistory.length} visits</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => setFlash("Exporting customer history...")}>Export CSV</button>
            </div>
          </div>

          <div className="visits-list flex flex-col gap-3">
            {c.visitHistory.map((v, i) => (
              <div key={v.id} className="grid grid-cols-[52px_1fr_auto] gap-3.5 items-center p-[14px_16px] bg-surface border border-line rounded-xl max-[640px]:grid-cols-[48px_1fr_auto] max-[640px]:gap-3 max-[640px]:p-[12px_14px]">
                <div className="text-center">
                  <div className="text-lg font-bold text-ink tracking-[-0.02em] max-[640px]:text-base">{v.date.split(" ")[0]}</div>
                  <div className="text-[10px] text-ink-3 uppercase tracking-[0.04em] mt-0.5">{v.date.split(" ").slice(1).join(" ")}</div>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-x-2.5 gap-y-1.5">
                    {v.services.map((s, j) => (
                      <span key={j} className="text-[13px] font-medium text-ink">
                        {s.name} <small className="text-ink-3 font-normal">₹{s.amt.toLocaleString("en-IN")}</small>
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-ink-3 mt-1">with {v.stylist} · paid via {v.payment}</div>
                </div>
                <div className="text-[15px] font-semibold text-ink-2 whitespace-nowrap">
                  ₹{v.amount.toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>}

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-[calc(var(--bottom-nav-h)+24px)] left-1/2 -translate-x-1/2 max-w-[712px] w-[calc(100%-48px)] bg-white/92 backdrop-blur-md border border-line rounded-2xl p-2.5 flex gap-2.5 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.1)] z-40 max-[640px]:left-4 max-[640px]:right-4 max-[640px]:transform-none max-[640px]:max-w-none max-[640px]:w-auto max-[640px]:bottom-[calc(var(--bottom-nav-h)+16px)]">
        <button
          className="btn btn-outline h-12 text-sm px-4.5 max-[640px]:text-[13px] max-[640px]:h-11 max-[640px]:px-3.5"
          onClick={() => setAddingNote(true)}
          style={{ flex: 1 }}
        >
          <I.plus /> Add note
        </button>
        <button
          className="btn btn-primary h-12 text-sm px-4.5 max-[640px]:text-[13px] max-[640px]:h-11 max-[640px]:px-3.5"
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
