"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Icons as I } from "@/components/ui/Icons";
import { useFlash } from "@/hooks";
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
    <div className="fixed inset-0 bg-black/40 z-[100] grid place-items-center" onClick={onClose}>
      <div className="w-[min(500px,92%)] bg-white rounded-[var(--radius-lg)] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()} style={{animation: "pop .2s ease"}}>
        <div className="flex justify-between items-start p-[18px] border-b border-line">
          <div>
            <h3 className="text-[17px] font-semibold m-0">WhatsApp {customer.name}</h3>
            <div className="text-[12px] text-ink-3 mt-0.5">{customer.phone}</div>
          </div>
          <button className="border-0 bg-transparent cursor-pointer grid place-items-center" onClick={onClose}><I.x /></button>
        </div>
        <div className="flex flex-col gap-3.5 p-[18px]">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-ink-3">Pick a template</label>
            <div className="flex flex-col gap-1.5">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  className={`text-left p-[10px_14px] rounded-[10px] border font-inherit text-[13px] text-ink-2 cursor-pointer font-medium transition-[border-color,background,color] duration-150 ${
                    tpl === t.id ? "border-teal bg-teal-soft text-teal-ink" : "border-line bg-white hover:border-line-2"
                  }`}
                  onClick={() => select(t.id)}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-ink-3">Message preview</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Type your message…"
              className="w-full h-[110px] rounded-[8px] border border-line-2 p-[12px_14px] text-[14px] font-sans resize-y outline-0 focus:border-teal"
            />
            <div className="text-[11px] text-ink-3 mt-1">{body.length} characters</div>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 p-[12px_18px] border-t border-line bg-bg">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="bg-wa text-[#052B11] border-0 rounded-[10px] px-4 h-10 font-medium inline-flex items-center gap-2 cursor-pointer hover:bg-[#1FBA5A]"
            onClick={() => { onSend(body); onClose(); }}
            disabled={!body.trim()}
          >
            <I.wa /> Send on WhatsApp
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
  const { flash, show: showFlash } = useFlash(2000);
  const [ownerName, setOwnerName] = useState("Owner");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const isUuid = isUUID(customerId);

    if (!isUuid || !supabase) {
      setProfile(MOCK_PROFILE);
      setNotes(MOCK_PROFILE.notes);
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);

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

        const dates = completedBks.map((b: any) => new Date(b.date).getTime()).filter(Boolean);
        const lastMs = dates.length > 0 ? Math.max(...dates) : null;
        const lastDays = lastMs ? Math.round((today.getTime() - lastMs) / 86400000) : 999;
        const engagement: "active" | "cooling" | "lost" =
          lastDays <= 30 ? "active" : lastDays <= 60 ? "cooling" : "lost";

        const svcCount: Record<string, number> = {};
        (bookings || []).forEach((b: any) =>
          (b.booking_services || []).forEach((bs: any) => {
            const sn = bs.service?.name; if (sn) svcCount[sn] = (svcCount[sn] || 0) + 1;
          })
        );
        const fav = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

        const prefStylist = (bookings as any)?.[0]?.stylist?.name || (cust.stylists as any)?.name || "—";

        const msDt = cust.member_since ? new Date(cust.member_since) : new Date(cust.created_at || Date.now());
        const memberSince = msDt.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

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
    showFlash("Note saved successfully!", 1500);

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
  };

  const sendMsg = (body: string) => {
    showFlash(`WhatsApp opened for ${c.name}`, 800);
    const cleanPhone = c.phone.replace(/[^0-9+]/g, "");
    setTimeout(() => {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(body)}`, "_blank");
    }, 800);
  };

  const engPillBg = engColor === "green" ? "bg-[#DFF1E6] text-[#137A4A]" : engColor === "amber" ? "bg-amber-soft text-amber-ink" : "bg-rose-soft text-rose";
  const engDotBg = engColor === "green" ? "bg-[#2DA76C]" : engColor === "amber" ? "bg-amber" : "bg-rose";
  return (
    <div className="pb-[calc(72px+120px)] bg-bg">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-10 bg-bg/85 backdrop-blur-md border-b border-line">
        <div className="max-w-[760px] mx-auto flex items-center h-14 px-6 max-[640px]:px-4 max-[640px]:h-[52px]">
          <button
            className="grid place-items-center w-9 h-9 rounded-[10px] text-ink cursor-pointer border-0 hover:bg-bg-2"
            onClick={() => router.push("/dashboard/customers")}
            aria-label="Back"
          >
            <I.back />
          </button>
          <div className="flex-1 text-[14px] font-semibold tracking-[-0.005em]">Customer profile</div>
          <button className="icon-btn"><I.more /></button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <main className="max-w-[760px] mx-auto p-[22px_24px_32px] flex flex-col gap-[18px] max-[640px]:p-[18px_16px_28px] max-[640px]:gap-3.5">
          {[160, 100, 200, 180].map((h, i) => (
            <div key={i} className="pulse rounded-radius bg-bg-2" style={{ height: h }} />
          ))}
        </main>
      )}

      {/* Main Content */}
      {!loading && <main className="max-w-[760px] mx-auto p-[22px_24px_32px] flex flex-col gap-[18px] max-[640px]:p-[18px_16px_28px] max-[640px]:gap-[14px]">
        {/* ─── PROFILE HERO CARD ─── */}
        <div className="bg-white border border-line rounded-[var(--radius)] p-6 grid grid-cols-[80px_1fr_auto] gap-5 items-center max-[640px]:grid-cols-[64px_1fr] max-[640px]:p-[18px] max-[640px]:gap-4">
          <div className={`avatar xl tone-${c.tone} w-20 h-20 text-[26px] font-semibold max-[640px]:w-[64px] max-[640px]:h-[64px] max-[640px]:text-[22px]`}>
            {initialsOf(c.name)}
          </div>
          <div className="min-w-0">
            <div className="text-[24px] font-semibold tracking-[-0.025em] flex items-center flex-wrap gap-3 mb-1.5 max-[640px]:text-[20px]">
              {c.name}
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-[10px] py-[4px] rounded-[999px] ${engPillBg}`}>
                <span className={`w-[5px] h-[5px] rounded-full ${engDotBg}`} />
                {engLabel}
              </span>
            </div>
            <div className="text-[13px] text-ink-3 flex items-center flex-wrap gap-1.5">
              <I.phone style={{verticalAlign: -2}} /> {c.phone}
              <span className="text-ink-4">·</span>
              <I.cal style={{verticalAlign: -2}} /> Member since {c.memberSince}
            </div>
            <div className="flex gap-6 mt-2.5 text-[12px] text-ink-3 max-[640px]:text-xs max-[640px]:gap-3">
              <span><strong className="text-ink font-semibold mr-1">Prefers</strong> {c.prefStylist}</span>
              <span><strong className="text-ink font-semibold mr-1">Birthday</strong> {c.birthday}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 max-[640px]:col-span-2 max-[640px]:flex-row max-[640px]:border-t max-[640px]:border-line max-[640px]:pt-[14px] max-[640px]:mt-1">
            <button className="btn btn-outline btn-sm" onClick={() => showFlash("Edit details form coming soon!")}><I.edit /> Edit</button>
            <button
              className={`btn btn-sm ${c.engagement === "lost" ? "!bg-rose text-white" : "btn-wa"}`}
              onClick={() => setShowMsg(true)}
            >
              <I.wa /> Send re-engagement
            </button>
          </div>
        </div>

        {/* ─── UPCOMING BOOKING ─── */}
        {c.upcoming && (
          <div className="flex items-center justify-between gap-4 p-[16px_20px] bg-teal-soft border border-teal-soft-2 rounded-[var(--radius)] max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-3 max-[640px]:p-4">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[11px] font-semibold tracking-[0.04em] uppercase text-teal-ink mb-1">{c.upcoming.service === "No show" ? "CANCELLED" : "UPCOMING"}</div>
              <div className="text-[16px] font-semibold tracking-[-0.01em] text-ink">{c.upcoming.service}</div>
              <div className="text-[13px] text-teal-ink mt-0.5">{c.upcoming.date} · {c.upcoming.time} · with {c.upcoming.stylist}</div>
            </div>
            <button className="btn btn-outline btn-sm shrink-0 max-[640px]:w-full max-[640px]:justify-center" onClick={() => router.push("/dashboard/bookings/BK-2026-0517")}>View booking →</button>
          </div>
        )}

        {/* ─── STAT CHIPS ─── */}
        <div className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1 max-[640px]:gap-[10px]">
          <div className="bg-surface border border-line rounded-[var(--radius)] p-[18px_20px] max-[640px]:p-[14px_16px] max-[640px]:grid max-[640px]:grid-cols-[1fr_auto] max-[640px]:items-center max-[640px]:gap-y-1">
            <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mb-1.5 max-[640px]:col-start-1 max-[640px]:mb-0">Total visits</div>
            <div className="text-[30px] font-semibold tracking-[-0.025em] text-ink flex items-baseline max-[640px]:col-start-2 max-[640px]:row-start-1 max-[640px]:row-span-2 max-[640px]:text-[22px]">{c.visits}</div>
            <div className="text-[12px] text-ink-3 mt-1 max-[640px]:col-start-1 max-[640px]:mt-0">Last on 13 May</div>
          </div>
          <div className="bg-surface border border-line rounded-[var(--radius)] p-[18px_20px] max-[640px]:p-[14px_16px] max-[640px]:grid max-[640px]:grid-cols-[1fr_auto] max-[640px]:items-center max-[640px]:gap-y-1">
            <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mb-1.5 max-[640px]:col-start-1 max-[640px]:mb-0">Lifetime spend</div>
            <div className="text-[30px] font-semibold tracking-[-0.025em] text-ink flex items-baseline max-[640px]:col-start-2 max-[640px]:row-start-1 max-[640px]:row-span-2 max-[640px]:text-[22px]">
              <small className="text-[16px] font-normal text-ink-3">₹</small>{c.spend.toLocaleString("en-IN")}
            </div>
            <div className="text-[12px] text-ink-3 mt-1 max-[640px]:col-start-1 max-[640px]:mt-0">Avg ₹{Math.round(c.spend/c.visits).toLocaleString("en-IN")} per visit</div>
          </div>
          <div className="bg-surface border border-line rounded-[var(--radius)] p-[18px_20px] max-[640px]:p-[14px_16px] max-[640px]:grid max-[640px]:grid-cols-[1fr_auto] max-[640px]:items-center max-[640px]:gap-y-1">
            <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mb-1.5 max-[640px]:col-start-1 max-[640px]:mb-0">Favourite service</div>
            <div className="text-[20px] font-semibold tracking-[-0.015em] text-ink leading-[1.2] max-[640px]:col-start-2 max-[640px]:row-start-1 max-[640px]:row-span-2 max-[640px]:text-lg">{c.fav}</div>
            <div className="text-[12px] text-ink-3 mt-1 max-[640px]:col-start-1 max-[640px]:mt-0">5 of last {c.visits} visits</div>
          </div>
        </div>

        {/* ─── NOTES ─── */}
        <section className="bg-white border border-line rounded-[var(--radius)] p-[20px_22px]">
          <div className="flex items-center justify-between mb-[14px]">
            <div className="flex items-baseline gap-3">
              <h2 className="text-[18px] font-semibold tracking-[-0.01em] m-0">Notes</h2>
              <span className="font-mono text-[13px] text-ink-3">{notes.length}</span>
            </div>
            <div className="flex items-center gap-2">
              {!addingNote && (
                <button className="btn btn-sm btn-outline" onClick={() => setAddingNote(true)}>
                  <I.plus /> Add note
                </button>
              )}
            </div>
          </div>

          {addingNote && (
            <div className="border border-teal bg-teal-soft rounded-[10px] p-[14px_16px]">
              <textarea
                placeholder="Anything you want to remember about Priya — preferences, allergies, conversations…"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                autoFocus
                className="border-0 bg-transparent w-full min-h-[64px] outline-0 font-inherit text-[14px] text-ink resize-y leading-[1.5]"
              />
              <div className="flex justify-end gap-2 mt-2 pt-[10px] border-t border-[rgba(15,110,86,0.18)]">
                <button className="btn btn-ghost btn-sm" onClick={() => { setAddingNote(false); setNewNote(""); }}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={saveNote} disabled={!newNote.trim()}>Save note</button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-[10px]">
            {notes.map(n => (
              <div key={n.id} className="border border-line rounded-[10px] p-[14px_16px]">
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2 text-[12px] text-ink-2 font-medium">
                    <div className={`avatar sm tone-b w-[22px] h-[22px] text-[10px]`}>{n.author[0]}</div>
                    <span>{n.author}</span>
                    <span className="text-ink-4">·</span>
                    <span className="text-ink-3">{n.date}</span>
                  </div>
                </div>
                <div className="text-[14px] text-ink-2 leading-[1.5]">{n.text}</div>
              </div>
            ))}
            {notes.length === 0 && (
              <div className="p-6 text-center text-[13px] text-ink-3 bg-bg-2 rounded-[10px]">No notes yet. Tap "Add note" to remember anything about Priya.</div>
            )}
          </div>
        </section>

        {/* ─── VISIT HISTORY ─── */}
        <section className="bg-white border border-line rounded-[var(--radius)] p-[20px_22px]">
          <div className="flex items-center justify-between mb-[14px]">
            <div className="flex items-baseline gap-3">
              <h2 className="text-[18px] font-semibold tracking-[-0.01em] m-0">Visit history</h2>
              <span className="font-mono text-[13px] text-ink-3">{c.visitHistory.length} visits</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => showFlash("Exporting customer history...")}>Export CSV</button>
            </div>
          </div>

          <div className="flex flex-col">
            {c.visitHistory.map((v, i) => (
              <div key={v.id} className={`grid grid-cols-[56px_1fr_auto] gap-4 items-center py-[14px] ${i > 0 ? "border-t border-line" : ""} max-[640px]:grid-cols-[48px_1fr_auto] max-[640px]:gap-3`}>
                <div className="text-center bg-bg-2 rounded-[8px] py-2 min-w-[56px] font-mono">
                  <div className="text-[16px] font-bold text-ink leading-none tracking-[-0.02em] max-[640px]:text-base">{v.date.split(" ")[0]}</div>
                  <div className="text-[9px] text-ink-3 mt-1 tracking-[0.04em] uppercase">{v.date.split(" ").slice(1).join(" ")}</div>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-x-[10px] gap-y-1.5">
                    {v.services.map((s, j) => (
                      <span key={j} className="text-[13px] font-medium text-ink inline-flex items-baseline gap-1.5">
                        {s.name}
                        <small className="font-mono text-[11px] font-normal text-ink-3">₹{s.amt.toLocaleString("en-IN")}</small>
                        {j < v.services.length - 1 && <span className="text-ink-4 ml-1">·</span>}
                      </span>
                    ))}
                  </div>
                  <div className="text-[12px] text-ink-3 mt-1">with {v.stylist} · paid via {v.payment}</div>
                </div>
                <div className="text-[15px] font-semibold text-ink tracking-[-0.01em] whitespace-nowrap">
                  ₹{v.amount.toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>}

      {/* ─── BOTTOM NAV ─── */}
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

      {/* ─── MESSAGE MODAL ─── */}
      {showMsg && <MessageModal customer={c} onClose={() => setShowMsg(false)} onSend={sendMsg} />}

      {/* ─── FLASH MESSAGE ─── */}
      {flash && (
        <div className="fixed bottom-[120px] left-1/2 -translate-x-1/2 bg-ink text-white px-4 py-[10px] rounded-[10px] text-[13px] z-[60] shadow-[0_12px_24px_-10px_rgba(0,0,0,0.3)]">
          {flash}
        </div>
      )}
    </div>
  );
}
