"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useProfile } from "@/context/ProfileContext";

// ===== ICONS =====
const I = {
  home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/>
    </svg>
  ),
  calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M8 3v4M16 3v4M3 10h18"/>
    </svg>
  ),
  users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/>
      <circle cx="10" cy="7" r="4"/>
      <path d="M21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
    </svg>
  ),
  back: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  bell: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>
    </svg>
  ),
  check: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  checkall: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 7-9 9-3-3M9 7l3 3M2 12l3 3"/>
    </svg>
  ),
  x: () => (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
  wa: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.2 3.2.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.3c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
    </svg>
  ),
  cash: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>
    </svg>
  ),
  alert: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4M12 17h.01"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"/>
    </svg>
  ),
  cancel: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/>
    </svg>
  ),
  star: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="m12 2 3 7 7 .6-5.3 4.7L18.5 22 12 18 5.5 22l1.8-7.7L2 9.6 9 9z"/>
    </svg>
  ),
  edit: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>
    </svg>
  ),
  summary: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>
    </svg>
  ),
  insights: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V3M21 21H3" />
      <rect x="7" y="11" width="3" height="6" rx="0.5" />
      <rect x="12" y="7" width="3" height="10" rx="0.5" />
      <rect x="17" y="13" width="3" height="4" rx="0.5" />
    </svg>
  ),
};

const KINDS: Record<string, { icon: keyof typeof I; tone: string; label: string }> = {
  new_booking:    { icon: 'calendar', tone: 'teal',  label: 'New booking' },
  confirmed:      { icon: 'check',   tone: 'green', label: 'Customer confirmed' },
  rescheduled:    { icon: 'edit',    tone: 'amber', label: 'Reschedule request' },
  cancelled:      { icon: 'cancel',  tone: 'rose',  label: 'Booking cancelled' },
  noshow:         { icon: 'alert',   tone: 'rose',  label: 'No-show' },
  payment:        { icon: 'cash',    tone: 'green', label: 'Payment received' },
  review:         { icon: 'star',    tone: 'amber', label: 'New review' },
  wa_reply:       { icon: 'wa',      tone: 'wa',    label: 'WhatsApp reply' },
  daily:          { icon: 'summary', tone: 'neutral', label: 'Daily summary' },
};

interface Actor {
  name: string;
  initials: string;
  tone: string;
}

interface NotificationItem {
  id: number;
  kind: string;
  ts: string;
  day: string;
  unread: boolean;
  title: string;
  meta: string;
  actor: Actor | null;
  link: string;
}

const INITIAL_NOTIFS: NotificationItem[] = [
  { id: 1,  kind: 'new_booking', ts: '01:08 PM', day: 'Today',     unread: true,  title: 'Aisha Khan booked Keratin',      meta: 'Saturday 24 May · 11:00 AM · with Anjali · ₹4,500',                actor: { name: 'Aisha Khan', initials: 'AK', tone: 'd' }, link: '/dashboard/bookings' },
  { id: 2,  kind: 'wa_reply',    ts: '12:42 PM', day: 'Today',     unread: true,  title: 'Priya Sharma replied YES',       meta: 'To your reminder for Saturday\'s appointment',                       actor: { name: 'Priya Sharma', initials: 'PS', tone: 'b' }, link: '/dashboard/bookings' },
  { id: 3,  kind: 'rescheduled', ts: '11:58 AM', day: 'Today',     unread: true,  title: 'Meera Iyer requested reschedule',meta: 'From Saturday 10:00 AM → wants Sunday 11:00 AM',                    actor: { name: 'Meera Iyer', initials: 'MI', tone: 'c' }, link: '/dashboard/bookings' },
  { id: 4,  kind: 'payment',     ts: '11:34 AM', day: 'Today',     unread: false, title: 'Payment received from Kavya Reddy', meta: '₹2,700 · UPI · GPay',                                             actor: { name: 'Kavya Reddy', initials: 'KR', tone: 'e' }, link: '/dashboard/revenue' },
  { id: 5,  kind: 'daily',       ts: '08:00 AM', day: 'Today',     unread: false, title: 'Your day at a glance',           meta: '8 bookings · 4 confirmed · 3 to confirm · Pooja off after 6 PM',     actor: null, link: '/dashboard' },
  { id: 6,  kind: 'cancelled',   ts: '07:42 PM', day: 'Yesterday', unread: false, title: 'Divya Menon cancelled',          meta: 'Pedicure with Kiran · Reason: "Not feeling well"',                  actor: { name: 'Divya Menon', initials: 'DM', tone: 'e' }, link: '/dashboard/bookings' },
  { id: 7,  kind: 'review',      ts: '03:15 PM', day: 'Yesterday', unread: false, title: 'Priya left a 5-star review',     meta: '"Anjali got the color exactly right — already booked next month."', actor: { name: 'Priya Sharma', initials: 'PS', tone: 'b' }, link: '/dashboard/revenue' },
  { id: 8,  kind: 'noshow',      ts: '04:30 PM', day: 'Yesterday', unread: false, title: 'Divya Menon was a no-show',      meta: 'Pedicure with Kiran · 3rd no-show this year',                       actor: { name: 'Divya Menon', initials: 'DM', tone: 'e' }, link: '/dashboard/customers' },
  { id: 9,  kind: 'new_booking', ts: '11:02 AM', day: 'Earlier',   unread: false, title: 'Ravi K booked Beard Trim',       meta: 'Today 4:30 PM · with Kiran · ₹200',                                 actor: { name: 'Ravi K', initials: 'RK', tone: 'c' }, link: '/dashboard/bookings' },
  { id: 10, kind: 'confirmed',   ts: '10:12 AM', day: 'Earlier',   unread: false, title: 'Sneha P confirmed',              meta: 'Threading with Rekha · Today 12:00 PM',                             actor: { name: 'Sneha P', initials: 'SP', tone: 'd' }, link: '/dashboard/bookings' },
  { id: 11, kind: 'review',      ts: '09:30 AM', day: 'Earlier',   unread: false, title: 'Anita V left a 5-star review',   meta: '"Pooja\'s facials are the best in Andheri."',                       actor: { name: 'Anita Verma', initials: 'AV', tone: 'a' }, link: '/dashboard/revenue' },
];

const FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'unread',   label: 'Unread' },
  { id: 'bookings', label: 'Bookings',   kinds: ['new_booking', 'confirmed', 'rescheduled', 'cancelled'] },
  { id: 'alerts',   label: 'Alerts',     kinds: ['noshow'] },
  { id: 'payments', label: 'Payments',   kinds: ['payment'] },
  { id: 'wa',       label: 'WhatsApp',   kinds: ['wa_reply', 'review'] },
];

export default function NotificationsPage() {
  const router = useRouter();
  const { salonId } = useProfile();
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [flash, setFlash] = useState<string | null>(null);

  // Load notifications from DB
  useEffect(() => {
    if (!salonId) {
      setNotifs(INITIAL_NOTIFS);
      setLoading(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setNotifs(INITIAL_NOTIFS);
      setLoading(false);
      return;
    }

    const loadNotifs = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("notifications")
          .select("*")
          .eq("salon_id", salonId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (data && data.length > 0) {
          const mappedNotifs: NotificationItem[] = data.map((n: any, i: number) => {
            const created = new Date(n.created_at);
            const now = new Date();
            const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            const day = diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : "Earlier";
            const hours = created.getHours();
            const minutes = String(created.getMinutes()).padStart(2, "0");
            const ampm = hours >= 12 ? "PM" : "AM";
            const h = hours % 12 || 12;
            const ts = `${h}:${minutes} ${ampm}`;

            return {
              id: i + 1,
              kind: n.type || "new_booking",
              ts,
              day,
              unread: !n.read,
              title: n.title,
              meta: n.body || "",
              actor: n.meta?.actor ? { name: n.meta.actor.name, initials: n.meta.actor.initials || "?", tone: n.meta.actor.tone || "a" } : null,
              link: "/dashboard/bookings",
            };
          });
          setNotifs(mappedNotifs);
        } else {
          setNotifs(INITIAL_NOTIFS);
        }
      } catch (err) {
        console.error("Error loading notifications:", err);
        setNotifs(INITIAL_NOTIFS);
      } finally {
        setLoading(false);
      }
    };

    loadNotifs();
  }, [salonId]);

  const flashMsg = (m: string) => {
    setFlash(m);
    setTimeout(() => setFlash(null), 1600);
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return notifs;
    if (filter === 'unread') return notifs.filter(n => n.unread);
    const f = FILTERS.find(x => x.id === filter);
    if (!f) return notifs;
    return notifs.filter(n => f.kinds?.includes(n.kind));
  }, [notifs, filter]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {
      all:      notifs.length,
      unread:   notifs.filter(n => n.unread).length,
      bookings: notifs.filter(n => ['new_booking','confirmed','rescheduled','cancelled'].includes(n.kind)).length,
      alerts:   notifs.filter(n => n.kind === 'noshow').length,
      payments: notifs.filter(n => n.kind === 'payment').length,
      wa:       notifs.filter(n => ['wa_reply','review'].includes(n.kind)).length,
    };
    return out;
  }, [notifs]);

  const markRead = (id: number) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const dateStr = (() => {
    const d = new Date();
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const dayNum = String(d.getDate()).padStart(2, "0");
    const monthName = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${dayName} · ${dayNum} ${monthName} ${year} · ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
  })();

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, unread: false })));
    flashMsg('All marked as read');
  };

  const dismiss = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNotifs(prev => prev.filter(n => n.id !== id));
    flashMsg('Dismissed');
  };

  // group by day
  const groups = useMemo(() => {
    const out: Record<string, NotificationItem[]> = {};
    filtered.forEach(n => {
      if (!out[n.day]) out[n.day] = [];
      out[n.day].push(n);
    });
    return out;
  }, [filtered]);

  return (
    <div className="app">
      <div className="app-top">
        <div className="app-top-inner">
          <div className="brand" style={{ display: "flex", alignItems: "center" }}>
            <Link className="book-back" href="/dashboard" aria-label="Back" style={{ background: 'transparent', display: 'inline-grid', placeItems: 'center', width: 36, height: 36, color: "var(--ink)" }}>
              <I.back />
            </Link>
            <span className="brand-text" style={{ marginLeft: 8 }}>Notifications</span>
          </div>
          <div className="greeting">
            <div className="h" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-h3)", fontWeight: 600 }}>
              Notifications
              {counts.unread > 0 && <span className="nt-unread-pill" style={{ fontSize: 10, background: "var(--rose-soft)", color: "var(--rose)", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>{counts.unread} unread</span>}
            </div>
            <div className="d" style={{ fontSize: "var(--t-body-sm)", color: "var(--ink-3)", marginTop: 2 }}>{dateStr}</div>
          </div>
          <div className="top-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {counts.unread > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAllRead} style={{ height: 32, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <I.checkall /> Mark all read
              </button>
            )}
            <Link className="btn btn-ghost btn-sm" href="/dashboard/settings" style={{ height: 32, fontSize: 12, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Settings</Link>
          </div>
        </div>
      </div>

      <main className="app-main" style={{ paddingBottom: 100, maxWidth: 760, margin: "0 auto" }}>
        {/* Filter pills */}
        <div className="eng-tabs" style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 16, borderBottom: "1px solid var(--line)" }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              className={`eng-tab ${filter === f.id ? 'on' : ''}`}
              onClick={() => setFilter(f.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: filter === f.id ? "1px solid var(--teal)" : "1px solid var(--line)",
                background: filter === f.id ? "var(--teal-soft)" : "#fff",
                color: filter === f.id ? "var(--teal)" : "var(--ink-2)",
                fontSize: "var(--t-body-sm)",
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {f.label}
              <span className="eng-count" style={{ fontSize: 10, color: "var(--ink-3)", marginLeft: 2 }}>{counts[f.id]}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="cust-empty" style={{ padding: "48px 24px", textAlign: "center", background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div className="cust-empty-ic" style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--bg-2)", display: "grid", placeItems: "center" }}>
              <I.bell />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 15, fontWeight: 600 }}>You're all caught up</strong>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
                No {filter !== 'all' ? filter + ' ' : ''}notifications right now.
              </div>
            </div>
          </div>
        ) : (
          Object.entries(groups).map(([day, items]) => (
            <div key={day} className="nt-group">
              <div className="nt-day">{day}</div>
              <div className="nt-list">
                {items.map(n => {
                  const kind = KINDS[n.kind] || { icon: 'bell', tone: 'neutral', label: 'Notification' };
                  const IconComponent = I[kind.icon];
                  return (
                    <div
                      key={n.id}
                      className={`nt-row ${n.unread ? 'unread' : ''}`}
                      onClick={() => {
                        markRead(n.id);
                        router.push(n.link);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {n.actor ? (
                        <div className={`avatar md tone-${n.actor.tone}`} style={{ position: 'relative', width: 40, height: 40 }}>
                          {n.actor.initials}
                          <span className={`nt-kind-dot tone-${kind.tone}`}>{IconComponent && <IconComponent />}</span>
                        </div>
                      ) : (
                        <div className={`nt-kind-ic tone-${kind.tone}`} style={{ width: 40, height: 40 }}>
                          {IconComponent && <IconComponent />}
                        </div>
                      )}
                      <div className="nt-body">
                        <div className="nt-title">
                          {n.unread && <span className="nt-dot"></span>}
                          {n.title}
                        </div>
                        <div className="nt-meta">{n.meta}</div>
                      </div>
                      <div className="nt-side">
                        <div className="nt-ts mono">{n.ts}</div>
                        <button
                          className="nt-dismiss"
                          onClick={(e) => dismiss(n.id, e)}
                          aria-label="Dismiss"
                        >
                          <I.x />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>

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

      {/* Bottom Nav Bar */}
      <nav className="bottom-nav">
        <Link href="/dashboard" className="bn-item">
          <I.home />
          <span>Home</span>
        </Link>
        <Link href="/dashboard/bookings" className="bn-item">
          <I.calendar />
          <span>Bookings</span>
        </Link>
        <Link href="/dashboard/customers" className="bn-item">
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
    </div>
  );
}
