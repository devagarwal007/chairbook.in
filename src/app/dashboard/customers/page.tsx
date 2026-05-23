"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Icons as I } from "@/components/ui/Icons";
import Header from "@/components/layout/Header";
import { useProfile } from "@/context/ProfileContext";
import { initialsOf } from "@/lib/utils";


import { Customer } from "@/types";

// ===== DATA =====
const CUSTOMERS: Customer[] = [
  { id: 1,  name: "Priya Sharma",     tone: "b", phone: "+91 98xxx 12345", visits: 12, lastDays: 6,   spend: 12400, fav: "Hair Color",     stylist: "Anjali" },
  { id: 2,  name: "Meera Iyer",       tone: "c", phone: "+91 98xxx 22119", visits: 5,  lastDays: 42,  spend: 6800,  fav: "Facial",         stylist: "Pooja" },
  { id: 3,  name: "Kavya Reddy",      tone: "e", phone: "+91 98xxx 30247", visits: 8,  lastDays: 81,  spend: 9200,  fav: "Hair Color",     stylist: "Anjali" },
  { id: 4,  name: "Sneha P.",         tone: "d", phone: "+91 98xxx 41902", visits: 3,  lastDays: 2,   spend: 2150,  fav: "Threading",      stylist: "Rekha" },
  { id: 5,  name: "Anita Verma",      tone: "a", phone: "+91 98xxx 50819", visits: 22, lastDays: 9,   spend: 28400, fav: "Hair Spa",       stylist: "Pooja" },
  { id: 6,  name: "Lakshmi Nair",     tone: "f", phone: "+91 98xxx 60372", visits: 1,  lastDays: 4,   spend: 350,   fav: "Manicure",       stylist: "Rekha" },
  { id: 7,  name: "Divya Menon",      tone: "e", phone: "+91 98xxx 72184", visits: 4,  lastDays: 67,  spend: 3100,  fav: "Pedicure",       stylist: "Kiran" },
  { id: 8,  name: "Ravi Kumar",       tone: "c", phone: "+91 98xxx 80091", visits: 7,  lastDays: 14,  spend: 4200,  fav: "Beard Trim",     stylist: "Kiran" },
  { id: 9,  name: "Aisha Khan",       tone: "d", phone: "+91 98xxx 81234", visits: 18, lastDays: 21,  spend: 21800, fav: "Keratin",        stylist: "Anjali" },
  { id: 10, name: "Riya Patel",       tone: "b", phone: "+91 98xxx 90456", visits: 9,  lastDays: 38,  spend: 8400,  fav: "Hair Color",     stylist: "Anjali" },
  { id: 11, name: "Neha Gupta",       tone: "a", phone: "+91 98xxx 12356", visits: 6,  lastDays: 51,  spend: 5600,  fav: "Facial",         stylist: "Pooja" },
  { id: 12, name: "Pooja Joshi",      tone: "f", phone: "+91 98xxx 23467", visits: 14, lastDays: 11,  spend: 16200, fav: "Hair Spa",       stylist: "Pooja" },
  { id: 13, name: "Shreya Bhat",      tone: "e", phone: "+91 98xxx 34578", visits: 2,  lastDays: 95,  spend: 1100,  fav: "Haircut",        stylist: "Anjali" },
  { id: 14, name: "Tanvi Kapoor",     tone: "c", phone: "+91 98xxx 45689", visits: 11, lastDays: 18,  spend: 13900, fav: "Highlights",     stylist: "Anjali" },
  { id: 15, name: "Madhuri Desai",    tone: "b", phone: "+91 98xxx 56790", visits: 25, lastDays: 7,   spend: 34200, fav: "Bridal package", stylist: "Anjali" },
  { id: 16, name: "Asha Rao",         tone: "d", phone: "+91 98xxx 67801", visits: 3,  lastDays: 73,  spend: 2400,  fav: "Threading",      stylist: "Rekha" },
  { id: 17, name: "Vikram Singh",     tone: "c", phone: "+91 98xxx 78912", visits: 4,  lastDays: 28,  spend: 1600,  fav: "Haircut",        stylist: "Kiran" },
  { id: 18, name: "Mehak Sethi",      tone: "a", phone: "+91 98xxx 89023", visits: 8,  lastDays: 47,  spend: 9100,  fav: "Manicure",       stylist: "Rekha" },
  { id: 19, name: "Sunita Pillai",    tone: "f", phone: "+91 98xxx 90134", visits: 16, lastDays: 12,  spend: 18600, fav: "Hair Color",     stylist: "Anjali" },
  { id: 20, name: "Rohit Agarwal",    tone: "c", phone: "+91 98xxx 01245", visits: 5,  lastDays: 32,  spend: 2200,  fav: "Haircut",        stylist: "Kiran" },
  { id: 21, name: "Bhavana Shetty",   tone: "e", phone: "+91 98xxx 12356", visits: 7,  lastDays: 88,  spend: 6500,  fav: "Facial",         stylist: "Pooja" },
  { id: 22, name: "Nisha Pandey",     tone: "d", phone: "+91 98xxx 23467", visits: 13, lastDays: 24,  spend: 14400, fav: "Hair Spa",       stylist: "Pooja" },
  { id: 23, name: "Karthik Mehta",    tone: "b", phone: "+91 98xxx 34578", visits: 3,  lastDays: 56,  spend: 900,   fav: "Beard Trim",     stylist: "Kiran" },
  { id: 24, name: "Aarti Bhandari",   tone: "f", phone: "+91 98xxx 45689", visits: 19, lastDays: 5,   spend: 22800, fav: "Highlights",     stylist: "Anjali" },
];

const engagementOf = (days: number) => days <= 30 ? "active" : days <= 60 ? "cooling" : "lost";

const formatLast = (days: number) => {
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} wk${days >= 14 ? "s" : ""} ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo${days >= 60 ? "s" : ""} ago`;
  return `${Math.floor(days / 365)} yr ago`;
};

const SORT_OPTIONS = [
  { id: "recent",  label: "Most recent visit" },
  { id: "name",    label: "Name (A → Z)" },
  { id: "visits",  label: "Most visits" },
  { id: "spend",   label: "Highest spend" },
  { id: "lost",    label: "Longest absent" },
];

const FILTER_TABS = [
  { id: "all",     label: "All",     match: () => true },
  { id: "active",  label: "Active",  match: (c: Customer) => engagementOf(c.lastDays ?? 999) === "active" },
  { id: "cooling", label: "Cooling", match: (c: Customer) => engagementOf(c.lastDays ?? 999) === "cooling" },
  { id: "lost",    label: "Lost",    match: (c: Customer) => engagementOf(c.lastDays ?? 999) === "lost" },
];

// ===== EXPORT COMPONENT =====
export default function CustomersPage() {
  const { profile, salonId, loading: profileLoading } = useProfile();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState<string | number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
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
      setLoadingCustomers(false);
      return;
    }

    const loadCustomersData = async () => {
      setLoadingCustomers(true);
      try {
        // Fetch customers + all bookings with services in parallel
        const [{ data: custData }, { data: bkData }] = await Promise.all([
          supabase.from("customers").select("id, name, phone, pref_stylist_id, member_since, created_at, stylists:pref_stylist_id(name)").eq("salon_id", salonId),
          supabase.from("bookings").select("id, customer_id, status, date, booking_services(price_at_booking, qty, service:services(name)), stylist:stylists(name)").eq("salon_id", salonId),
        ]);

        if (!custData || custData.length === 0) {
          setLoadingCustomers(false);
          return;
        }

        const today = new Date(); today.setHours(0,0,0,0);
        const tones = ["a","b","c","d","e","f"];

        const mapped: Customer[] = custData.map((c: any, idx: number) => {
          const custBks = (bkData || []).filter((b: any) => b.customer_id === c.id);
          const paidBks = custBks.filter((b: any) => ["Completed","Paid"].includes(b.status));
          const visits = paidBks.length;
          const spend = paidBks.reduce((sum: number, b: any) => {
            const bkTotal = (b.booking_services || []).reduce((s: number, bs: any) => s + (Number(bs.price_at_booking) * (bs.qty || 1)), 0);
            return sum + bkTotal;
          }, 0);

          // Days since last booking
          const dates = custBks.map((b: any) => new Date(b.date).getTime()).filter(Boolean);
          const lastMs = dates.length > 0 ? Math.max(...dates) : null;
          const lastDays = lastMs ? Math.round((today.getTime() - lastMs) / 86400000) : 999;

          // Favourite service by frequency
          const svcCount: Record<string, number> = {};
          custBks.forEach((b: any) => (b.booking_services || []).forEach((bs: any) => { const sn = bs.service?.name; if (sn) svcCount[sn] = (svcCount[sn] || 0) + 1; }));
          const fav = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

          // Preferred stylist from most recent booking
          const sortedBks = [...custBks].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const stylist = (sortedBks[0] as any)?.stylist?.name || (c.stylists as any)?.name || "—";

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
    const activeFilter = FILTER_TABS.find(f => f.id === tab)?.match || (() => true);
    let list = customers.filter(activeFilter as (c: Customer) => boolean);

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
    setFlash(`Opening ${c.name}'s profile…`);
    setTimeout(() => {
      router.push(`/dashboard/customers/${c.id}`);
    }, 350);
  };

  const onMessage = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setFlash(`Opening WhatsApp chat for ${c.name}...`);
    const displaySalonName = profile.salonName.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const waText = `Hi ${c.name}, this is ${displaySalonName}. Just checking in! We look forward to seeing you soon.`;
    const cleanPhone = c.phone.replace(/[^0-9+]/g, "");
    setTimeout(() => {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`, "_blank");
      setFlash(null);
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

  return (
    <div className="app animate-fade-in">
      <Header
        title="Customers"
        subtitle={`${customers.length} TOTAL · ₹${(customers.reduce((s, c) => s + (c.spend ?? 0), 0) / 100000).toFixed(1)}L LIFETIME`}
        actions={
          <button
            className="icon-btn"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "1px solid var(--line-2)",
              background: "#fff",
              cursor: "pointer",
            }}
            onClick={() => setFlash("Downloading customer list...")}
          >
            <I.download style={{ width: 18, height: 18 }} />
          </button>
        }
      />

      {/* App Main */}
      <main className="app-main" style={{ paddingBottom: 100 }}>
        {/* Search bar */}
        <div className="cust-search" style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid var(--line-2)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 16 }}>
          <I.search />
          <input
            placeholder="Search by name, phone, service or stylist…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ flex: 1, border: 0, outline: 0, fontSize: "var(--t-body)", fontFamily: "inherit" }}
          />
          {q && (
            <button className="svc-search-clear" onClick={() => setQ("")} style={{ border: 0, background: "transparent", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <I.x style={{ width: 14, height: 14 }} />
            </button>
          )}
          <span className="search-key mono" style={{ fontSize: 10, background: "var(--bg-2)", padding: "2px 6px", borderRadius: 4, color: "var(--ink-3)" }}>⌘ K</span>
        </div>

        {/* Engagement tabs & Sort */}
        <div className="eng-tabs" style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 16 }}>
          {FILTER_TABS.map(f => (
            <button
              key={f.id}
              className={`eng-tab ${tab === f.id ? "on" : ""}`}
              onClick={() => setTab(f.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: tab === f.id ? "1px solid var(--teal)" : "1px solid var(--line)",
                background: tab === f.id ? "var(--teal-soft)" : "#fff",
                color: tab === f.id ? "var(--teal)" : "var(--ink-2)",
                fontSize: "var(--t-body-sm)",
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {f.id !== "all" && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: f.id === "active" ? "var(--green)" : f.id === "cooling" ? "var(--amber)" : "var(--rose)"
                  }}
                />
              )}
              {f.label}
              <span style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: 2 }}>{counts[f.id as keyof typeof counts]}</span>
            </button>
          ))}

          <div style={{ flex: 1 }}></div>

          {/* Sort Menu Component */}
          <div className="sort-menu" style={{ position: "relative" }}>
            <button
              className="filter-chip"
              onClick={() => setSortOpen(!sortOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line)",
                background: "#fff",
                fontSize: "var(--t-body-sm)",
                fontWeight: 500,
                color: "var(--ink)",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              <I.sort style={{ width: 14, height: 14 }} />
              <span style={{ color: "var(--ink-3)" }}>Sort:</span>
              <span>{currentSort.label}</span>
              <I.chev style={{ width: 14, height: 14, color: "var(--ink-3)" }} />
            </button>
            {sortOpen && (
              <div
                className="sort-pop"
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 6,
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  boxShadow: "0 8px 16px -4px rgba(0,0,0,0.1)",
                  zIndex: 50,
                  minWidth: 180,
                  overflow: "hidden"
                }}
              >
                {SORT_OPTIONS.map(s => (
                  <button
                    key={s.id}
                    className={`sort-opt ${sort === s.id ? "on" : ""}`}
                    onClick={() => {
                      setSort(s.id);
                      setSortOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "10px 14px",
                      border: 0,
                      background: sort === s.id ? "var(--teal-soft)" : "transparent",
                      color: sort === s.id ? "var(--teal)" : "var(--ink)",
                      fontSize: "var(--t-body-sm)",
                      textAlign: "left",
                      cursor: "pointer"
                    }}
                  >
                    {s.label}
                    {sort === s.id && <span style={{ color: "var(--teal)" }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Result Head / Winback Broadcast */}
        <div
          className="cust-list-head"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            fontSize: "var(--t-body-sm)",
            color: "var(--ink-3)"
          }}
        >
          <div>
            {filtered.length} {filtered.length === 1 ? "customer" : "customers"}
            {q && <span> matching &quot;{q}&quot;</span>}
          </div>
          {tab === "cooling" && filtered.length > 0 && (
            <button
              className="btn btn-sm"
              onClick={() => setFlash("Win-back WhatsApp broadcast prepared!")}
              style={{
                background: "var(--teal)",
                color: "#fff",
                height: 30,
                fontSize: 12,
                borderRadius: 8,
                padding: "0 10px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: 0,
                cursor: "pointer"
              }}
            >
              <I.wa style={{ width: 12, height: 12 }} /> Win back all {filtered.length} →
            </button>
          )}
          {tab === "lost" && filtered.length > 0 && (
            <button
              className="btn btn-sm"
              onClick={() => setFlash("Last-chance offer broadcast prepared!")}
              style={{
                background: "var(--rose)",
                color: "#fff",
                height: 30,
                fontSize: 12,
                borderRadius: 8,
                padding: "0 10px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: 0,
                cursor: "pointer"
              }}
            >
              <I.wa style={{ width: 12, height: 12 }} /> Last-chance offer to {filtered.length}
            </button>
          )}
        </div>

        {/* Customer List */}
        {loadingCustomers ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="pulse" style={{ height: 72, background: "var(--bg-2)", borderRadius: "var(--radius)", border: "1px solid var(--line)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="cust-empty"
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--bg-2)", display: "grid", placeItems: "center" }}>
              <I.search style={{ color: "var(--ink-3)", width: 20, height: 20 }} />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 15, fontWeight: 600 }}>No customers match search</strong>
              <span style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>
                {q ? "Try searching by phone or service." : "Select another engagement filter."}
              </span>
            </div>
          </div>
        ) : (
          <div className="cust-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(c => {
              const eng = engagementOf(c.lastDays ?? 999);
              return (
                <div
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className={`cust-row ${selected === c.id ? "is-selected" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "14px 16px",
                    background: "#fff",
                    border: selected === c.id ? "1px solid var(--teal)" : "1px solid var(--line)",
                    borderRadius: "var(--radius)",
                    cursor: "pointer",
                    transition: "border-color 0.2s, background 0.2s"
                  }}
                >
                  {/* Status Indicator */}
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: eng === "active" ? "var(--green)" : eng === "cooling" ? "var(--amber)" : "var(--rose)",
                      marginRight: 12,
                      flexShrink: 0
                    }}
                  />

                  {/* Avatar */}
                  <div
                    className={`avatar md tone-${c.tone}`}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      marginRight: 12,
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 600,
                      fontSize: 14,
                      flexShrink: 0,
                      background: c.tone === "a" ? "var(--teal-soft)" : c.tone === "b" ? "var(--amber-soft)" : c.tone === "c" ? "var(--blue-soft)" : c.tone === "d" ? "var(--green-soft)" : c.tone === "e" ? "var(--rose-soft)" : "var(--bg-2)",
                      color: c.tone === "a" ? "var(--teal)" : c.tone === "b" ? "var(--amber-ink)" : c.tone === "c" ? "var(--blue)" : c.tone === "d" ? "var(--green)" : c.tone === "e" ? "var(--rose)" : "var(--ink-2)"
                    }}
                  >
                    {initialsOf(c.name)}
                  </div>

                  {/* Name and Meta */}
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                      <span>{c.phone}</span>
                      <span>·</span>
                      <span>Seen {formatLast(c.lastDays ?? 999)}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ textAlign: "right", marginRight: 16, flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>{c.visits ?? 0} visits</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>Likes {c.fav ?? "—"}</div>
                  </div>

                  {/* Spend */}
                  <div style={{ textAlign: "right", marginRight: 16, flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--teal)" }}>₹{(c.spend ?? 0).toLocaleString("en-IN")}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.02em", marginTop: 2 }}>Lifetime</div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => onMessage(c, e)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: 0,
                        background: "var(--wa-soft)",
                        color: "var(--wa)",
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer"
                      }}
                      aria-label="WhatsApp"
                    >
                      <I.wa style={{ width: 14, height: 14 }} />
                    </button>
                    <I.chev style={{ width: 16, height: 16, color: "var(--ink-4)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FAB - Add customer */}
      <button
        className="fab"
        onClick={() => setShowCreateCust(true)}
        style={{
          position: "fixed",
          right: 24,
          bottom: 96,
          width: 56,
          height: 56,
          borderRadius: 18,
          background: "var(--teal)",
          color: "#fff",
          fontSize: 28,
          border: 0,
          boxShadow: "0 8px 24px rgba(15,110,86,0.3)",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          zIndex: 40
        }}
      >
        +
      </button>

      {/* Create Customer Modal */}
      {showCreateCust && (
        <div className="modal-back" onClick={() => setShowCreateCust(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Add new customer</h3>
              <button className="modal-close" onClick={() => setShowCreateCust(false)}>
                <I.x style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Customer name</label>
                <input
                  placeholder="e.g. Priya Sharma"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  autoFocus
                  style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
                />
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label>Phone number</label>
                <input
                  type="tel"
                  placeholder="+91 98xxx xxxxx"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value.replace(/[^\d+]/g, ""))}
                  style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
                />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowCreateCust(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!newCustName.trim() || saving}
                style={{ opacity: !newCustName.trim() || saving ? 0.5 : 1 }}
                onClick={async () => {
                  if (!newCustName.trim()) return;
                  setSaving(true);
                  const supabase = getSupabaseBrowserClient();
                  if (supabase && salonId) {
                    try {
                      const { data: newCust, error } = await supabase
                        .from("customers")
                        .insert({
                          salon_id: salonId,
                          name: newCustName.trim(),
                          phone: newCustPhone || "+91 99999 99999",
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
                        setFlash("Customer added!");
                        setTimeout(() => setFlash(null), 1800);
                      }
                    } catch (err: any) {
                      setFlash(`Error: ${err.message || "Failed to add customer"}`);
                      setTimeout(() => setFlash(null), 3000);
                    }
                  } else {
                    setFlash("Customer added (local preview)");
                    const tone = ["a", "b", "c", "d", "e", "f"][Math.floor(Math.random() * 6)];
                    const newEntry: Customer = {
                      id: Date.now(),
                      name: newCustName.trim(),
                      phone: newCustPhone || "",
                      tone,
                      visits: 0,
                      lastDays: 0,
                      spend: 0,
                      fav: "—",
                      stylist: "—",
                    };
                    setCustomers(prev => [newEntry, ...prev]);
                    setTimeout(() => setFlash(null), 1800);
                  }
                  setNewCustName("");
                  setNewCustPhone("");
                  setShowCreateCust(false);
                  setSaving(false);
                }}
              >
                {saving ? "Saving..." : "Add customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flash Messages */}
      {flash && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
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
