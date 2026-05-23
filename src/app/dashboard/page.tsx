"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Icons as I } from "@/components/ui/Icons";
import { toMin, formatTime12h, formatTime12hFromMin, formatDateDisplay, isUUID, mapDbStatusToUi } from "@/lib/utils";
import Header from "@/components/layout/Header";
import { useProfile } from "@/context/ProfileContext";
import { insertNotification } from "@/lib/notifications";
import { useSalonData } from "@/hooks/useSalonData";
import { Appointment, Stylist, Service } from "@/types";

// ===== TYPES =====

// ===== FALLBACK DATA (only used when Supabase is unavailable) =====
const FALLBACK_STYLISTS: Stylist[] = [
  { id: "all", name: "All stylists", tone: "", short: "?" },
];

const FALLBACK_SERVICES: Service[] = [];

const STATUS_LABEL = { confirmed: "Confirmed", arrived: "Arrived", completed: "Completed", noshow: "No-show", cancelled: "Cancelled" };
const STATUS_ORDER: ("confirmed" | "arrived" | "completed" | "noshow")[] = ["confirmed", "arrived", "completed", "noshow"];

// ===== MAIN DASHBOARD PAGE =====
export default function DashboardPage() {
  const { profile, salonId, loading: profileLoading } = useProfile();
  const router = useRouter();
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | number | null>(3); // Active one starts expanded
  const [filter, setFilter] = useState<string | number>("all");
  const [day, setDay] = useState("today");
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const [loadingBookings, setLoadingBookings] = useState(false);

  const { stylists: dbStylists, services: dbServices, loading: salonDataLoading } = useSalonData(salonId);
  const d = new Date();
  const [nowTimeMin, setNowTimeMin] = useState(d.getHours() * 60 + d.getMinutes());
  const [dateDisplayStr, setDateDisplayStr] = useState(formatDateDisplay(d));



  useEffect(() => {
    if (profileLoading) return;
    if (!salonId) {
      setAppts([]);
      setPageLoading(false);
    }
  }, [profileLoading, salonId]);

  // Update time and date dynamically if connected
  useEffect(() => {
    if (!salonId) return;

    const updateTime = () => {
      const now = new Date();
      setDateDisplayStr(formatDateDisplay(now));
      setNowTimeMin(now.getHours() * 60 + now.getMinutes());
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [salonId]);

  useEffect(() => {
    if (!salonId) return;

    let cancelled = false;

    const load = async () => {
      setLoadingBookings(true);
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (!cancelled) {
          setLoadingBookings(false);
          setPageLoading(false);
        }
        return;
      }

      try {
        const d = new Date();
        if (day === "tomorrow") {
          d.setDate(d.getDate() + 1);
        }
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dateNum = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${dateNum}`;

        const { data, error } = await supabase
          .from("bookings")
          .select(`
            id,
            customer_id,
            date,
            start_time,
            duration,
            status,
            notes,
            customer:customers (id, name, phone),
            stylist:stylists (id, name, tone),
            booking_services (
              qty,
              price_at_booking,
              service:services (id, name)
            )
          `)
          .eq("salon_id", salonId)
          .eq("date", dateStr)
          .order("start_time", { ascending: true });

        if (cancelled) return;
        if (error) throw error;

        if (data) {
          const customerIds = Array.from(new Set(data.map((b) => b.customer_id).filter(Boolean)));
          const visitsMap: Record<string, number> = {};
          
          if (customerIds.length > 0) {
            const { data: visitsData } = await supabase
              .from("bookings")
              .select("customer_id, status")
              .in("customer_id", customerIds)
              .in("status", ["Completed", "Paid"]);
              
            if (visitsData && !cancelled) {
              visitsData.forEach((v) => {
                visitsMap[v.customer_id] = (visitsMap[v.customer_id] || 0) + 1;
              });
            }
          }

          if (cancelled) return;

          const cleanTone = (t: string) => t.replace("tone-", "");
          const mappedAppts: Appointment[] = data.map((b: any) => {
            const custName = b.customer?.name || "Walk-in Customer";
            const initials = custName
              .split(" ")
              .map((p: string) => p[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "WC";
            
            const cleanToneVal = b.stylist?.tone ? cleanTone(b.stylist.tone) : "a";
            const serviceNames = b.booking_services
              ?.map((bs: any) => bs.service?.name)
              .filter(Boolean)
              .join(" + ") || "No service";
            
            const price = b.booking_services
              ?.reduce((total: number, bs: any) => total + (Number(bs.price_at_booking) * (bs.qty || 1)), 0) || 0;



            return {
              id: b.id,
              customerId: b.customer_id,
              time: (b.start_time || "09:00").slice(0, 5),
              duration: b.duration || 30,
              customer: custName,
              initials,
              tone: cleanToneVal,
              service: serviceNames,
              stylist: b.stylist?.id || "unassigned",
              price,
              status: mapDbStatusToUi(b.status),
              visits: visitsMap[b.customer_id] || 0,
              phone: b.customer?.phone || "",
              note: b.notes || ""
            };
          });

          setAppts(mappedAppts);
        }
      } catch (err) {
        console.error("Error loading bookings from Supabase:", err);
        if (!cancelled) setAppts([]);
      } finally {
        if (!cancelled) {
          setLoadingBookings(false);
          setPageLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [salonId, day]);

  // Combine lists depending on connection state
  const activeStylists = useMemo(() => {
    if (dbStylists.length > 0) {
      return [{ id: "all", name: "All stylists", tone: "", short: "?" }, ...dbStylists];
    }
    return FALLBACK_STYLISTS;
  }, [dbStylists]);

  const activeServices = useMemo(() => {
    if (dbServices.length > 0) {
      return dbServices;
    }
    return FALLBACK_SERVICES;
  }, [dbServices]);

  // Layout settings
  const density = "compact";
  const showNowLine = true;

  // Filters & Sorting
  const filtered = useMemo(() => {
    const list = filter === "all" ? appts : appts.filter((a) => a.stylist === filter);
    return [...list].sort((a, b) => toMin(a.time) - toMin(b.time));
  }, [appts, filter]);

  // Metrics
  const todayRevenue = appts.filter((a) => a.status === "completed" || a.status === "arrived").reduce((s, a) => s + a.price, 0);
  const totalAppts = appts.length;
  const noShows = appts.filter((a) => a.status === "noshow").length;

  const unrepliedCount = useMemo(() => {
    if (day !== "today") return 0;
    return appts.filter((a) => {
      if (a.status !== "confirmed") return false;
      const apptMin = toMin(a.time);
      return apptMin >= nowTimeMin && apptMin <= nowTimeMin + 120;
    }).length;
  }, [appts, nowTimeMin, day]);

  const updateStatus = async (id: string | number, status: "confirmed" | "arrived" | "completed" | "noshow") => {
    setAppts(prev => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    setFlash(`Status updated to ${STATUS_LABEL[status]}`);
    setTimeout(() => setFlash(null), 1800);

    if (typeof id === "string" && isUUID(id)) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const dbStatus = status === "confirmed" ? "Confirmed"
                       : status === "arrived" ? "Arrived"
                       : status === "completed" ? "Completed"
                       : "No-show";
        const { error } = await supabase
          .from("bookings")
          .update({ status: dbStatus })
          .eq("id", id);
        if (error) {
          console.error("Error updating status in Supabase:", error);
        } else {
          // Insert notification
          const appt = appts.find(a => a.id === id);
          if (appt && salonId) {
            insertNotification({
              salon_id: salonId,
              type: "status_update",
              title: "Booking updated",
              body: `${appt.customer} marked as ${STATUS_LABEL[status]}`,
              meta: { booking_id: id, status },
            });
          }
        }
      }
    }
  };

  const sendWA = (a: Appointment) => {
    setFlash(`WhatsApp opened for ${a.customer}`);
    setTimeout(() => setFlash(null), 1800);
  };

  const addWalkIn = async ({ name, phone, svc, stylistId }: { name: string; phone: string; svc: Service; stylistId: string | number }) => {
    const supabase = getSupabaseBrowserClient();
    
    if (supabase && salonId && isUUID(String(svc.id)) && isUUID(String(stylistId))) {
      try {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const startTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
        
        const { error } = await supabase.rpc("create_public_booking", {
          p_salon_id: salonId,
          p_customer_name: name,
          p_phone: phone || "+91 99999 99999",
          p_stylist_id: stylistId,
          p_date: dateStr,
          p_start_time: startTimeStr,
          p_duration: svc.duration,
          p_service_ids: [svc.id]
        });

        if (error) throw error;

        insertNotification({
          salon_id: salonId!,
          type: "walk_in",
          title: "Walk-in arrived",
          body: `${name} walked in for ${svc.name}`,
          meta: { customer_name: name, service: svc.name },
        });

        setFlash(`${name} added to schedule`);
        setTimeout(() => setFlash(null), 2000);
        // Force state reload by updating day state / running inlined fetch
        setDay(day);
        return;
      } catch (err: any) {
        console.error("Error creating walk-in booking:", err);
        setFlash(`Error: ${err.message || "Failed to save booking"}`);
        setTimeout(() => setFlash(null), 3000);
      }
    }

    const initials = name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const tones = ["a", "b", "c", "d", "e", "f"];
    const tone = tones[name.length % tones.length];

    const newAppt: Appointment = {
      id: Math.max(...appts.map((a) => typeof a.id === "number" ? a.id : 0), 0) + 1,
      time: "13:30",
      duration: svc.duration,
      customer: name,
      initials,
      tone,
      service: svc.name,
      stylist: stylistId,
      price: svc.price,
      status: "arrived",
      visits: 0,
      phone: phone || "+91 99xxx xxxxx",
      note: "Walk-in registration",
    };

    setAppts([...appts, newAppt]);
    setFlash(`${name} added to schedule`);
    setTimeout(() => setFlash(null), 2000);
  };

  const nowIdx = filtered.findIndex((a) => toMin(a.time) > nowTimeMin);

  const formatTime = (min: number) => {
    let h = Math.floor(min / 60);
    const m = min % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className={`app density-${density} animate-fade-in`}>
      {/* Top Navbar */}
      <Header
        title={`Good morning, ${profile.name.split(" ")[0]} 👋`}
        subtitle={dateDisplayStr}
        todayRevenue={todayRevenue}
      />

      <main className="app-main">
        {/* Metrics Grid */}
        <div className="metrics">
          {pageLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="metric pulse" style={{ background: "var(--bg-2)", borderRadius: "var(--radius)", minHeight: 90 }} />
            ))
          ) : (
            <>
              <MetricCard
                label="Today's revenue"
                prefix="₹"
                value={todayRevenue.toLocaleString("en-IN")}
                delta="22%"
                deltaTone="up"
                icon={<I.rupee />}
                spark={<MiniSpark points={[12, 18, 14, 22, 16, 28, 32]} tone="teal" />}
              />
              <MetricCard
                label="Appointments today"
                value={totalAppts}
                suffix=" booked"
                delta="2 more"
                deltaTone="up"
                icon={<I.calendar />}
                spark={<MiniSpark points={[5, 7, 6, 8, 9, 7, 8]} tone="teal" />}
              />
              <MetricCard
                label="No-shows"
                value={noShows}
                delta={noShows === 0 ? "clean week" : "1 vs. yesterday"}
                deltaTone={noShows > 0 ? "down" : "up"}
                icon={<I.alert />}
                spark={<MiniSpark points={[1, 0, 2, 1, 0, 1, 1]} tone="amber" />}
              />
            </>
          )}
        </div>

        {/* Schedule Header */}
        <div className="section-head">
          <div className="l">
            <h2>Today's schedule</h2>
            <span className="count">{filtered.length} appointments</span>
          </div>
          <div className="r" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="toggle" style={{ position: "relative" }}>
              <div
                className="toggle-slider"
                style={{
                  width: "calc(50% - 3px)",
                  transform: day === "today" ? "translateX(0)" : "translateX(100%)",
                }}
              />
              <button className={day === "today" ? "on" : ""} onClick={() => setDay("today")} style={{ position: "relative", zIndex: 1 }}>
                Today
              </button>
              <button className={day === "tomorrow" ? "on" : ""} onClick={() => setDay("tomorrow")} style={{ position: "relative", zIndex: 1 }}>
                Tomorrow
              </button>
            </div>
            <button
              onClick={() => setShowWalkIn(true)}
              className="btn btn-sm btn-outline"
              style={{ height: 32, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}
            >
              Walk-in
            </button>
            <Link href="/dashboard/new-booking" className="btn btn-sm" style={{ background: "var(--teal)", color: "#fff", height: 32, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
              + New booking
            </Link>
          </div>
        </div>

        {/* Stylist Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {activeStylists.map((s) => (
            <button key={s.id} className={`filter-chip ${filter === s.id ? "on" : ""}`} onClick={() => setFilter(s.id)}>
              {s.id !== "all" && (
                <span className={`avatar sm tone-${s.tone}`} style={{ width: 18, height: 18, fontSize: 9, border: 0, borderRadius: "50%", display: "inline-grid", placeItems: "center", fontWeight: "bold", marginRight: 4 }}>
                  {s.name[0]}
                </span>
              )}
              {s.name}
              {s.id !== "all" && (
                <span style={{ color: filter === s.id ? "rgba(255,255,255,0.6)" : "var(--ink-4)", fontSize: 11, marginLeft: 6 }}>
                  {appts.filter((a) => a.stylist === s.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Appointments Timeline */}
        <div className={`timeline ${loadingBookings ? "is-loading" : ""}`}>
          <div className="tl-rail"></div>
          {pageLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                <div style={{ width: 52, flexShrink: 0 }} />
                <div className="tl-dot" />
                <div className="pulse" style={{ flex: 1, height: 72, background: "var(--bg-2)", borderRadius: "var(--radius)" }} />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 14 }}>
              No appointments for this day.
            </div>
          ) : (
            filtered.map((appt, i) => (
              <React.Fragment key={`${day}-${filter}-${appt.id}`}>
                {showNowLine && nowIdx === i && (
                  <div className="tl-now" style={{ position: "relative", height: 24, marginBottom: 8 }}>
                    <div className="tl-time" style={{ top: 0, color: "var(--rose)" }}>
                      {formatTime(nowTimeMin).replace(" AM", "").replace(" PM", "")}
                      <small>now</small>
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        left: -16,
                        top: 8,
                        width: 11,
                        height: 11,
                        borderRadius: "50%",
                        background: "var(--rose)",
                        boxShadow: "0 0 0 4px rgba(196,69,43,0.15)",
                        zIndex: 2,
                      }}
                    ></div>
                    <div style={{ position: "absolute", left: -5, right: 0, top: 13, height: 1, background: "var(--rose)", opacity: 0.35 }}></div>
                  </div>
                )}
                <ApptRow
                  appt={appt}
                  expanded={expandedId === appt.id}
                  onToggle={() => setExpandedId(expandedId === appt.id ? null : appt.id)}
                  onStatus={updateStatus}
                  onWA={sendWA}
                  stylists={activeStylists}
                  nowTimeMin={nowTimeMin}
                />
              </React.Fragment>
            ))
          )}
        </div>

        {/* Campaign Callout */}
        {unrepliedCount > 0 && (
          <div
            style={{
              marginTop: 24,
              padding: "18px 20px",
              background: "var(--teal-soft)",
              border: "1px solid var(--teal-soft-2)",
              borderRadius: "var(--radius)",
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: "var(--teal-ink)",
              fontSize: 13,
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--teal)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <I.wa style={{ width: 18, height: 18 }} />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontWeight: 600 }}>
                {unrepliedCount} customer{unrepliedCount > 1 ? "s haven't" : " hasn't"} replied to their reminder.
              </strong>{" "}
              Send a follow-up WhatsApp in one tap.
            </div>
            <button
              className="btn btn-sm"
              style={{ background: "var(--teal)", color: "#fff", height: 32 }}
              onClick={() => router.push("/dashboard/bookings")}
            >
              Review →
            </button>
          </div>
        )}
      </main>




      {/* Walk-In Modal */}
      {showWalkIn && <WalkInModal onClose={() => setShowWalkIn(false)} onAdd={addWalkIn} services={activeServices} stylists={activeStylists} />}

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
            animation: "pop .2s",
          }}
        >
          {flash}
        </div>
      )}

    </div>
  );
}

// ===== SUBCOMPONENTS =====

// MetricCard Component
interface MetricCardProps {
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  delta?: string;
  deltaTone?: "up" | "down";
  icon: React.ReactNode;
  spark: React.ReactNode;
}

function MetricCard({ label, value, prefix, suffix, delta, deltaTone, icon, spark }: MetricCardProps) {
  return (
    <div className="metric">
      <div className="lbl">
        <span className="ico">{icon}</span>
        {label}
      </div>
      <div className="val">
        {prefix && <small style={{ marginRight: 2 }}>{prefix}</small>}
        {value}
        {suffix && <small>{suffix}</small>}
      </div>
      {delta && (
        <div className="delta">
          <span className={deltaTone === "down" ? "down" : "up"}>
            {deltaTone === "down" ? "↓" : "↑"} {delta}
          </span>
          <span>vs. yesterday</span>
        </div>
      )}
      {spark && <div className="spark">{spark}</div>}
    </div>
  );
}

// MiniSpark SVG Component
function MiniSpark({ points, tone = "teal", height = 28, width = 80 }: { points: number[]; tone?: "teal" | "amber" | "rose"; height?: number; width?: number }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${height - ((p - min) / range) * height}`).join(" ");
  const color = tone === "teal" ? "var(--teal)" : tone === "amber" ? "var(--amber)" : "var(--rose)";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(points.length - 1) * stepX} cy={height - ((points[points.length - 1] - min) / range) * height} r="2.5" fill={color} />
    </svg>
  );
}

// Appointment Timeline Row
interface ApptRowProps {
  appt: Appointment;
  expanded: boolean;
  onToggle: () => void;
  onStatus: (id: string | number, status: "confirmed" | "arrived" | "completed" | "noshow") => void;
  onWA: (a: Appointment) => void;
  stylists: Stylist[];
  nowTimeMin: number;
}

function ApptRow({ appt, expanded, onToggle, onStatus, onWA, stylists, nowTimeMin }: ApptRowProps) {
  const router = useRouter();
  const stylist = stylists.find((s) => s.id === appt.stylist) || stylists[1] || { id: "unknown", name: appt.stylist, tone: "a" };
  const start = toMin(appt.time);
  const end = start + appt.duration;
  const startTimeFormatted = formatTime12hFromMin(start);
  const endTimeFormatted = formatTime12hFromMin(end);
  const isActive = start <= nowTimeMin && nowTimeMin < end;

  const bookingParam = typeof appt.id === "string" ? appt.id : String(appt.id);
  const customerParam = appt.customerId ? String(appt.customerId) : String(appt.id);

  return (
    <div className={`tl-row ${isActive ? "is-active" : ""} ${appt.status === "completed" ? "is-done" : ""}`}>
      <div className="tl-time">
        {startTimeFormatted}
        <small>{appt.duration} min</small>
      </div>
      <div className="tl-dot"></div>
      <div className={`appt ${expanded ? "is-expanded" : ""}`} onClick={onToggle}>
        <div className={`avatar md tone-${appt.tone}`} style={{ width: 40, height: 40, flexShrink: 0 }}>{appt.initials}</div>
        <div className="who">
          <div className="name">
            <Link
              href={`/dashboard/customers/${customerParam}`}
              onClick={(e) => e.stopPropagation()}
              style={{ color: "inherit", textDecoration: "none", fontWeight: 600 }}
              className="hover-underline"
            >
              {appt.customer}
            </Link>
          </div>
          <div className="meta">
            <strong>{appt.service}</strong> · with {stylist.name} · {startTimeFormatted}–{endTimeFormatted}
          </div>
        </div>
        <div className="meta-right">
          <span className={`badge ${appt.status}`}>{STATUS_LABEL[appt.status]}</span>
          <div className="price">₹{appt.price.toLocaleString("en-IN")}</div>
        </div>
        <div className="chev">
          <I.chev style={{ width: 18, height: 18 }} />
        </div>
      </div>

      {expanded && (
        <div className="appt-expand" onClick={(e) => e.stopPropagation()}>
          <div className="exp-block">
            <div className="lbl">Customer</div>
            <div className="val">
              <Link
                href={`/dashboard/customers/${customerParam}`}
                style={{ color: "var(--teal)", textDecoration: "none", fontWeight: 600 }}
              >
                {appt.customer} ↗
              </Link>
              <br />
              <span style={{ color: "var(--ink-3)" }}>{appt.phone}</span>
              <br />
              <span style={{ color: "var(--ink-3)" }}>{appt.visits} previous visits</span>
            </div>
          </div>
          <div className="exp-block">
            <div className="lbl">Service</div>
            <div className="val">
              <strong>{appt.service}</strong>
              <br />
              <span style={{ color: "var(--ink-3)" }}>{appt.duration} min · ₹{appt.price.toLocaleString("en-IN")}</span>
              <br />
              <span style={{ color: "var(--ink-3)" }}>Stylist: {stylist.name}</span>
              <br />
              <Link
                href={`/dashboard/bookings/${bookingParam}`}
                style={{ color: "var(--teal)", textDecoration: "none", fontWeight: 600, fontSize: 12, display: "inline-block", marginTop: 4 }}
              >
                View full detail ↗
              </Link>
            </div>
          </div>
          <div className="exp-block">
            <div className="lbl">Notes</div>
            <div className="val" style={{ color: appt.note ? "var(--ink-2)" : "var(--ink-4)" }}>
              {appt.note || "No notes yet — tap to add."}
            </div>
          </div>
          <div className="exp-actions">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                className={`status-btn ${s === "noshow" ? "danger" : ""}`}
                onClick={() => {
                  if (s === "completed") {
                    router.push(`/dashboard/checkout/${bookingParam}`);
                  } else {
                    onStatus(appt.id, s);
                  }
                }}
                style={appt.status === s ? { borderColor: "var(--teal)", color: "var(--teal)", background: "var(--teal-soft)" } : {}}
              >
                {appt.status === s && "✓ "}
                {STATUS_LABEL[s]}
              </button>
            ))}
            <Link
              href={`/dashboard/checkout/${bookingParam}`}
              className="status-btn"
              style={{
                borderColor: "var(--teal)",
                color: "#fff",
                background: "var(--teal)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 600
              }}
            >
              Checkout / POS
            </Link>
            <button className="status-btn" onClick={() => onWA(appt)} style={{ marginLeft: "auto", color: "var(--wa)", borderColor: "var(--wa)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <I.wa style={{ width: 14, height: 14 }} /> Message on WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Add Walk-In Appointment Modal
interface WalkInModalProps {
  onClose: () => void;
  onAdd: (data: { name: string; phone: string; svc: Service; stylistId: string | number }) => void;
  services: Service[];
  stylists: Stylist[];
}

function WalkInModal({ onClose, onAdd, services, stylists }: WalkInModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  
  const defaultSvcId = services[0]?.id || "s1";
  const defaultStylistId = stylists.filter((s) => s.id !== "all")[0]?.id || "anjali";

  const [svcId, setSvcId] = useState(defaultSvcId);
  const [stylistId, setStylistId] = useState(defaultStylistId);

  const selectedSvc = services.find((s) => s.id === svcId) || services[0];
  const canSubmit = name.trim().length > 0;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add walk-in booking</h3>
          <button className="modal-close" onClick={onClose}>
            <I.x style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <div className="field">
              <label>Customer name</label>
              <input
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}
              />
            </div>
            <div className="field">
              <label>Phone (optional)</label>
              <input
                placeholder="+91 98xxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}
              />
            </div>
          </div>
          <div className="field">
            <label>Service</label>
            <div className="svc-options">
              {services.slice(0, 6).map((s) => (
                <button key={s.id} className={`svc-opt ${svcId === s.id ? "on" : ""}`} onClick={() => setSvcId(s.id)}>
                  <span>{s.name}</span>
                  <small>
                    {s.duration}m · ₹{s.price}
                  </small>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Stylist</label>
            <select value={stylistId} onChange={(e) => setStylistId(e.target.value)} style={{ height: 42, background: "#fff", border: "1px solid var(--line-2)", borderRadius: 10, padding: "0 10px", outline: 0 }}>
              {stylists.filter((s) => s.id !== "all").map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!canSubmit}
            style={!canSubmit ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            onClick={() => {
              onAdd({ name, phone, svc: selectedSvc, stylistId });
              onClose();
            }}
          >
            Add to schedule
          </button>
        </div>
      </div>
    </div>
  );
}
