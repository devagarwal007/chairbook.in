"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { getNotificationTypeFilter } from "@/lib/notification-filters";
import { mapDbNotificationToItem } from "@/lib/notification-routing";
import { NOTIFICATION_SELECT } from "@/lib/supabase-selects";
import { useProfile } from "@/context/ProfileContext";
import { useToast } from "@/context/ToastContext";

import { Icons as I } from "@/components/ui/Icons";
import type { NotificationItem, DbNotification } from "@/types";


import { KINDS, INITIAL_NOTIFS, FILTERS } from "@/constants/notifications";

const NOTIFICATION_PAGE_SIZE = 50;

export default function NotificationsPage() {
  const router = useRouter();
  const { salonId } = useProfile();
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [totalNotifs, setTotalNotifs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState('all');
  const { show: flashMsg } = useToast();

  const loadFallbackNotifs = useCallback(() => {
    const stored = localStorage.getItem("cb_notifications");
    let fallbackNotifs = INITIAL_NOTIFS;

    if (stored) {
      try {
        fallbackNotifs = JSON.parse(stored);
      } catch {
        fallbackNotifs = INITIAL_NOTIFS;
      }
    } else {
      localStorage.setItem("cb_notifications", JSON.stringify(INITIAL_NOTIFS));
    }

    setNotifs(fallbackNotifs);
    setTotalNotifs(fallbackNotifs.length);
    setLoading(false);
  }, []);

  const fetchNotificationPage = useCallback(async (offset: number, signal?: AbortSignal) => {
    if (!salonId) throw new Error("Missing salon id.");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    let query = supabase
      .from("notifications")
      .select(NOTIFICATION_SELECT, { count: "exact" })
      .eq("salon_id", salonId);

    if (filter === "unread") {
      query = query.eq("read", false);
    }

    const typeFilter = getNotificationTypeFilter(filter);
    if (typeFilter) {
      query = query.in("type", typeFilter);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + NOTIFICATION_PAGE_SIZE - 1)
      .abortSignal(signal ?? new AbortController().signal);

    if (signal?.aborted) {
      return { items: [], total: 0 };
    }
    if (error) throw error;

    return {
      items: (data || []).map((n, i: number) => mapDbNotificationToItem(n as unknown as DbNotification, offset + i)),
      total: count || 0,
    };
  }, [filter, salonId]);

  // Load notifications from DB or localStorage fallback
  useEffect(() => {
    if (!salonId) {
      queueMicrotask(() => {
        loadFallbackNotifs();
      });
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      queueMicrotask(() => {
        loadFallbackNotifs();
      });
      return;
    }

    const controller = new AbortController();

    const loadNotifs = async () => {
      setLoading(true);
      try {
        const { items, total } = await fetchNotificationPage(0, controller.signal);
        if (controller.signal.aborted) return;
        setNotifs(items);
        setTotalNotifs(total);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error loading notifications:", err);
        if (!controller.signal.aborted) loadFallbackNotifs();
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadNotifs();

    return () => {
      controller.abort();
    };
  }, [fetchNotificationPage, loadFallbackNotifs, salonId]);



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
      bookings: notifs.filter(n => ['new_booking','walk_in','status_update','confirmed','rescheduled','cancelled'].includes(n.kind)).length,
      alerts:   notifs.filter(n => ['noshow','attendance_correction'].includes(n.kind)).length,
      payments: notifs.filter(n => n.kind === 'payment').length,
      wa:       notifs.filter(n => ['wa_reply','review'].includes(n.kind)).length,
    };
    out[filter] = totalNotifs;
    return out;
  }, [filter, notifs, totalNotifs]);

  const hasMoreNotifs = Boolean(salonId) && notifs.length < totalNotifs;

  const loadMoreNotifs = async () => {
    if (!salonId || loadingMore) return;
    const controller = new AbortController();
    setLoadingMore(true);
    try {
      const { items, total } = await fetchNotificationPage(notifs.length, controller.signal);
      setNotifs(prev => [...prev, ...items]);
      setTotalNotifs(total);
    } catch (err) {
      console.error("Error loading more notifications:", err);
      flashMsg("Could not load more notifications.", 2500);
    } finally {
      setLoadingMore(false);
    }
  };

  const markRead = async (id: number) => {
    setNotifs(prev => {
      const next = filter === "unread"
        ? prev.filter(n => n.id !== id)
        : prev.map(n => n.id === id ? { ...n, unread: false } : n);
      localStorage.setItem("cb_notifications", JSON.stringify(next));
      return next;
    });
    if (filter === "unread") {
      setTotalNotifs(prev => Math.max(0, prev - 1));
    }
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
    setNotifs(prev => {
      const next = filter === "unread" ? [] : prev.map(n => ({ ...n, unread: false }));
      localStorage.setItem("cb_notifications", JSON.stringify(next));
      return next;
    });
    if (filter === "unread") setTotalNotifs(0);
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
    setNotifs(prev => {
      const next = prev.filter(n => n.id !== id);
      localStorage.setItem("cb_notifications", JSON.stringify(next));
      return next;
    });
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
              {counts.unread > 0 && <span className="inline-block text-[10px] bg-rose-soft text-rose py-0.5 px-2 rounded-full font-semibold align-middle">{counts.unread} unread</span>}
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
        <div className="flex items-center gap-2 pb-1.5 mb-4 border-b border-line overflow-x-auto max-[720px]:mx-[-16px] max-[720px]:px-4 [&::-webkit-scrollbar]:hidden">
          {FILTERS.map(f => (
            <button
              key={f.id}
              className={`flex items-center gap-1.5 py-2 px-3 rounded-sm border text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all duration-150 ${
                filter === f.id 
                  ? "border-teal bg-teal-soft text-teal" 
                  : "border-line bg-white text-ink-2 hover:border-line-2"
              }`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="text-[10px] text-ink-3 ml-0.5">{counts[f.id]}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 px-6 text-center bg-white border border-line rounded-xl flex flex-col items-center justify-center gap-3">
            <div className="w-11 h-11 rounded-full bg-bg-2 grid place-items-center">
              <I.bell />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{"You're all caught up"}</strong>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
                No {filter !== 'all' ? filter + ' ' : ''}notifications right now.
              </div>
            </div>
          </div>
        ) : (
          Object.entries(groups).map(([day, items]) => (
            <div key={day} className="mb-2">
              <div className="text-[11px] font-bold text-ink-3 uppercase tracking-[0.07em] py-3 px-0 pb-1.5">{day}</div>
              <div className="flex flex-col gap-0 border border-line rounded-lg overflow-hidden bg-white">
                {items.map(n => {
                  const kind = KINDS[n.kind as keyof typeof KINDS] || { icon: 'bell' as const, tone: 'neutral', label: 'Notification' };
                  const IconComponent = I[kind.icon as keyof typeof I];
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 p-[14px_16px] border-b border-line last:border-b-0 transition-colors duration-120 relative hover:bg-bg-2 max-[540px]:p-3 max-[540px]:gap-2.5 ${n.unread ? 'bg-[#f7fbf9] hover:bg-teal-soft' : 'bg-white'}`}
                      onClick={() => {
                        markRead(n.id);
                        router.push(n.link);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {n.actor ? (
                        <div className={`avatar md tone-${n.actor.tone}`} style={{ position: 'relative', width: 40, height: 40 }}>
                          {n.actor.initials}
                          <span className={`absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full grid place-items-center border-2 border-white [&>svg]:w-2.25 [&>svg]:h-2.25 ${
                            kind.tone === 'teal' ? 'bg-teal text-white' :
                            kind.tone === 'amber' ? 'bg-amber text-white' :
                            kind.tone === 'rose' ? 'bg-rose text-white' :
                            kind.tone === 'blue' ? 'bg-blue text-white' :
                            kind.tone === 'green' ? 'bg-green text-white' :
                            kind.tone === 'neutral' ? 'bg-ink-3 text-white' :
                            kind.tone === 'wa' ? 'bg-wa text-white' : ''
                          }`}>{IconComponent && <IconComponent />}</span>
                        </div>
                      ) : (
                        <div className={`w-10 h-10 min-w-10 rounded-[10px] grid place-items-center shrink-0 ${
                          kind.tone === 'teal' ? 'bg-teal-soft text-teal' :
                          kind.tone === 'amber' ? 'bg-amber-soft text-amber-ink' :
                          kind.tone === 'rose' ? 'bg-rose-soft text-rose' :
                          kind.tone === 'blue' ? 'bg-blue-soft text-blue' :
                          kind.tone === 'green' ? 'bg-green-soft text-green' :
                          kind.tone === 'neutral' ? 'bg-bg-2 text-ink-3' :
                          kind.tone === 'wa' ? 'bg-wa-soft text-wa' : ''
                        }`}>
                          {IconComponent && <IconComponent />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-ink leading-[1.4] flex items-center gap-1.5 flex-wrap">
                          {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0 inline-block"></span>}
                          {n.title}
                        </div>
                        <div className="text-xs text-ink-3 mt-0.75 leading-[1.45] whitespace-nowrap overflow-hidden text-ellipsis max-[540px]:text-[11px]">{n.meta}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0 min-w-[50px]">
                        <div className="text-[11px] text-ink-4 whitespace-nowrap tabular-nums max-[540px]:text-[10px] mono">{n.ts}</div>
                        <button
                          className="w-5.5 h-5.5 rounded-md border border-line bg-transparent grid place-items-center cursor-pointer text-ink-3 transition-all duration-100 p-0 hover:bg-rose-soft hover:text-rose hover:border-rose"
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

        {salonId && totalNotifs > 0 && (
          <div className="flex items-center justify-between gap-3 mt-4 text-[13px] text-ink-2 max-[540px]:flex-col max-[540px]:items-stretch">
            <span className="text-ink-3">
              Showing {notifs.length} of {totalNotifs} notifications
            </span>
            {hasMoreNotifs && (
              <button
                type="button"
                onClick={loadMoreNotifs}
                disabled={loadingMore}
                className="h-9 px-3 rounded-[8px] border border-line bg-white text-ink disabled:opacity-45 disabled:cursor-not-allowed hover:border-line-2 transition-colors duration-150"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        )}
      </main>

    </div>
  );
}
