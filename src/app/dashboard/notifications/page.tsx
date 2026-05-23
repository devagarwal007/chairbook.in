"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useProfile } from "@/context/ProfileContext";

import { Icons as I } from "@/components/ui/Icons";


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
  dbId?: string;
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
              dbId: n.id,
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

  const markRead = async (id: number) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    if (salonId) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        try {
          const notif = notifs.find(n => n.id === id);
          if (notif && notif.dbId) {
            await supabase
              .from("notifications")
              .update({ read: true })
              .eq("id", notif.dbId);
          }
        } catch (err) {
          console.error("Error marking notification read:", err);
        }
      }
    }
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

  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, unread: false })));
    flashMsg('All marked as read');
    if (salonId) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        try {
          await supabase
            .from("notifications")
            .update({ read: true })
            .eq("salon_id", salonId)
            .eq("read", false);
        } catch (err) {
          console.error("Error marking all notifications read:", err);
        }
      }
    }
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

  if (loading) {
    return (
      <div className="app">
        <div className="app-top">
          <div className="app-top-inner">
            <div className="brand" style={{ display: "flex", alignItems: "center" }}>
              <div className="pulse" style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg-2)" }} />
              <div className="pulse" style={{ width: 120, height: 16, borderRadius: 4, marginLeft: 8, background: "var(--bg-2)" }} />
            </div>
            <div className="greeting">
              <div className="pulse" style={{ width: 160, height: 20, borderRadius: 4, background: "var(--bg-2)" }} />
              <div className="pulse" style={{ width: 240, height: 12, borderRadius: 3, marginTop: 6, background: "var(--bg-2)" }} />
            </div>
          </div>
        </div>
        <main className="app-main" style={{ paddingBottom: 100, maxWidth: 760, margin: "0 auto" }}>
          {/* Filter pills skeleton */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, paddingBottom: 6, borderBottom: "1px solid var(--line)" }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="pulse" style={{ width: 80, height: 34, borderRadius: 8, background: "var(--bg-2)" }} />
            ))}
          </div>
          {/* Day group skeleton */}
          <div style={{ marginBottom: 22 }}>
            <div className="pulse" style={{ width: 60, height: 10, borderRadius: 3, marginBottom: 8, background: "var(--bg-2)" }} />
            <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
                  <div className="pulse" style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-2)" }} />
                  <div>
                    <div className="pulse" style={{ width: 180, height: 14, borderRadius: 4, background: "var(--bg-2)" }} />
                    <div className="pulse" style={{ width: 240, height: 10, borderRadius: 3, marginTop: 6, background: "var(--bg-2)" }} />
                  </div>
                  <div className="pulse" style={{ width: 50, height: 12, borderRadius: 3, background: "var(--bg-2)" }} />
                </div>
              ))}
            </div>
          </div>
        </main>
        <nav className="bottom-nav">
          {["Home", "Bookings", "Customers", "Insights", "Settings"].map(t => (
            <span key={t} className="bn-item"><span>{t}</span></span>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-top">
        <div className="app-top-inner">
          <div className="brand" style={{ display: "flex", alignItems: "center" }}>
            <button
              className="book-back"
              onClick={() => router.back()}
              aria-label="Back"
              style={{ border: "none", cursor: "pointer", background: "transparent", display: "inline-grid", placeItems: "center", width: 36, height: 36, color: "var(--ink)" }}
            >
              <I.back />
            </button>
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
