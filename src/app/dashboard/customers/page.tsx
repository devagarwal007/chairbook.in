"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Icons as I, PhoneInput, Modal, FormField } from "@/components/ui";
import Header from "@/components/layout/Header";
import { useProfile } from "@/context/ProfileContext";
import { useToast } from "@/context/ToastContext";
import { initialsOf } from "@/lib/utils";
import { buildCustomerSearchFilter } from "@/lib/customer-list";
import { paginationRange, useDebouncedValue, usePagination } from "@/hooks";


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

const formatPhone = (phone: string) => {
  if (!phone) return "";
  if (phone.toLowerCase().includes("x")) return phone;
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 12 && clean.startsWith("91")) {
    const mobile = clean.slice(2);
    return `+91 ${mobile.slice(0, 2)}xxx ${mobile.slice(5)}`;
  }
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 2)}xxx ${clean.slice(5)}`;
  }
  if (clean.length > 10) {
    const mobile = clean.slice(-10);
    return `+91 ${mobile.slice(0, 2)}xxx ${mobile.slice(5)}`;
  }
  return phone;
};

import { SORT_OPTIONS, FILTER_TABS } from "@/constants/customers";

const CUSTOMER_PAGE_SIZE = 20;
const CUSTOMER_SELECT = "id, name, phone, pref_stylist_id, member_since, created_at, stylists:pref_stylist_id(name)";

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
  const debouncedQ = useDebouncedValue(q, 300);
  const {
    page,
    pageSize,
    total: customerTotal,
    pageCount,
    loading: loadingCustomers,
    setTotal: setCustomerTotal,
    setLoading: setLoadingCustomers,
    resetPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination(CUSTOMER_PAGE_SIZE);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateCust, setShowCreateCust] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profileLoading) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase || !salonId) {
      queueMicrotask(() => {
        setCustomers([]);
        setCustomerTotal(0);
        setLoadingCustomers(false);
      });
      return;
    }

    let cancelled = false;

    const loadCustomersData = async () => {
      setLoadingCustomers(true);
      try {
        const { from, to } = paginationRange(page, pageSize);
        const searchFilter = buildCustomerSearchFilter(debouncedQ);

        let customerQuery = supabase
          .from("customers")
          .select(CUSTOMER_SELECT, { count: "exact" })
          .eq("salon_id", salonId);

        if (searchFilter) {
          customerQuery = customerQuery.or(searchFilter);
        }

        customerQuery = sort === "name"
          ? customerQuery.order("name", { ascending: true })
          : customerQuery.order("created_at", { ascending: false });

        const { data: custData, count, error: custError } = await customerQuery.range(from, to);
        if (cancelled) return;
        if (custError) throw custError;

        const customerRows = (custData || []) as unknown as DbCustomerRow[];
        setCustomerTotal(count || 0);

        if (customerRows.length === 0) {
          setCustomers([]);
          return;
        }

        const customerIds = customerRows.map((c) => c.id);
        let bkData: DbCustomerBooking[] = [];

        if (customerIds.length > 0) {
          const { data: bookingsData, error: bookingsError } = await supabase
            .from("bookings")
            .select("id, customer_id, status, date, amount_paid, bill_total, booking_services(price_at_booking, qty, service:services(name)), stylist:stylists(name)")
            .eq("salon_id", salonId)
            .in("customer_id", customerIds)
            .order("date", { ascending: false });

          if (cancelled) return;
          if (bookingsError) throw bookingsError;
          bkData = (bookingsData || []) as unknown as DbCustomerBooking[];
        }

        const today = new Date(); today.setHours(0,0,0,0);
        const tones = ["a","b","c","d","e","f"];

        const mapped: Customer[] = customerRows.map((c, idx: number) => {
          const custBks = bkData.filter((b) => b.customer_id === c.id);
          const paidBks = custBks.filter((b) => ["Completed","Paid"].includes(b.status));
          const visits = paidBks.length;
          const spend = paidBks.reduce((sum: number, b) => {
            const bkTotal = (b.booking_services || []).reduce((s: number, bs) => s + (Number(bs.price_at_booking) * (bs.qty || 1)), 0);
            return sum + Number(b.amount_paid || (b.status === "Paid" ? b.bill_total || bkTotal : 0));
          }, 0);

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

          const svcCount: Record<string, number> = {};
          custBks.forEach((b) => (b.booking_services || []).forEach((bs) => { const sn = bs.service?.name; if (sn) svcCount[sn] = (svcCount[sn] || 0) + 1; }));
          const fav = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

          const sortedBks = [...custBks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const stylist = sortedBks[0]?.stylist?.name || c.stylists?.name || "—";

          return {
            id: c.id,
            name: c.name,
            tone: tones[(from + idx) % tones.length],
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
        if (!cancelled) {
          console.error("Error loading customers:", err);
          setCustomers([]);
          setCustomerTotal(0);
        }
      } finally {
        if (!cancelled) setLoadingCustomers(false);
      }
    };

    void loadCustomersData();

    return () => {
      cancelled = true;
    };
  }, [debouncedQ, page, pageSize, profileLoading, refreshKey, salonId, setCustomerTotal, setLoadingCustomers, sort]);

  // Engagement Counts (from live or mock customers)
  const counts = useMemo(() => {
    const out = { all: customerTotal, active: 0, cooling: 0, lost: 0 };
    customers.forEach(c => {
      const eng = engagementOf(c.lastDays ?? 999);
      if (eng === "active") out.active++;
      else if (eng === "cooling") out.cooling++;
      else if (eng === "lost") out.lost++;
    });
    return out;
  }, [customerTotal, customers]);

  // Filtered + sorted customers
  const filtered = useMemo(() => {
    const activeFilter = (c: Customer) => {
      if (tab === "all") return true;
      return engagementOf(c.lastDays ?? 999) === tab;
    };
    const list = customers.filter(activeFilter);

    const sorted = [...list];
    if (sort === "recent") sorted.sort((a, b) => (a.lastDays ?? 999) - (b.lastDays ?? 999));
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "visits") sorted.sort((a, b) => (b.visits ?? 0) - (a.visits ?? 0));
    else if (sort === "spend") sorted.sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0));
    else if (sort === "lost") sorted.sort((a, b) => (b.lastDays ?? 999) - (a.lastDays ?? 999));

    return sorted;
  }, [tab, sort, customers]);

  const pageSpend = useMemo(() => customers.reduce((s, c) => s + (c.spend ?? 0), 0), [customers]);
  const computedSortAppliesToPage = sort !== "name";
  const showingStart = customerTotal === 0 ? 0 : ((page - 1) * pageSize) + 1;
  const showingEnd = customerTotal === 0 ? 0 : Math.min(customerTotal, ((page - 1) * pageSize) + customers.length);

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
        subtitle={`${customerTotal} TOTAL · ₹${(pageSpend / 100000).toFixed(1)}L THIS PAGE`}
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
        <div className="flex items-center gap-2.5 bg-white border border-line rounded-[12px] px-3.5 h-12 transition-colors duration-150 focus-within:border-teal mb-[18px]">
          <I.search className="text-ink-3" />
          <input
            placeholder="Search by name or phone…"
            value={q}
            onChange={e => {
              setQ(e.target.value);
              resetPage();
            }}
            className="flex-1 h-full border-0 outline-0 text-[14px] text-ink placeholder:text-ink-4 font-sans"
          />
          {q && (
            <button className="border-0 bg-transparent cursor-pointer grid place-items-center" onClick={() => {
              setQ("");
              resetPage();
            }}>
              <I.x />
            </button>
          )}
          <span className="text-[10px] text-ink-3 bg-bg-2 px-1.5 py-0.5 rounded border border-line font-mono max-[720px]:hidden">⌘ K</span>
        </div>

        {/* Engagement tabs & Sort */}
        <div className="flex gap-[6px] items-center flex-wrap mb-[18px]">
          {FILTER_TABS.map(f => (
            <button
              key={f.id}
              className={`h-[34px] px-3.5 rounded-full border inline-flex items-center gap-2 font-sans text-[13px] cursor-pointer transition-colors duration-150 ${
                tab === f.id 
                  ? "bg-ink border-ink text-white hover:border-ink" 
                  : "border-line bg-white text-ink-2 hover:border-line-2"
              }`}
              onClick={() => {
                setTab(f.id);
                resetPage();
              }}
            >
              {f.id !== "all" && (
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    f.id === "active" ? "bg-[#2DA76C]" : f.id === "cooling" ? "bg-amber" : "bg-rose"
                  }`}
                />
              )}
              {f.label}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono font-medium ml-0.5 transition-colors duration-150 ${
                tab === f.id
                  ? "bg-[rgba(255,255,255,0.18)] text-white"
                  : "bg-bg-2 text-ink-3"
              }`}>
                {counts[f.id as keyof typeof counts]}
              </span>
            </button>
          ))}
          <div className="flex-1"></div>

          {/* Sort Menu Component */}
          <div className="sort-menu relative">
            <button
              className="h-8 px-3 rounded-full border border-line-2 bg-white inline-flex items-center gap-2 text-[13px] text-ink-2 cursor-pointer hover:border-ink-3 transition-colors duration-150"
              onClick={() => setSortOpen(!sortOpen)}
            >
              <I.sort style={{ width: 14, height: 14 }} />
              <span className="text-ink-3">Sort:</span>
              <span>{currentSort.label}</span>
              <I.chev className="text-ink-3" style={{ width: 14, height: 14 }} />
            </button>
            {sortOpen && (
              <div className="absolute top-full right-0 mt-1.5 bg-white border border-line rounded-[12px] shadow-[0_16px_36px_-16px_rgba(14,21,18,0.18)] z-50 min-w-[220px] p-1.5 overflow-hidden">
                {SORT_OPTIONS.map(s => (
                  <button
                    key={s.id}
                    className={`flex items-center justify-between w-full px-3 py-2 border-0 text-[13px] text-left cursor-pointer rounded-lg hover:bg-bg-2 hover:text-ink ${
                      sort === s.id ? "bg-teal-soft text-teal font-medium" : "bg-transparent text-ink-2"
                    }`}
                    onClick={() => {
                      setSort(s.id);
                      setSortOpen(false);
                    }}
                  >
                    {s.label}
                    {sort === s.id && <span className="text-teal font-semibold">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add customer button */}
          <button
            onClick={() => setShowCreateCust(true)}
            className="h-[34px] rounded-full bg-teal text-white inline-flex items-center gap-1.5 px-3.5 cursor-pointer flex-shrink-0 hover:bg-teal-ink hover:-translate-y-0.5 transition-all duration-150 text-[13px] font-medium"
          >
            <I.plus style={{ width: 14, height: 14 }} />
            Add Customer
          </button>
        </div>

        {/* Result Head / Winback Broadcast */}
        <div className="flex items-center justify-between pb-2.5 px-1 gap-3 max-[720px]:flex-col max-[720px]:items-start max-[720px]:gap-2 mb-2 text-[13px] text-ink font-medium">
          <div>
            {filtered.length} {filtered.length === 1 ? "customer" : "customers"} on this page
            {customerTotal > 0 && <span className="text-ink-3 font-normal"> · {customerTotal} total</span>}
            {q && <span className="text-ink-3 font-normal"> matching &quot;{q}&quot;</span>}
            {tab !== "all" && <span className="text-ink-3 font-normal"> · {FILTER_TABS.find(f => f.id === tab)?.label?.toLowerCase()}</span>}
            {computedSortAppliesToPage && <span className="text-ink-3 font-normal"> · sorting applies to loaded data</span>}
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
                {q ? "Try another name or phone." : "Select another engagement filter."}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-line rounded-[12px] overflow-hidden">
            {filtered.map(c => {
              const eng = engagementOf(c.lastDays ?? 999);
              return (
                <div
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className={`grid grid-cols-[12px_40px_1fr_auto_auto_auto] max-[720px]:grid-cols-[10px_36px_1fr_auto] gap-4 max-[720px]:gap-3 p-4 max-[720px]:py-3 max-[720px]:px-3.5 items-center border-b border-line last:border-b-0 cursor-pointer relative transition-colors duration-150 hover:bg-[#FCFCFA] group ${
                    selected === c.id ? "bg-teal-soft before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-teal" : ""
                  }`}
                >
                  {/* Status Indicator */}
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      eng === "active" ? "bg-[#2DA76C]" : eng === "cooling" ? "bg-amber" : "bg-rose"
                    }`}
                  />

                  {/* Avatar */}
                  <div
                    className={`avatar md tone-${c.tone} w-10 h-10 max-[720px]:w-9 max-[720px]:h-9 rounded-full grid place-items-center font-semibold text-[14px] max-[720px]:text-xs flex-shrink-0 ${
                      c.tone === "a" ? "bg-[#F1EAD9] text-[#8C6A1E]" :
                      c.tone === "b" ? "bg-teal-soft text-teal" :
                      c.tone === "c" ? "bg-blue-soft text-blue" :
                      c.tone === "d" ? "bg-[#F4DCE4] text-[#A03364]" :
                      c.tone === "e" ? "bg-amber-soft text-amber-ink" :
                      c.tone === "f" ? "bg-rose-soft text-rose" :
                      "bg-bg-2 text-ink-2"
                    }`}
                  >
                    {initialsOf(c.name)}
                  </div>

                  {/* Name and Meta */}
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="font-semibold text-[14px] text-ink truncate tracking-[-0.005em]">
                      {c.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] text-ink-3 mt-0.5">
                      <span>{formatPhone(c.phone)}</span>
                      <span className="text-ink-4">·</span>
                      <span>Last seen <strong className="font-medium text-ink-2">{formatLast(c.lastDays ?? 999)}</strong></span>
                    </div>
                  </div>

                  {/* Stats - Hidden on mobile */}
                  <div className="text-right flex-shrink-0 max-[720px]:hidden mr-4">
                    <div className="text-[13px] text-ink-2 font-mono"><strong className="font-semibold text-ink">{c.visits ?? 0}</strong> visit{c.visits === 1 ? "" : "s"}</div>
                    <div className="text-[11px] text-ink-3 mt-0.5">Likes {c.fav ?? "—"}</div>
                  </div>

                  {/* Spend */}
                  <div className="text-right flex-shrink-0 max-[720px]:min-w-0 mr-3 sm:mr-4">
                    <div className="text-[15px] max-[720px]:text-[14px] font-semibold text-ink tracking-[-0.01em]">₹{(c.spend ?? 0).toLocaleString("en-IN")}</div>
                    <div className="text-[10px] text-ink-3 uppercase tracking-[0.04em] mt-0.5 hidden max-[720px]:block">
                      {c.visits ?? 0} visit{c.visits === 1 ? "" : "s"}
                    </div>
                    <div className="text-[10px] text-ink-3 uppercase tracking-[0.04em] mt-0.5 block max-[720px]:hidden">
                      Lifetime
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 max-[720px]:hidden flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => onMessage(c, e)}
                      className="w-8 h-8 rounded-[8px] border border-line bg-white text-ink-2 grid place-items-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-wa hover:text-white hover:border-wa"
                      aria-label="WhatsApp"
                    >
                      <I.wa style={{ width: 16, height: 16 }} />
                    </button>
                    <I.chevR className="transition-transform duration-150 text-ink-4 group-hover:translate-x-0.5 group-hover:text-ink-2" style={{ width: 16, height: 16 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loadingCustomers && customerTotal > 0 && (
          <div className="flex items-center justify-between gap-3 mt-4 text-[13px] text-ink-2 max-[720px]:flex-col max-[720px]:items-stretch">
            <span className="text-ink-3">
              Showing {showingStart}-{showingEnd} of {customerTotal} customers
            </span>
            <div className="inline-flex items-center gap-2 max-[720px]:justify-between">
              <button
                type="button"
                disabled={!hasPrevPage}
                onClick={prevPage}
                className="h-9 px-3 rounded-[8px] border border-line bg-white text-ink disabled:opacity-45 disabled:cursor-not-allowed hover:border-line-2 transition-colors duration-150"
              >
                ← Prev
              </button>
              <span className="font-mono text-[12px] text-ink-3 px-1.5">
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                disabled={!hasNextPage}
                onClick={nextPage}
                className="h-9 px-3 rounded-[8px] border border-line bg-white text-ink disabled:opacity-45 disabled:cursor-not-allowed hover:border-line-2 transition-colors duration-150"
              >
                Next →
              </button>
            </div>
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

                    if (phoneFormatted) {
                      const { data: existingCustomer, error: existingError } = await supabase
                        .from("customers")
                        .select("id, name")
                        .eq("salon_id", salonId)
                        .eq("phone", phoneFormatted)
                        .maybeSingle();

                      if (existingError) throw existingError;
                      if (existingCustomer) {
                        showFlash(`Phone number is already linked to ${existingCustomer.name}.`, 3000);
                        setSaving(false);
                        return;
                      }
                    }

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
                      setCustomers(prev => [newEntry, ...prev].slice(0, pageSize));
                      setCustomerTotal(customerTotal + 1);
                      resetPage();
                      setRefreshKey(current => current + 1);
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
                  setCustomers(prev => [newEntry, ...prev].slice(0, pageSize));
                  setCustomerTotal(customerTotal + 1);
                  resetPage();
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
