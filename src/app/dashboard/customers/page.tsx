"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Icons as I, PhoneInput, Modal, FormField } from "@/components/ui";
import Header from "@/components/layout/Header";
import { useProfile } from "@/context/ProfileContext";
import { useToast } from "@/context/ToastContext";
import { initialsOf } from "@/lib/utils";


import { Customer, DbCustomerRow, DbCustomerBooking } from "@/types";

const engagementOf = (days: number) => days <= 30 ? "active" : days <= 60 ? "cooling" : "lost";

const formatLast = (days: number) => {
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} wk${days >= 14 ? "s" : ""} ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo${days >= 60 ? "s" : ""} ago`;
  return `${Math.floor(days / 365)} yr ago`;
};

import { SORT_OPTIONS, FILTER_TABS } from "@/constants/customers";

// ===== EXPORT COMPONENT =====
export default function CustomersPage() {
  const { profile, salonId, loading: profileLoading } = useProfile();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState<string | number | null>(null);
  const { show: showFlash } = useToast();
  const [sortOpen, setSortOpen] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [showCreateCust, setShowCreateCust] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profileLoading) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase || !salonId) {
      queueMicrotask(() => {
        setLoadingCustomers(false);
      });
      return;
    }

    const loadCustomersData = async () => {
      setLoadingCustomers(true);
      try {


        // Fetch customers + all bookings with services in parallel
        const [{ data: custData }, { data: bkData }] = await Promise.all([
          supabase.from("customers").select("id, name, phone, pref_stylist_id, member_since, created_at, stylists:pref_stylist_id(name)").eq("salon_id", salonId),
          supabase.from("bookings").select("id, customer_id, status, date, amount_paid, bill_total, booking_services(price_at_booking, qty, service:services(name)), stylist:stylists(name)").eq("salon_id", salonId),
        ]);

        if (!custData || custData.length === 0) {
          queueMicrotask(() => {
            setLoadingCustomers(false);
          });
          return;
        }

        const today = new Date(); today.setHours(0,0,0,0);
        const tones = ["a","b","c","d","e","f"];

        const mapped: Customer[] = (custData as unknown as DbCustomerRow[]).map((c, idx: number) => {
          const custBks = (bkData as unknown as DbCustomerBooking[] || []).filter((b) => b.customer_id === c.id);
          const paidBks = custBks.filter((b) => ["Completed","Paid"].includes(b.status));
          const visits = paidBks.length;
          const spend = paidBks.reduce((sum: number, b) => {
            const bkTotal = (b.booking_services || []).reduce((s: number, bs) => s + (Number(bs.price_at_booking) * (bs.qty || 1)), 0);
            return sum + Number(b.amount_paid || (b.status === "Paid" ? b.bill_total || bkTotal : 0));
          }, 0);

          // Days since last booking
          const completedDates = paidBks.map((b) => new Date(b.date).getTime()).filter(Boolean);
          const lastMs = completedDates.length > 0 ? Math.max(...completedDates) : null;
          const lastDaysBaseline = lastMs ? Math.round((today.getTime() - lastMs) / 86400000) : 999;

          const hasUpcoming = custBks.some(b => {
            const bkDate = new Date(b.date);
            const bkDateZero = new Date(bkDate);
            bkDateZero.setHours(0, 0, 0, 0);
            return bkDateZero >= today && ["Pending", "Confirmed", "Arrived", "In Service"].includes(b.status);
          });

          const lastDays = hasUpcoming ? 0 : lastDaysBaseline;

          // Favourite service by frequency
          const svcCount: Record<string, number> = {};
          custBks.forEach((b) => (b.booking_services || []).forEach((bs) => { const sn = bs.service?.name; if (sn) svcCount[sn] = (svcCount[sn] || 0) + 1; }));
          const fav = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

          // Preferred stylist from most recent booking
          const sortedBks = [...custBks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const stylist = sortedBks[0]?.stylist?.name || c.stylists?.name || "—";

          return {
            id: c.id,
            name: c.name,
            tone: tones[idx % tones.length],
            phone: c.phone || "",
            visits,
            lastDays,
            spend,
            fav,
            stylist,
          };
        });

        setCustomers(mapped);
      } catch (err) {
        console.error("Error loading customers:", err);
      } finally {
        setLoadingCustomers(false);
      }
    };

    loadCustomersData();
  }, [profileLoading, salonId]);

  // Engagement Counts (from live or mock customers)
  const counts = useMemo(() => {
    const out = { all: customers.length, active: 0, cooling: 0, lost: 0 };
    customers.forEach(c => {
      const eng = engagementOf(c.lastDays ?? 999);
      if (eng === "active") out.active++;
      else if (eng === "cooling") out.cooling++;
      else if (eng === "lost") out.lost++;
    });
    return out;
  }, [customers]);

  // Filtered + sorted customers
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const activeFilter = (c: Customer) => {
      if (tab === "all") return true;
      return engagementOf(c.lastDays ?? 999) === tab;
    };
    let list = customers.filter(activeFilter);

    if (query) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.fav && c.fav.toLowerCase().includes(query)) ||
        (c.stylist && c.stylist.toLowerCase().includes(query))
      );
    }

    const sorted = [...list];
    if (sort === "recent") sorted.sort((a, b) => (a.lastDays ?? 999) - (b.lastDays ?? 999));
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "visits") sorted.sort((a, b) => (b.visits ?? 0) - (a.visits ?? 0));
    else if (sort === "spend") sorted.sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0));
    else if (sort === "lost") sorted.sort((a, b) => (b.lastDays ?? 999) - (a.lastDays ?? 999));

    return sorted;
  }, [q, tab, sort, customers]);

  const onSelect = (c: Customer) => {
    setSelected(c.id);
    showFlash(`Opening ${c.name}'s profile…`, 350);
    setTimeout(() => {
      router.push(`/dashboard/customers/${c.id}`);
    }, 350);
  };

  const onMessage = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    showFlash(`Opening WhatsApp chat for ${c.name}...`, 800);
    const displaySalonName = profile.salonName.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const waText = `Hi ${c.name}, this is ${displaySalonName}. Just checking in! We look forward to seeing you soon.`;
    const cleanPhone = c.phone.replace(/[^0-9+]/g, "");
    setTimeout(() => {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`, "_blank");
    }, 800);
  };

  // Close sort menu on click outside
  useEffect(() => {
    if (!sortOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest(".sort-menu")) {
        setSortOpen(false);
      }
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [sortOpen]);

  const currentSort = SORT_OPTIONS.find(s => s.id === sort) || SORT_OPTIONS[0];

  const duplicateCustomer = useMemo(() => {
    if (!newCustPhone.trim()) return null;
    const cleanInput = newCustPhone.replace(/\D/g, "").replace(/^91/, "");
    if (!cleanInput) return null;
    return customers.find(c => {
      if (!c.phone) return false;
      return c.phone.replace(/\D/g, "").replace(/^91/, "") === cleanInput;
    });
  }, [newCustPhone, customers]);

  return (
    <div className="min-h-screen pb-[calc(var(--bottom-nav-h)+32px)] animate-[fadeIn_0.22s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      <Header
        title="Customers"
        subtitle={`${customers.length} TOTAL · ₹${(customers.reduce((s, c) => s + (c.spend ?? 0), 0) / 100000).toFixed(1)}L LIFETIME`}
        actions={
          <button
            className="icon-btn"
            onClick={() => showFlash("Downloading customer list...")}
          >
            <I.download />
          </button>
        }
      />

      {/* App Main */}
      <main className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-7 pb-24">
        {/* Search bar */}
        <div className="flex items-center gap-2.5 bg-white border border-line-2 rounded-[var(--radius)] px-3.5 py-2.5 mb-4">
          <I.search />
          <input
            placeholder="Search by name, phone, service or stylist…"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="flex-1 border-0 outline-0 text-[var(--t-body)] font-sans"
          />
          {q && (
            <button className="border-0 bg-transparent cursor-pointer grid place-items-center" onClick={() => setQ("")}>
              <I.x />
            </button>
          )}
          <span className="text-[10px] bg-bg-2 px-1.5 py-0.5 rounded text-ink-3 font-mono">⌘ K</span>
        </div>

        {/* Engagement tabs & Sort */}
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center justify-between pb-1.5 mb-4">
          {/* Tabs - horizontal scrolling on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTER_TABS.map(f => (
              <button
                key={f.id}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-sm border text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all duration-150 ${
                  tab === f.id 
                    ? "border-teal bg-teal-soft text-teal" 
                    : "border-line bg-white text-ink-2 hover:border-line-2"
                }`}
                onClick={() => setTab(f.id)}
              >
                {f.id !== "all" && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      f.id === "active" ? "bg-green" : f.id === "cooling" ? "bg-amber" : "bg-rose"
                    }`}
                  />
                )}
                {f.label}
                <span className="text-[11px] text-ink-3 ml-0.5">{counts[f.id as keyof typeof counts]}</span>
              </button>
            ))}
          </div>

          {/* Sort & Add Customer */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
            {/* Sort Menu Component */}
            <div className="sort-menu relative">
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-sm border border-line bg-white text-[13px] font-medium text-ink cursor-pointer whitespace-nowrap"
                onClick={() => setSortOpen(!sortOpen)}
              >
                <I.sort />
                <span className="text-ink-3">Sort:</span>
                <span>{currentSort.label}</span>
                <I.chev className="text-ink-3" />
              </button>
              {sortOpen && (
                <div className="absolute top-full right-0 mt-1.5 bg-white border border-line rounded-[var(--radius)] shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] z-50 min-w-[180px] overflow-hidden">
                  {SORT_OPTIONS.map(s => (
                    <button
                      key={s.id}
                      className={`flex items-center justify-between w-full px-3.5 py-2.5 border-0 text-[13px] text-left cursor-pointer ${
                        sort === s.id ? "bg-teal-soft text-teal" : "bg-transparent text-ink"
                      }`}
                      onClick={() => {
                        setSort(s.id);
                        setSortOpen(false);
                      }}
                    >
                      {s.label}
                      {sort === s.id && <span className="text-teal">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add customer button */}
            <button
              onClick={() => setShowCreateCust(true)}
              className="h-[34px] rounded-[10px] border border-line-2 bg-teal text-white inline-flex items-center gap-1.5 px-3 cursor-pointer flex-shrink-0 hover:bg-[var(--teal-ink)] transition-all duration-150 text-[13px] font-medium"
            >
              <I.plus />
              Add Customer
            </button>
          </div>
        </div>

        {/* Result Head / Winback Broadcast */}
        <div className="flex items-center justify-between pb-2.5 px-1 gap-3 max-[720px]:flex-col max-[720px]:items-start max-[720px]:gap-2 mb-3 text-[13px] text-ink-3">
          <div>
            {filtered.length} {filtered.length === 1 ? "customer" : "customers"}
            {q && <span> matching &quot;{q}&quot;</span>}
          </div>
          {tab === "cooling" && filtered.length > 0 && (
            <button
              className="btn btn-sm !bg-teal !text-white h-[30px] text-[12px] rounded-[8px] px-2.5 inline-flex items-center gap-1.5 border-0 cursor-pointer"
              onClick={() => showFlash("Win-back WhatsApp broadcast prepared!")}
            >
              <I.wa /> Win back all {filtered.length} →
            </button>
          )}
          {tab === "lost" && filtered.length > 0 && (
            <button
              className="btn btn-sm !bg-rose !text-white h-[30px] text-[12px] rounded-[8px] px-2.5 inline-flex items-center gap-1.5 border-0 cursor-pointer"
              onClick={() => showFlash("Last-chance offer broadcast prepared!")}
            >
              <I.wa /> Last-chance offer to {filtered.length}
            </button>
          )}
        </div>

        {/* Customer List */}
        {loadingCustomers ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="pulse h-[72px] bg-bg-2 rounded-[var(--radius)] border border-line" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 px-6 text-center bg-white border border-line rounded-xl flex flex-col items-center justify-center gap-3">
            <div className="w-11 h-11 rounded-full bg-bg-2 grid place-items-center">
              <I.search className="text-ink-3" />
            </div>
            <div>
              <strong className="block text-[15px] font-semibold">No customers match search</strong>
              <span className="text-[13px] text-ink-3 mt-1">
                {q ? "Try searching by phone or service." : "Select another engagement filter."}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map(c => {
              const eng = engagementOf(c.lastDays ?? 999);
              return (
                <div
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className={`flex items-center p-3.5 bg-white border cursor-pointer rounded-[var(--radius)] transition-all duration-200 ${
                    selected === c.id ? "border-teal" : "border-line"
                  }`}
                >
                  {/* Status Indicator */}
                  <span
                    className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${
                      eng === "active" ? "bg-green" : eng === "cooling" ? "bg-amber" : "bg-rose"
                    }`}
                  />

                  {/* Avatar */}
                  <div
                    className={`avatar md tone-${c.tone} w-10 h-10 rounded-full mr-3 grid place-items-center font-semibold text-[14px] flex-shrink-0 ${
                      c.tone === "a" ? "bg-teal-soft text-teal" :
                      c.tone === "b" ? "bg-amber-soft text-amber-ink" :
                      c.tone === "c" ? "bg-blue-soft text-blue" :
                      c.tone === "d" ? "bg-green-soft text-green" :
                      c.tone === "e" ? "bg-rose-soft text-rose" :
                      "bg-bg-2 text-ink-2"
                    }`}
                  >
                    {initialsOf(c.name)}
                  </div>

                  {/* Name and Meta */}
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="font-semibold text-[15px] text-ink truncate">
                      {c.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-ink-3 mt-0.5">
                      <span>{c.phone}</span>
                      <span>·</span>
                      <span>Seen {formatLast(c.lastDays ?? 999)}</span>
                    </div>
                  </div>

                  {/* Stats - Hidden on mobile */}
                  <div className="hidden md:block text-right mr-4 flex-shrink-0">
                    <div className="text-[13px] font-semibold text-ink-2">{c.visits ?? 0} visits</div>
                    <div className="text-[11px] text-ink-3 mt-0.5">Likes {c.fav ?? "—"}</div>
                  </div>

                  {/* Spend */}
                  <div className="text-right mr-3 sm:mr-4 flex-shrink-0">
                    <div className="text-[14px] font-semibold text-teal">₹{(c.spend ?? 0).toLocaleString("en-IN")}</div>
                    <div className="text-[10px] text-ink-3 uppercase tracking-[0.02em] mt-0.5 block md:hidden">
                      {c.visits ?? 0} visit{c.visits === 1 ? "" : "s"}
                    </div>
                    <div className="text-[10px] text-ink-3 uppercase tracking-[0.02em] mt-0.5 hidden md:block">
                      Lifetime
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => onMessage(c, e)}
                      className="w-8 h-8 rounded-[8px] border-0 bg-wa-soft text-wa grid place-items-center cursor-pointer"
                      aria-label="WhatsApp"
                    >
                      <I.wa />
                    </button>
                    <I.chev className="text-ink-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Customer Modal */}
      <Modal
        isOpen={showCreateCust}
        onClose={() => setShowCreateCust(false)}
        title="Add new customer"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowCreateCust(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={!newCustName.trim() || saving || !!duplicateCustomer || (newCustPhone.length > 0 && newCustPhone.length !== 10)}
              style={{ opacity: !newCustName.trim() || saving || !!duplicateCustomer || (newCustPhone.length > 0 && newCustPhone.length !== 10) ? 0.5 : 1 }}
              onClick={async () => {
                if (!newCustName.trim()) return;
                if (newCustPhone.length > 0 && newCustPhone.length !== 10) return;
                setSaving(true);
                const supabase = getSupabaseBrowserClient();
                if (supabase && salonId) {
                  try {
                    const phoneFormatted = newCustPhone && newCustPhone.trim()
                      ? `+91${newCustPhone.replace(/\D/g, "")}`
                      : null;

                    const { data: newCust, error } = await supabase
                      .from("customers")
                      .insert({
                        salon_id: salonId,
                        name: newCustName.trim(),
                        phone: phoneFormatted,
                      })
                      .select("id, name, phone, created_at")
                      .single();

                    if (error) throw error;

                    if (newCust) {
                      const tone = ["a", "b", "c", "d", "e", "f"][Math.floor(Math.random() * 6)];
                      const newEntry: Customer = {
                        id: newCust.id,
                        name: newCust.name,
                        phone: newCust.phone || "",
                        tone,
                        visits: 0,
                        lastDays: 0,
                        spend: 0,
                        fav: "—",
                        stylist: "—",
                      };
                      setCustomers(prev => [newEntry, ...prev]);
                      showFlash("Customer added!", 1800);
                    }
                  } catch (err) {
                    const errMsg = err instanceof Error ? err.message : "Failed to add customer";
                    showFlash(`Error: ${errMsg}`, 3000);
                  }
                } else {
                  showFlash("Customer added (local preview)", 1800);
                  const tone = ["a", "b", "c", "d", "e", "f"][Math.floor(Math.random() * 6)];
                  const newEntry: Customer = {
                    id: Date.now(),
                    name: newCustName.trim(),
                    phone: newCustPhone ? `+91${newCustPhone.replace(/\D/g, "")}` : "",
                    tone,
                    visits: 0,
                    lastDays: 0,
                    spend: 0,
                    fav: "—",
                    stylist: "—",
                  };
                  setCustomers(prev => [newEntry, ...prev]);
                }
                setNewCustName("");
                setNewCustPhone("");
                setShowCreateCust(false);
                setSaving(false);
              }}
            >
              {saving ? "Saving..." : "Add customer"}
            </button>
          </>
        }
      >
        <FormField label="Customer name">
          <input
            placeholder="e.g. Priya Sharma"
            value={newCustName}
            onChange={e => setNewCustName(e.target.value)}
            autoFocus
            className="p-2.5 border border-line-2 rounded-[8px] outline-0 text-[14px] w-full"
          />
        </FormField>
        <FormField label="Phone number" className="mt-3">
          <PhoneInput
            value={newCustPhone}
            onChange={setNewCustPhone}
          />
        </FormField>

        {duplicateCustomer && (
          <div className="mt-3.5 p-3 rounded-[10px] bg-amber-soft border border-amber text-ink text-[13px]">
            <div className="flex items-center gap-1.5 font-semibold text-amber-ink">
              ⚠️ Phone number already in use
            </div>
            <p className="m-0 mt-1.5 text-[13px] text-ink-2 leading-relaxed">
              This number is already linked to <strong>{duplicateCustomer.name}</strong>. You cannot create a duplicate customer profile with this number.
            </p>
            <div className="flex gap-2.5 mt-2.5">
              <button
                type="button"
                className="btn btn-sm !bg-teal !text-white h-7 text-xs px-2.5 rounded-md cursor-pointer border-0"
                onClick={() => {
                  setShowCreateCust(false);
                  router.push(`/dashboard/customers/${duplicateCustomer.id}`);
                }}
              >
                View {duplicateCustomer.name}
              </button>
            </div>
          </div>
        )}
      </Modal>


    </div>
  );
}
