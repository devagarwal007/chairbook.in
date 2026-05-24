"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useProfile } from "@/context/ProfileContext";
import { useToast } from "@/context/ToastContext";
import { DbBlockRow } from "@/types";

import { Icons as IBT } from "@/components/ui/Icons";

// ===== TYPES =====
interface UIStylist {
  id: string;
  name: string;
  short: string;
  tone: string;
}

interface UIBlock {
  id: string | number;
  reason: string;
  reasonLabel: string;
  stylists: string[];
  date: string;
  dateTo?: string;
  allDay: boolean;
  from?: string;
  to?: string;
  recurring: "once" | "daily" | "weekly";
  note: string;
}

// ===== CONSTANTS =====
const REASONS = [
  { id: "lunch",    label: "Lunch break",     icon: "coffee", tone: "amber" },
  { id: "leave",    label: "On leave",        icon: "plane",  tone: "rose"  },
  { id: "personal", label: "Personal",        icon: "lock",   tone: "rose"  },
  { id: "closed",   label: "Salon closed",    icon: "lock",   tone: "rose"  },
  { id: "holiday",  label: "Public holiday",  icon: "party",  tone: "amber" },
  { id: "custom",   label: "Other",           icon: "edit",   tone: "amber" },
];

const TIME_OPTS = [
  "09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30",
  "13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30",
  "17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00"
];

const fallbackStylists: UIStylist[] = [
  { id: "anjali", name: "Anjali",        short: "A", tone: "b" },
  { id: "pooja",  name: "Pooja",         short: "P", tone: "d" },
  { id: "kiran",  name: "Kiran",         short: "K", tone: "c" },
  { id: "rekha",  name: "Rekha",         short: "R", tone: "e" },
];

const INITIAL_BLOCKS: UIBlock[] = [
  { id: 1, reason: "lunch",   reasonLabel: "Lunch break",    stylists: ["anjali"],         date: "2026-05-19", allDay: false, from: "13:00", to: "14:00", recurring: "daily",  note: "" },
  { id: 2, reason: "leave",   reasonLabel: "On leave",       stylists: ["pooja"],          date: "2026-05-20", dateTo: "2026-05-22", allDay: true, recurring: "once", note: "Cousin's wedding" },
  { id: 3, reason: "closed",  reasonLabel: "Salon closed",   stylists: ["all"],            date: "2026-05-25", allDay: true, recurring: "once", note: "Cleaning + AC maintenance" },
  { id: 4, reason: "lunch",   reasonLabel: "Lunch break",    stylists: ["pooja","kiran"],  date: "2026-05-19", allDay: false, from: "13:30", to: "14:30", recurring: "daily", note: "" },
  { id: 5, reason: "holiday", reasonLabel: "Public holiday", stylists: ["all"],            date: "2026-06-29", allDay: true, recurring: "once", note: "Bakrid" },
];

const formatDate = (key: string) => {
  if (!key) return "";
  const d = new Date(key + "T12:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};

// ===== BLOCK ROW COMPONENT =====
interface BlockRowProps {
  block: UIBlock;
  onEdit: (block: UIBlock) => void;
  onDelete: (id: string | number) => Promise<void>;
  stylists: UIStylist[];
}

function BlockRow({ block, onEdit, onDelete, stylists }: BlockRowProps) {
  const reason = REASONS.find(r => r.id === block.reason);
  const stylistNamesOf = (ids: string[]) => {
    if (ids.includes("all")) return "All stylists";
    return ids.map(id => stylists.find(s => s.id === id)?.name).filter(Boolean).join(" + ");
  };

  return (
    <div className="grid grid-cols-[44px_1fr_auto] gap-3.5 p-[14px_18px] items-center bg-white border border-line rounded-xl">
      <div className={`w-10 h-10 rounded-[10px] grid place-items-center shrink-0 ${
        reason?.tone === "amber" 
          ? "bg-amber-soft text-amber-ink" 
          : reason?.tone === "rose" 
            ? "bg-rose-soft text-rose" 
            : "bg-bg-2 text-ink-2"
      }`}>
        {reason && IBT[reason.icon as keyof typeof IBT]({})}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold tracking-[-0.005em] flex items-center gap-2 flex-wrap">
          {block.reasonLabel}
          {block.recurring === "daily" && <span className="badge neutral no-dot" style={{ fontSize: 10, padding: "2px 7px", marginLeft: 8 }}>DAILY</span>}
          {block.recurring === "weekly" && <span className="badge neutral no-dot" style={{ fontSize: 10, padding: "2px 7px", marginLeft: 8 }}>WEEKLY</span>}
        </div>
        <div className="text-xs text-ink-3 mt-1 leading-[1.5]">
          {formatDate(block.date)}
          {block.dateTo && block.dateTo !== block.date && <> – {formatDate(block.dateTo)}</>}
          {" · "}
          {block.allDay ? "All day" : `${block.from} – ${block.to}`}
          {" · "}
          <strong className="text-ink-2 font-medium">{stylistNamesOf(block.stylists)}</strong>
        </div>
        {block.note && <div className="text-xs text-ink-3 italic mt-1.5 pl-2.5 border-l-2 border-line-2">{"\""}{block.note}{"\""}</div>}
      </div>
      <div className="flex gap-6">
        <button className="cust-action wa" style={{ opacity: 1, background: "transparent", borderColor: "var(--line)" }} onClick={() => onEdit(block)}>
          <IBT.edit />
        </button>
        <button className="cust-action" style={{ opacity: 1, background: "transparent", borderColor: "var(--line)", color: "var(--rose)" }} onClick={() => onDelete(block.id)}>
          <IBT.trash />
        </button>
      </div>
    </div>
  );
}

// ===== CREATE/EDIT MODAL =====
interface BlockModalProps {
  block: UIBlock | null;
  onClose: () => void;
  onSave: (block: Omit<UIBlock, "id"> & { id?: string | number }) => Promise<void>;
  stylists: UIStylist[];
}

function BlockModal({ block, onClose, onSave, stylists: allStylists }: BlockModalProps) {
  const isEdit = !!block?.id;
  const [reason, setReason] = useState(block?.reason || "lunch");
  const [stylists, setStylists] = useState<string[]>(() => {
    if (block?.stylists) return block.stylists;
    return ["all"];
  });
  const [date, setDate] = useState(block?.date || new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(block?.dateTo || "");
  const [allDay, setAllDay] = useState(block?.allDay || false);
  const [from, setFrom] = useState(block?.from || "13:00");
  const [to, setTo] = useState(block?.to || "14:00");
  const [recurring, setRecurring] = useState<"once" | "daily" | "weekly">(block?.recurring || "once");
  const [note, setNote] = useState(block?.note || "");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  const toggleStylist = (id: string) => {
    if (id === "all") {
      setStylists(["all"]);
    } else {
      setStylists(prev => {
        const next = prev.includes(id)
          ? prev.filter(s => s !== id)
          : [...prev.filter(s => s !== "all"), id];
        return next.length === 0 ? ["all"] : next;
      });
    }
  };

  const submit = async () => {
    setSaving(true);
    const reasonObj = REASONS.find(r => r.id === reason);
    const reasonLabel = reason === "custom"
      ? (note.split("\n")[0] || "Custom block")
      : (reasonObj?.label || "Block");

    await onSave({
      id: block?.id,
      reason,
      reasonLabel,
      stylists,
      date,
      dateTo: dateTo || undefined,
      allDay,
      from: allDay ? undefined : from,
      to: allDay ? undefined : to,
      recurring,
      note,
    });
    setSaving(false);
  };

  const stylistsToDisplay = [
    { id: "all", name: "All stylists", short: "·", tone: "a" },
    ...allStylists
  ];

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: "min(540px, 100%)" }}>
        <div className="modal-head">
          <h3>{isEdit ? "Edit block" : "Block off time"}</h3>
          <button className="modal-close" onClick={onClose}><IBT.x /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
          {/* Reason */}
          <div className="field">
            <label>Reason</label>
            <div className="grid grid-cols-3 gap-1.5 max-[720px]:grid-cols-2">
              {REASONS.map(r => (
                <button
                  key={r.id}
                  className={`flex items-center gap-2 py-2.5 px-3 border rounded-[10px] font-inherit text-[13px] cursor-pointer transition-all duration-150 text-left ${
                    reason === r.id 
                      ? "border-teal bg-teal-soft text-teal-ink font-medium" 
                      : "border-line bg-white text-ink-2 hover:border-line-2"
                  }`}
                  onClick={() => setReason(r.id)}
                >
                  <span className={`w-6 h-6 rounded-md grid place-items-center shrink-0 ${
                    reason === r.id ? "bg-teal text-white" : "bg-bg-2 text-ink-2"
                  }`}>{IBT[r.icon as keyof typeof IBT]({})}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stylists */}
          <div className="field" style={{ marginTop: 16 }}>
            <label>{"Who's affected?"}</label>
            <div className="flex gap-1.5 flex-wrap">
              {stylistsToDisplay.map(s => {
                const on = stylists.includes(s.id);
                return (
                  <button
                    key={s.id}
                    className={`inline-flex items-center gap-2 py-2 px-3 border rounded-full font-inherit text-[13px] cursor-pointer transition-all duration-150 ${
                      on 
                        ? "border-teal bg-teal-soft text-teal-ink font-medium" 
                        : "border-line bg-white text-ink-2 hover:border-line-2"
                    }`}
                    onClick={() => toggleStylist(s.id)}
                  >
                    {s.id !== "all" && (
                      <span className={`avatar sm tone-${s.tone}`} style={{ width: 22, height: 22, fontSize: 10, border: 0 }}>{s.short}</span>
                    )}
                    {s.name}
                    {on && <IBT.check style={{ marginLeft: 6, color: "var(--teal)" }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div className="field-row" style={{ marginTop: 16 }}>
            <div className="field">
              <label>{dateTo ? "From date" : "Date"}</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label>To date <small style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional, for multi-day)</small></label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>

          {/* All day */}
          <label className="flex items-center gap-2.5 text-[13px] cursor-pointer mt-3.5">
            <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="accent-teal w-4 h-4 shrink-0" />
            <span>All day</span>
          </label>

          {/* Times */}
          {!allDay && (
            <div className="field-row" style={{ marginTop: 12 }}>
              <div className="field">
                <label>From</label>
                <select value={from} onChange={e => setFrom(e.target.value)}>
                  {TIME_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>To</label>
                <select value={to} onChange={e => setTo(e.target.value)}>
                  {TIME_OPTS.filter(t => t > from).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Recurring */}
          <div className="field" style={{ marginTop: 14 }}>
            <label>Repeat</label>
            <div className="toggle" style={{ width: "100%" }}>
              <button className={recurring === "once" ? "on" : ""} onClick={() => setRecurring("once")} style={{ flex: 1 }}>Once</button>
              <button className={recurring === "daily" ? "on" : ""} onClick={() => setRecurring("daily")} style={{ flex: 1 }}>Every day</button>
              <button className={recurring === "weekly" ? "on" : ""} onClick={() => setRecurring("weekly")} style={{ flex: 1 }}>Same day weekly</button>
            </div>
          </div>

          {/* Note */}
          <div className="field" style={{ marginTop: 14 }}>
            <label>Note <small style={{ color: "var(--ink-3)", fontWeight: 400 }}>(internal, for your records)</small></label>
            <textarea
              placeholder='e.g. "Wedding in the family — back Mon"'
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ minHeight: 60 }}
            />
          </div>

          {/* Notify customers? */}
          <label className="flex items-center gap-2.5 text-[13px] cursor-pointer mt-3 bg-wa-soft py-2.5 px-3.5 rounded-[10px] text-[#1f5a37]">
            <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="accent-teal w-4 h-4 shrink-0" />
            <IBT.wa style={{ color: "var(--wa)", flexShrink: 0 }} />
            <span style={{ fontSize: 13, lineHeight: 1.4 }}>Auto-WhatsApp customers if any existing bookings clash with this block (with a reschedule link)</span>
          </label>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : (
              <>
                <IBT.check /> {isEdit ? "Save changes" : "Block off this time"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN PAGE COMPONENT =====
export default function BlockTimePage() {
  const { salonId } = useProfile();
  const [blocks, setBlocks] = useState<UIBlock[]>([]);
  const [stylists, setStylists] = useState<UIStylist[]>([]);
  const [filter, setFilter] = useState<"upcoming" | "recurring" | "past" | "all">("upcoming");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UIBlock | null>(null);
  const { show: flashMsg } = useToast();
  const [loading, setLoading] = useState(true);

  // Load block items from Supabase
  const loadBlocks = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !salonId) {
      setBlocks(INITIAL_BLOCKS);
      setStylists(fallbackStylists);
      setLoading(false);
      return;
    }

    try {
      // Load stylists for the active salon
      const { data: stylistsData } = await supabase
        .from("stylists")
        .select("id, name, tone")
        .eq("salon_id", salonId)
        .eq("active", true);

      let loadedStylists = fallbackStylists;
      if (stylistsData && stylistsData.length > 0) {
        loadedStylists = (stylistsData as unknown as Array<{ id: string; name: string; tone: string | null }>).map((s) => ({
          id: s.id,
          name: s.name,
          short: s.name[0],
          tone: (s.tone || "tone-a").replace("tone-", ""),
        }));
      }
      setStylists(loadedStylists);

      // Load blocks for the active salon
      const { data: blocksData, error } = await supabase
        .from("blocks")
        .select(`
          id,
          reason,
          date_from,
          date_to,
          time_from,
          time_to,
          all_day,
          recurring,
          note,
          stylist_id
        `)
        .eq("salon_id", salonId)
        .order("date_from", { ascending: true });

      if (error) throw error;

      if (blocksData) {

        const mapped: UIBlock[] = (blocksData as unknown as DbBlockRow[]).map((row) => {
          let note = row.note || "";
          let rec: "once" | "daily" | "weekly" = "once";
          if (row.recurring) {
            if (note.startsWith("[weekly] ")) {
              rec = "weekly";
              note = note.slice(9);
            } else if (note.startsWith("[daily] ")) {
              rec = "daily";
              note = note.slice(8);
            } else {
              rec = "daily"; // default fallback
            }
          }

          const reasonObj = REASONS.find(r => r.id === row.reason);
          const reasonLabel = row.reason === "custom"
            ? (note.split("\n")[0] || "Custom block")
            : (reasonObj?.label || row.reason || "Block");

          return {
            id: row.id,
            reason: row.reason || "custom",
            reasonLabel,
            stylists: row.stylist_id ? [row.stylist_id] : ["all"],
            date: row.date_from,
            dateTo: row.date_to || undefined,
            allDay: row.all_day,
            from: row.time_from ? row.time_from.slice(0, 5) : undefined,
            to: row.time_to ? row.time_to.slice(0, 5) : undefined,
            recurring: rec,
            note,
          };
        });
        setBlocks(mapped);
      } else {
        setBlocks([]);
      }
    } catch (err) {
      console.error("Error loading blocks:", err);
      setBlocks(INITIAL_BLOCKS);
      setStylists(fallbackStylists);
    } finally {
      setLoading(false);
    }
  }, [salonId]);

  useEffect(() => {
    if (salonId) {
      queueMicrotask(() => {
        loadBlocks();
      });
    } else {
      // preview state or before auth loads
      const t = setTimeout(() => {
        if (!salonId) {
          setBlocks(INITIAL_BLOCKS);
          setStylists(fallbackStylists);
          setLoading(false);
        }
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [salonId, loadBlocks]);

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const sorted = [...blocks].sort((a, b) => a.date.localeCompare(b.date));
    if (filter === "upcoming") return sorted.filter(b => (b.dateTo || b.date) >= today);
    if (filter === "past")     return sorted.filter(b => (b.dateTo || b.date) < today);
    if (filter === "recurring")return sorted.filter(b => b.recurring !== "once");
    return sorted;
  }, [blocks, filter]);

  const counts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      upcoming:  blocks.filter(b => (b.dateTo || b.date) >= today).length,
      past:      blocks.filter(b => (b.dateTo || b.date) < today).length,
      recurring: blocks.filter(b => b.recurring !== "once").length,
    };
  }, [blocks]);

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (b: UIBlock) => {
    setEditing(b);
    setShowModal(true);
  };

  const remove = async (id: string | number) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !salonId || typeof id === "number") {
      setBlocks(prev => prev.filter(b => b.id !== id));
      flashMsg("Block removed");
      return;
    }

    try {
      const { error } = await supabase
        .from("blocks")
        .delete()
        .eq("id", id);

      if (error) throw error;
      flashMsg("Block removed");
      loadBlocks();
    } catch (err) {
      console.error("Error deleting block:", err);
      flashMsg("Failed to remove block");
    }
  };

  const save = async (b: Omit<UIBlock, "id"> & { id?: string | number }) => {
    const supabase = getSupabaseBrowserClient();
    const isEdit = !!b.id && typeof b.id === "string" && b.id.length > 10;

    if (!supabase || !salonId) {
      // Local fallback
      if (b.id) {
        setBlocks(prev => prev.map(x => x.id === b.id ? (b as UIBlock) : x));
        flashMsg("Block updated");
      } else {
        setBlocks(prev => [...prev, { ...b, id: Date.now() } as UIBlock]);
        flashMsg("Time blocked off");
      }
      setShowModal(false);
      return;
    }

    try {
      const noteToSave = b.recurring !== "once" ? `[${b.recurring}] ${b.note}` : b.note;

      if (isEdit) {
        // Edit existing row
        const stylistId = b.stylists[0] === "all" ? null : b.stylists[0];
        const { error } = await supabase
          .from("blocks")
          .update({
            stylist_id: stylistId,
            reason: b.reason,
            date_from: b.date,
            date_to: b.dateTo || null,
            time_from: b.allDay ? null : b.from || null,
            time_to: b.allDay ? null : b.to || null,
            all_day: b.allDay,
            recurring: b.recurring !== "once",
            note: noteToSave,
          })
          .eq("id", b.id);

        if (error) throw error;

        // If extra stylists were selected, we insert new rows for them
        if (b.stylists.length > 1 && b.stylists[0] !== "all") {
          const extraInserts = b.stylists.slice(1).map(sid => ({
            salon_id: salonId,
            stylist_id: sid,
            reason: b.reason,
            date_from: b.date,
            date_to: b.dateTo || null,
            time_from: b.allDay ? null : b.from || null,
            time_to: b.allDay ? null : b.to || null,
            all_day: b.allDay,
            recurring: b.recurring !== "once",
            note: noteToSave,
          }));
          await supabase.from("blocks").insert(extraInserts);
        }

        flashMsg("Block updated");
      } else {
        // Create new blocks
        if (b.stylists.includes("all")) {
          const { error } = await supabase
            .from("blocks")
            .insert({
              salon_id: salonId,
              stylist_id: null,
              reason: b.reason,
              date_from: b.date,
              date_to: b.dateTo || null,
              time_from: b.allDay ? null : b.from || null,
              time_to: b.allDay ? null : b.to || null,
              all_day: b.allDay,
              recurring: b.recurring !== "once",
              note: noteToSave,
            });

          if (error) throw error;
        } else {
          // Insert one row for each stylist
          const inserts = b.stylists.map(sid => ({
            salon_id: salonId,
            stylist_id: sid,
            reason: b.reason,
            date_from: b.date,
            date_to: b.dateTo || null,
            time_from: b.allDay ? null : b.from || null,
            time_to: b.allDay ? null : b.to || null,
            all_day: b.allDay,
            recurring: b.recurring !== "once",
            note: noteToSave,
          }));

          const { error } = await supabase.from("blocks").insert(inserts);
          if (error) throw error;
        }

        flashMsg("Time blocked off");
      }
      
      loadBlocks();
    } catch (err) {
      console.error("Error saving block:", err);
      flashMsg("Failed to save block");
    } finally {
      setShowModal(false);
    }
  };

  return (
    <div className="app">
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      <div className="app-top">
        <div className="app-top-inner">
          <div className="brand">
            <Link className="book-back" href="/dashboard/bookings" aria-label="Back" style={{ background: "transparent", display: "inline-grid", placeItems: "center", width: 36, height: 36 }}>
              <IBT.back />
            </Link>
            <span className="brand-text" style={{ marginLeft: 8 }}>Blocks &amp; closures</span>
          </div>
          <div className="greeting">
            <div className="h">Block off time</div>
            <div className="d">LUNCH BREAKS · LEAVES · HOLIDAYS · CLOSED DAYS</div>
          </div>
          <div className="top-actions">
            <button className="btn btn-primary" onClick={openCreate}>
              <IBT.plus /> Block time
            </button>
          </div>
        </div>
      </div>

      <main className="app-main" style={{ paddingBottom: 100 }}>
        {/* Filter pills */}
        <div className="flex gap-1.5 items-center mb-4.5 flex-wrap max-[720px]:overflow-x-auto max-[720px]:flex-nowrap max-[720px]:mx-[-16px] max-[720px]:mb-4 max-[720px]:px-4 [&::-webkit-scrollbar]:hidden">
          <button className={`h-[34px] px-3.5 rounded-full border inline-flex items-center gap-2 font-inherit text-[13px] cursor-pointer transition-all duration-150 hover:border-line-2 ${filter === "upcoming" ? "bg-ink border-ink text-white" : "bg-white border-line text-ink-2"}`} onClick={() => setFilter("upcoming")}>
            Upcoming <span className={`text-[11px] py-0.5 px-1.75 rounded-full font-mono font-medium ${filter === "upcoming" ? "bg-[rgba(255,255,255,0.18)] text-white" : "bg-bg-2 text-ink-3"}`}>{counts.upcoming}</span>
          </button>
          <button className={`h-[34px] px-3.5 rounded-full border inline-flex items-center gap-2 font-inherit text-[13px] cursor-pointer transition-all duration-150 hover:border-line-2 ${filter === "recurring" ? "bg-ink border-ink text-white" : "bg-white border-line text-ink-2"}`} onClick={() => setFilter("recurring")}>
            Recurring <span className={`text-[11px] py-0.5 px-1.75 rounded-full font-mono font-medium ${filter === "recurring" ? "bg-[rgba(255,255,255,0.18)] text-white" : "bg-bg-2 text-ink-3"}`}>{counts.recurring}</span>
          </button>
          <button className={`h-[34px] px-3.5 rounded-full border inline-flex items-center gap-2 font-inherit text-[13px] cursor-pointer transition-all duration-150 hover:border-line-2 ${filter === "past" ? "bg-ink border-ink text-white" : "bg-white border-line text-ink-2"}`} onClick={() => setFilter("past")}>
            Past <span className={`text-[11px] py-0.5 px-1.75 rounded-full font-mono font-medium ${filter === "past" ? "bg-[rgba(255,255,255,0.18)] text-white" : "bg-bg-2 text-ink-3"}`}>{counts.past}</span>
          </button>
          <button className={`h-[34px] px-3.5 rounded-full border inline-flex items-center gap-2 font-inherit text-[13px] cursor-pointer transition-all duration-150 hover:border-line-2 ${filter === "all" ? "bg-ink border-ink text-white" : "bg-white border-line text-ink-2"}`} onClick={() => setFilter("all")}>
            All <span className={`text-[11px] py-0.5 px-1.75 rounded-full font-mono font-medium ${filter === "all" ? "bg-[rgba(255,255,255,0.18)] text-white" : "bg-bg-2 text-ink-3"}`}>{blocks.length}</span>
          </button>
        </div>

        {/* Calendar preview card */}
        <div className="grid grid-cols-2 gap-6 bg-white border border-line rounded-[14px] p-5.5 mb-6 max-[720px]:grid-cols-1">
          <div className="flex flex-col justify-center">
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-3)" }}>HOW IT LOOKS ON YOUR CALENDAR</div>
            <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "6px 0 0", lineHeight: 1.5 }}>
              Blocked time appears as a striped, greyed-out block. Customers can never book over it.
            </p>
          </div>
          <div>
            <div className="grid grid-cols-[44px_1fr] gap-0 bg-bg border border-line rounded-lg overflow-hidden">
              <div className="p-2 text-right font-mono text-[10px] text-ink-3 border-r border-line first:border-t-0">13:00</div>
              <div className="p-1 min-h-[28px] flex items-center">
                <div className="w-full py-1 px-2 rounded bg-blue-soft text-blue border-l-[3px] border-blue text-[11px] font-semibold">Priya · Haircut</div>
              </div>
              <div className="p-2 text-right font-mono text-[10px] text-ink-3 border-t border-r border-line">13:30</div>
              <div className="p-1 border-t border-line min-h-[28px] flex items-center">
                <div className="w-full py-1 px-2 rounded text-ink-3 text-[11px] font-medium flex items-center gap-1.5 border-l-[3px] border-ink-3" style={{ backgroundImage: "repeating-linear-gradient(-45deg, var(--bg-2), var(--bg-2) 5px, var(--bg) 5px, var(--bg) 10px)" }}>
                  <IBT.coffee /> Lunch break — Anjali
                </div>
              </div>
              <div className="p-2 text-right font-mono text-[10px] text-ink-3 border-t border-r border-line">14:00</div>
              <div className="p-1 border-t border-line min-h-[28px] flex items-center"></div>
              <div className="p-2 text-right font-mono text-[10px] text-ink-3 border-t border-r border-line">14:30</div>
              <div className="p-1 border-t border-line min-h-[28px] flex items-center">
                <div className="w-full py-1 px-2 rounded bg-blue-soft text-blue border-l-[3px] border-blue text-[11px] font-semibold">Sneha · Threading</div>
              </div>
            </div>
          </div>
        </div>

        {/* List Header */}
        <div className="flex items-center justify-between px-1 pb-2.5 gap-3 max-[720px]:flex-col max-[720px]:items-start max-[720px]:gap-2 mt-[18px]">
          <div className="text-[13px] text-ink font-medium">
            {filtered.length} {filter} block{filtered.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Blocks List */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <div style={{ width: 24, height: 24, border: "3px solid var(--line)", borderTopColor: "var(--teal)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex gap-3.5 items-start p-8 bg-white border border-line rounded-xl mt-2">
            <div className="w-11 h-11 rounded-xl bg-bg-2 grid place-items-center shrink-0">
              <IBT.cal style={{ width: 24, height: 24, color: "var(--ink-3)" }} />
            </div>
            <div>
              <strong>No {filter} blocks</strong>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>
                Block off lunch breaks, leaves, or salon-closed days to keep your calendar honest.
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={openCreate}>
                <IBT.plus /> Block off time
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(b => (
              <BlockRow key={b.id} block={b} onEdit={openEdit} onDelete={remove} stylists={stylists} />
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <BlockModal
          block={editing}
          onClose={() => setShowModal(false)}
          onSave={save}
          stylists={stylists}
        />
      )}


    </div>
  );
}
