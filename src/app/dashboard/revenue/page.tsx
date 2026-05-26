"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import { useProfile } from "@/context/ProfileContext";
import { Icons as I } from "@/components/ui/Icons";
import { getActualServiceMinutes, isRunningLate, mapDbStatusToUiStatus, minutesBetween } from "@/lib/booking-progress";
import { formatDateKey } from "@/lib/utils";
import { PeriodData, DbAnalyticsBooking } from "@/types";

const IR = I;



import { PERIODS_MOCK } from "@/constants/revenue";

const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");

// ===== METRIC BIG COMPONENT =====
interface MetricBigProps {
  label: string;
  icon: React.ReactNode;
  value: string | number;
  prefix?: string;
  suffix?: string;
  delta?: string;
  tone?: "up" | "down" | "flat";
  compare?: string;
}

function MetricBig({ label, icon, value, prefix, suffix, delta, tone, compare }: MetricBigProps) {
  return (
    <div className="metric metric-big">
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
          <span className={tone === "down" ? "down" : tone === "flat" ? "" : "up"}>
            {tone === "up" && "↑"}{tone === "down" && "↓"}{tone === "flat" && "→"} {delta}
          </span>
          <span style={{ color: "var(--ink-3)" }}>{compare}</span>
        </div>
      )}
    </div>
  );
}

// ===== BAR CHART COMPONENT =====
interface BarChartProps {
  data: { x: string; v: number }[];
  highlightIdx: number;
}

function BarChart({ data, highlightIdx }: BarChartProps) {
  const W = 720, H = 200, padL = 30, padR = 20, padT = 16, padB = 32;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(...data.map((d) => d.v), 1);
  const yTicks = 4;
  const niceMax = Math.ceil(max / 1000) * 1000 || 1000;
  const barW = (innerW / data.length) * 0.7;
  const gap = (innerW / data.length) * 0.3;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="bar-chart" preserveAspectRatio="none" style={{ width: "100%", height: "220px", display: "block" }}>
      {/* horizontal grid lines */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = padT + (innerH / yTicks) * i;
        const val = niceMax * (1 - i / yTicks);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--line)" strokeWidth="1" />
            <text x={padL - 6} y={y + 3} fontSize="10" textAnchor="end" fill="var(--ink-3)" fontFamily="JetBrains Mono">
              {val >= 1000 ? `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k` : val}
            </text>
          </g>
        );
      })}

      {/* bars */}
      {data.map((d, i) => {
        const x = padL + (innerW / data.length) * i + gap / 2;
        const h = (d.v / niceMax) * innerH;
        const y = padT + innerH - h;
        const isHi = i === highlightIdx;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} fill={isHi ? "var(--teal)" : "var(--teal-soft)"} rx="4" />
            {d.v > 0 && (
              <text
                x={x + barW / 2}
                y={y - 6}
                fontSize="10"
                textAnchor="middle"
                fill={isHi ? "var(--teal-ink)" : "var(--ink-3)"}
                fontFamily="JetBrains Mono"
                fontWeight={isHi ? 600 : 400}
              >
                ₹{d.v >= 1000 ? `${(d.v / 1000).toFixed(d.v >= 10000 ? 0 : 1)}k` : d.v}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={H - padB + 16}
              fontSize="11"
              textAnchor="middle"
              fill={isHi ? "var(--ink)" : "var(--ink-3)"}
              fontFamily="JetBrains Mono"
              fontWeight={isHi ? 600 : 500}
            >
              {d.x}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ===== RANKED LIST COMPONENT =====
interface RankedListProps {
  rows: Array<{ name: string; bookings: number; revenue: number; share: number; tone?: string; color?: string }>;
  type: "service" | "stylist";
}

function RankedList({ rows, type }: RankedListProps) {
  return (
    <div className="ranked">
      {rows.map((r, i) => (
        <div key={i} className="ranked-row">
          <div className="rk-rank">{String(i + 1).padStart(2, "0")}</div>
          <div className="rk-bar-col">
            <div className="rk-row-top">
              {type === "stylist" && (
                <span className={`avatar sm tone-${r.tone || "b"}`} style={{ width: 20, height: 20, fontSize: 10, border: 0, borderRadius: "50%", display: "inline-grid", placeItems: "center", fontWeight: "bold", marginRight: 4 }}>
                  {r.name[0]}
                </span>
              )}
              <div className="rk-name">{r.name}</div>
              <div className="rk-val">{type === "service" ? `₹${fmt(r.revenue)}` : `${r.bookings} booking${r.bookings === 1 ? "" : "s"}`}</div>
            </div>
            <div className="rk-bar">
              <div className={`rk-bar-fill rk-${r.color || "teal"}`} style={{ width: `${r.share}%` }}></div>
            </div>
            <div className="rk-meta">
              <span>{type === "service" ? `${r.bookings} booking${r.bookings === 1 ? "" : "s"}` : `₹${fmt(r.revenue)} earned`}</span>
              <span className="mono" style={{ color: "var(--ink-3)" }}>
                {r.share}%
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== MAIN PAGE =====
export default function InsightsPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");
  const { salonId, loading: profileLoading } = useProfile();
  const [dbData, setDbData] = useState<Record<string, PeriodData> | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch payments and booking stats from Supabase
  useEffect(() => {
    if (profileLoading) return;
    if (!salonId) {
      queueMicrotask(() => {
        setLoading(false);
      });
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      queueMicrotask(() => {
        setLoading(false);
      });
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const rangeEnd = new Date();
        const rangeStart = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth() - 1, 1);

        const { data: bookingsData, error } = await supabase
          .from("bookings")
          .select(`
            id,
            date,
            start_time,
            duration,
            status,
            payment_status,
            amount_paid,
            amount_due,
            bill_total,
            customer_id,
            stylist_id,
            created_at,
            arrived_at,
            started_at,
            completed_at,
            actual_duration_minutes,
            customer:customers (id, name, created_at),
            stylist:stylists (id, name, tone),
            booking_services (
              qty,
              price_at_booking,
              service:services (id, name, category)
            ),
            payments (
              amount,
              tip,
              discount,
              tax,
              method
            )
          `)
          .eq("salon_id", salonId)
          .gte("date", formatDateKey(rangeStart))
          .lte("date", formatDateKey(rangeEnd));



        if (error) throw error;
        if (!bookingsData || bookingsData.length === 0) {
          queueMicrotask(() => {
            setLoading(false);
          });
          return;
        }

        const refDate = new Date();
        const refDateStr = formatDateKey(refDate);

        const parseDateKey = (value: string) => {
          const [year, month, day] = value.split("-").map(Number);
          return new Date(year, (month || 1) - 1, day || 1);
        };

        const getPastDate = (days: number) => {
          const d = new Date(refDate);
          d.setDate(d.getDate() - days);
          return d;
        };

        const todayStart = new Date(refDateStr);
        const todayEnd = new Date(refDateStr + "T23:59:59");
        const yesterdayStart = getPastDate(1);
        yesterdayStart.setHours(0,0,0,0);
        const yesterdayEnd = getPastDate(1);
        yesterdayEnd.setHours(23,59,59,999);

        // Week (last 7 days ending today)
        const weekStart = getPastDate(6);
        weekStart.setHours(0,0,0,0);
        const prevWeekStart = getPastDate(13);
        prevWeekStart.setHours(0,0,0,0);
        const prevWeekEnd = getPastDate(7);
        prevWeekEnd.setHours(23,59,59,999);

        // Month (this calendar month)
        const monthStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
        const prevMonthStart = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
        const prevMonthEnd = new Date(refDate.getFullYear(), refDate.getMonth(), 0, 23, 59, 59, 999);

        // Aggregate helper
        const calculateStats = (filteredBookings: DbAnalyticsBooking[], compareBookings: DbAnalyticsBooking[], rangeLabel: string, compLabel: string, periodType: "today" | "week" | "month"): PeriodData => {
          const getPaidAmount = (b: DbAnalyticsBooking) => {
            const payments = Array.isArray(b.payments) ? b.payments : [];
            const ledgerPaid = payments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
            return ledgerPaid || Number(b.amount_paid || 0);
          };

          const getRevenue = (list: DbAnalyticsBooking[]) =>
            list.reduce((acc, b) => {
              if (b.status === "Cancelled" || b.status === "No-show") return acc;
              return acc + getPaidAmount(b);
            }, 0);

          const getBookingsCount = (list: DbAnalyticsBooking[]) => list.filter(b => b.status !== "Cancelled").length;

          const getNewCustCount = (list: DbAnalyticsBooking[], start: Date, end: Date) => {
            const custs = list.map(b => b.customer).filter((c): c is NonNullable<typeof c> => !!c);
            const uniqueCusts = Array.from(new Map(custs.map(c => [c.id, c])).values());
            return uniqueCusts.filter((c) => {
              const cat = new Date(c.created_at);
              return cat >= start && cat <= end;
            }).length;
          };

          const getNoShowRate = (list: DbAnalyticsBooking[]) => {
            const total = list.filter(b => b.status !== "Cancelled").length;
            if (total === 0) return 0;
            const noShow = list.filter(b => b.status === "No-show").length;
            return (noShow / total) * 100;
          };

          const average = (list: number[]) =>
            list.length > 0 ? Math.round(list.reduce((sum, n) => sum + n, 0) / list.length) : null;
          const getEstimatedMinutes = (b: DbAnalyticsBooking) => Number(b.duration || 0) || null;
          const getActualMinutes = (b: DbAnalyticsBooking) =>
            getActualServiceMinutes({
              startedAt: b.started_at,
              completedAt: b.completed_at,
              actualDurationMinutes: b.actual_duration_minutes,
            }) ?? minutesBetween(b.started_at, b.completed_at);
          const timedRows = filteredBookings
            .map((b) => ({ booking: b, actual: getActualMinutes(b), estimate: getEstimatedMinutes(b) }))
            .filter((row): row is { booking: DbAnalyticsBooking; actual: number; estimate: number } =>
              row.actual !== null && row.estimate !== null && row.estimate > 0
            );
          const avgActual = average(timedRows.map((row) => row.actual));
          const avgEstimate = average(timedRows.map((row) => row.estimate));
          const serviceDelta = avgActual !== null && avgEstimate !== null ? avgActual - avgEstimate : null;
          const todayKey = new Date().toISOString().slice(0, 10);
          const now = new Date();
          const nowMinute = now.getHours() * 60 + now.getMinutes();
          const runningLate = filteredBookings.filter((b) => {
            const estimated = getEstimatedMinutes(b);
            if (!estimated || b.date !== todayKey) return false;
            return isRunningLate(mapDbStatusToUiStatus(b.status), b.start_time, estimated, nowMinute);
          }).length;

          const stylistTiming = new Map<string, { name: string; count: number; onTime: number; actualTotal: number }>();
          timedRows.forEach(({ booking, actual, estimate }) => {
            const stylistName = booking.stylist?.name || "Unassigned";
            const current = stylistTiming.get(stylistName) || { name: stylistName, count: 0, onTime: 0, actualTotal: 0 };
            current.count += 1;
            current.actualTotal += actual;
            if (actual <= estimate + 5) current.onTime += 1;
            stylistTiming.set(stylistName, current);
          });
          const bestOnTimeStylist = Array.from(stylistTiming.values())
            .filter((stat) => stat.count >= 3)
            .sort((a, b) => (b.onTime / b.count) - (a.onTime / a.count) || (a.actualTotal / a.count) - (b.actualTotal / b.count))[0]?.name || null;

          const rev = getRevenue(filteredBookings);
          const revCompare = getRevenue(compareBookings);
          const bCount = getBookingsCount(filteredBookings);
          const bCountCompare = getBookingsCount(compareBookings);
          
          let startD = todayStart;
          let endD = todayEnd;
          let compStartD = yesterdayStart;
          let compEndD = yesterdayEnd;

          if (periodType === "week") {
            startD = weekStart;
            endD = todayEnd;
            compStartD = prevWeekStart;
            compEndD = prevWeekEnd;
          } else if (periodType === "month") {
            startD = monthStart;
            endD = todayEnd;
            compStartD = prevMonthStart;
            compEndD = prevMonthEnd;
          }

          const nCust = getNewCustCount(filteredBookings, startD, endD);
          const nCustCompare = getNewCustCount(compareBookings, compStartD, compEndD);
          const nsRate = getNoShowRate(filteredBookings);
          const nsRateCompare = getNoShowRate(compareBookings);

          const formatPercentDelta = (cur: number, prev: number) => {
            if (prev === 0) return cur > 0 ? "+100%" : "same";
            const diff = ((cur - prev) / prev) * 100;
            return diff === 0 ? "same" : `${diff > 0 ? "+" : ""}${Math.round(diff)}%`;
          };

          const formatCountDelta = (cur: number, prev: number) => {
            const diff = cur - prev;
            return diff === 0 ? "same" : `${diff > 0 ? "+" : ""}${diff}`;
          };

          const formatRateDelta = (cur: number, prev: number) => {
            const diff = cur - prev;
            return diff === 0 ? "same" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}pp`;
          };

          // Chart data
          let chartData: { x: string; v: number }[] = [];
          if (periodType === "today") {
            const hours = ["9 AM", "10", "11", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM"];
            chartData = hours.map(h => {
              const hrNum = h.includes("AM") ? parseInt(h) : h.includes("PM") ? (parseInt(h) === 12 ? 12 : parseInt(h) + 12) : parseInt(h);
              const hrBookings = filteredBookings.filter(b => parseInt(b.start_time.split(":")[0]) === hrNum);
              return { x: h, v: getRevenue(hrBookings) };
            });
          } else if (periodType === "week") {
            const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
            chartData = days.map((dayLabel, index) => {
              const targetDay = (index + 1) % 7; // Sunday is 0, Monday is 1...
              const dayBookings = filteredBookings.filter(b => {
                const bd = parseDateKey(b.date);
                return bd.getDay() === targetDay;
              });
              return { x: dayLabel, v: getRevenue(dayBookings) };
            });
          } else if (periodType === "month") {
            const weeks = ["W1", "W2", "W3", "W4"];
            chartData = weeks.map((wLabel, index) => {
              const weekBookings = filteredBookings.filter(b => {
                const bd = parseDateKey(b.date);
                const dom = bd.getDate();
                if (index === 0) return dom >= 1 && dom <= 7;
                if (index === 1) return dom >= 8 && dom <= 14;
                if (index === 2) return dom >= 15 && dom <= 21;
                return dom >= 22;
              });
              return { x: wLabel, v: getRevenue(weekBookings) };
            });
          }

          const highestIdx = chartData.reduce((maxIdx, d, idx, arr) => (d.v > arr[maxIdx].v ? idx : maxIdx), 0);

          // Top Services
          const serviceMap: Record<string, { revenue: number; bookings: number }> = {};
          filteredBookings.forEach(b => {
            if (b.status === "Cancelled" || b.status === "No-show") return;
            const serviceSubtotal = b.booking_services?.reduce((sum, bs) => sum + Number(bs.price_at_booking) * (bs.qty || 1), 0) || 0;
            const paidRatio = serviceSubtotal > 0 ? getPaidAmount(b) / serviceSubtotal : 0;
            b.booking_services?.forEach((bs) => {
              const name = bs.service?.name || "Other Service";
              if (!serviceMap[name]) serviceMap[name] = { revenue: 0, bookings: 0 };
              serviceMap[name].revenue += Number(bs.price_at_booking) * (bs.qty || 1) * paidRatio;
              serviceMap[name].bookings += 1;
            });
          });

          const totalSvcRevenue = Object.values(serviceMap).reduce((sum, s) => sum + s.revenue, 0) || 1;
          const colors = ["teal", "amber", "blue", "rose", "gray"];
          const topServices = Object.entries(serviceMap)
            .map(([name, stat]) => ({
              name,
              revenue: stat.revenue,
              bookings: stat.bookings,
              share: Math.round((stat.revenue / totalSvcRevenue) * 100),
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
            .map((svc, i) => ({ ...svc, color: colors[i] || "gray" }));

          // Top Stylists
          const stylistMap: Record<string, { name: string; tone: string; bookings: number; revenue: number }> = {};
          filteredBookings.forEach(b => {
            if (b.status === "Cancelled" || b.status === "No-show") return;
            const sName = b.stylist?.name || "Unassigned";
            const sTone = b.stylist?.tone ? b.stylist.tone.replace("tone-", "") : "b";
            if (!stylistMap[sName]) stylistMap[sName] = { name: sName, tone: sTone, bookings: 0, revenue: 0 };
            stylistMap[sName].bookings += 1;
            stylistMap[sName].revenue += getPaidAmount(b);
          });

          const totalStylistRevenue = Object.values(stylistMap).reduce((sum, s) => sum + s.revenue, 0) || 1;
          const topStylists = Object.values(stylistMap)
            .map(stat => ({
              name: stat.name,
              tone: stat.tone,
              bookings: stat.bookings,
              revenue: stat.revenue,
              share: Math.round((stat.revenue / totalStylistRevenue) * 100),
            }))
            .sort((a, b) => b.bookings - a.bookings)
            .slice(0, 4);

          return {
            label: periodType === "today" ? "Today" : periodType === "week" ? "This week" : "This month",
            dateRange: rangeLabel,
            compareLabel: compLabel,
            metrics: {
              revenue: { value: rev, delta: formatPercentDelta(rev, revCompare), tone: rev >= revCompare ? "up" : "down" },
              bookings: { value: bCount, delta: formatCountDelta(bCount, bCountCompare), tone: bCount >= bCountCompare ? "up" : "down" },
              newCust: { value: nCust, delta: formatCountDelta(nCust, nCustCompare), tone: nCust >= nCustCompare ? "up" : "down" },
              noShow: { value: nsRate, delta: formatRateDelta(nsRate, nsRateCompare), tone: nsRate <= nsRateCompare ? "up" : "down", unit: "%" },
              serviceTime: {
                value: avgActual || 0,
                delta: serviceDelta === null ? "no data" : serviceDelta === 0 ? "on estimate" : `${Math.abs(serviceDelta)}m ${serviceDelta > 0 ? "over" : "under"}`,
                tone: serviceDelta === null ? "flat" : serviceDelta <= 0 ? "up" : "down",
                compare: avgEstimate !== null ? `${avgEstimate}m estimate` : "needs completed services",
                unit: "min",
              },
            },
            timing: {
              avgActualMinutes: avgActual,
              avgEstimatedMinutes: avgEstimate,
              completedWithTiming: timedRows.length,
              runningLate,
              bestOnTimeStylist,
            },
            chart: {
              title: periodType === "today" ? "Revenue by hour" : periodType === "week" ? "Revenue by day" : "Revenue by week",
              data: chartData,
              highlight: highestIdx,
            },
            topServices,
            topStylists,
          };
        };

        // Filter and calculate
        const filterBookings = (start: Date, end: Date) => {
          const startKey = formatDateKey(start);
          const endKey = formatDateKey(end);
          return (bookingsData as unknown as DbAnalyticsBooking[]).filter(b => {
            return b.date >= startKey && b.date <= endKey;
          });
        };

        const todayList = filterBookings(todayStart, todayEnd);
        const yesterdayList = filterBookings(yesterdayStart, yesterdayEnd);
        const weekList = filterBookings(weekStart, todayEnd);
        const prevWeekList = filterBookings(prevWeekStart, prevWeekEnd);
        const monthList = filterBookings(monthStart, todayEnd);
        const prevMonthList = filterBookings(prevMonthStart, prevMonthEnd);

        const todayObj = calculateStats(
          todayList,
          yesterdayList,
          refDate.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
          "vs. yesterday",
          "today"
        );

        const formatWeekRange = (start: Date, end: Date) => {
          const s = start.getDate();
          const e = end.getDate();
          const m = end.toLocaleDateString("en-US", { month: "short", year: "numeric" });
          return `${s} – ${e} ${m}`;
        };

        const weekObj = calculateStats(
          weekList,
          prevWeekList,
          formatWeekRange(weekStart, refDate),
          "vs. last week",
          "week"
        );

        const monthObj = calculateStats(
          monthList,
          prevMonthList,
          `1 – ${refDate.getDate()} ${refDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })} · so far`,
          "vs. last month",
          "month"
        );

        setDbData({
          today: todayObj,
          week: weekObj,
          month: monthObj,
        });
      } catch (err) {
        console.error("Error computing analytics data from Supabase:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [salonId, profileLoading]);

  // Use dynamic database data if loaded and has records, else fall back to mock data
  const p = useMemo(() => {
    if (dbData && dbData[period]) {
      // Check if we actually have any bookings or if the DB analytics yielded non-zero values
      const data = dbData[period];
      if (data.metrics.revenue.value > 0 || data.metrics.bookings.value > 0) {
        return data;
      }
    }
    return PERIODS_MOCK[period];
  }, [dbData, period]);

  if (loading) {
    return (
      <div className="app animate-fade-in">
        <Header
          title="Insights"
          subtitle="LOADING INSIGHTS..."
          actions={
            <button className="icon-btn" aria-label="Download analytics" disabled style={{ opacity: 0.5 }}>
              <IR.download />
            </button>
          }
        />

        <main className="app-main">
          {/* Period toggle skeleton */}
          <div className="rev-period" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div className="toggle big" style={{ pointerEvents: "none", display: "flex", gap: 2 }}>
              <button className="on" style={{ opacity: 0.6 }}>Today</button>
              <button style={{ opacity: 0.6 }}>This Week</button>
              <button style={{ opacity: 0.6 }}>This Month</button>
            </div>
            <div className="pulse" style={{ width: 140, height: 16, borderRadius: 4 }} />
          </div>

          {/* 2x2 Metric grid */}
          <div className="metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 20 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="metric metric-big" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <div className="pulse" style={{ width: 16, height: 16, borderRadius: "50%" }} />
                  <div className="pulse" style={{ width: 80, height: 12, borderRadius: 3 }} />
                </div>
                <div className="pulse" style={{ width: 120, height: 32, borderRadius: 6, marginBottom: 12 }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <div className="pulse" style={{ width: 40, height: 12, borderRadius: 3 }} />
                  <div className="pulse" style={{ width: 80, height: 12, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Bar chart skeleton */}
          <div className="rev-chart card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div className="section-head" style={{ marginBottom: 24 }}>
              <div className="l">
                <div className="pulse" style={{ width: 150, height: 20, borderRadius: 4 }} />
                <div className="pulse" style={{ width: 220, height: 12, borderRadius: 3, marginTop: 8 }} />
              </div>
            </div>
            {/* 7 columns representing days of the week, with a styled bar skeleton */}
            <div style={{ display: "flex", alignItems: "flex-end", height: 160, padding: "0 20px 20px 20px", gap: 24, borderBottom: "1px solid var(--line)" }}>
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div className="pulse" style={{ width: "100%", height: `${30 + (i * 15)}px`, borderRadius: "4px 4px 0 0", opacity: 0.7 }} />
                  <div className="pulse" style={{ width: 30, height: 10, borderRadius: 3 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Two ranked lists */}
          <div className="rev-rank-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            <div className="card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 20 }}>
              <div className="section-head" style={{ marginBottom: 16 }}>
                <div className="l">
                  <div className="pulse" style={{ width: 120, height: 18, borderRadius: 4 }} />
                  <div className="pulse" style={{ width: 60, height: 12, borderRadius: 3, marginTop: 6 }} />
                </div>
              </div>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "14px 0", borderBottom: i < 5 ? "1px solid var(--bg-2)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div className="pulse" style={{ width: 100, height: 14, borderRadius: 4 }} />
                    <div className="pulse" style={{ width: 50, height: 14, borderRadius: 4 }} />
                  </div>
                  <div className="pulse" style={{ width: "100%", height: 6, borderRadius: 3, marginTop: 6 }} />
                  <div className="pulse" style={{ width: 80, height: 10, borderRadius: 3, marginTop: 4 }} />
                </div>
              ))}
            </div>
            <div className="card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 20 }}>
              <div className="section-head" style={{ marginBottom: 16 }}>
                <div className="l">
                  <div className="pulse" style={{ width: 120, height: 18, borderRadius: 4 }} />
                  <div className="pulse" style={{ width: 60, height: 12, borderRadius: 3, marginTop: 6 }} />
                </div>
              </div>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "14px 0", borderBottom: i < 4 ? "1px solid var(--bg-2)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div className="pulse" style={{ width: 100, height: 14, borderRadius: 4 }} />
                    <div className="pulse" style={{ width: 50, height: 14, borderRadius: 4 }} />
                  </div>
                  <div className="pulse" style={{ width: "100%", height: 6, borderRadius: 3, marginTop: 6 }} />
                  <div className="pulse" style={{ width: 80, height: 10, borderRadius: 3, marginTop: 4 }} />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const m = p.metrics;

  const handleDownload = () => {
    const rows = [
      ["Metric", "Value", "Change"],
      ["Revenue", `₹${fmt(m.revenue.value)}`, m.revenue.delta],
      ["Bookings", String(m.bookings.value), m.bookings.delta],
      ["New Customers", String(m.newCust.value), m.newCust.delta],
      ["No-Show Rate", `${m.noShow.value.toFixed(1)}%`, m.noShow.delta],
      ["Avg Service Time", p.timing.avgActualMinutes !== null ? `${p.timing.avgActualMinutes} min` : "No data", m.serviceTime.delta],
      ["Avg Estimated Time", p.timing.avgEstimatedMinutes !== null ? `${p.timing.avgEstimatedMinutes} min` : "No data", ""],
      ["Running Late", String(p.timing.runningLate), ""],
      ["Best On-Time Stylist", p.timing.bestOnTimeStylist || "Need more data", ""],
      [],
      ["Top Services"],
      ["Name", "Revenue", "Bookings", "Share"],
      ...p.topServices.map((s) => [s.name, `₹${fmt(s.revenue)}`, String(s.bookings), `${s.share}%`]),
      [],
      ["Top Stylists"],
      ["Name", "Bookings", "Revenue", "Share"],
      ...p.topStylists.map((s) => [s.name, String(s.bookings), `₹${fmt(s.revenue)}`, `${s.share}%`]),
    ];
    const csv = rows.map(r => (r as string[]).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `insights-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app animate-fade-in">
      <Header
        title="Insights"
        subtitle={p.dateRange.toUpperCase()}
        actions={
          <button className="icon-btn" aria-label="Download analytics" onClick={handleDownload}>
            <IR.download />
          </button>
        }
      />

      {/* Main Content */}
      <main className="app-main">
        {/* Period toggle */}
        <div className="rev-period">
          <div className="toggle big">
            <button className={period === "today" ? "on" : ""} onClick={() => setPeriod("today")}>
              Today
            </button>
            <button className={period === "week" ? "on" : ""} onClick={() => setPeriod("week")}>
              This Week
            </button>
            <button className={period === "month" ? "on" : ""} onClick={() => setPeriod("month")}>
              This Month
            </button>
          </div>
          <div className="rev-range mono">{p.dateRange}</div>
        </div>

        {/* 2x2 Metric grid */}
        <div className="metric-grid">
          <MetricBig
            label="Total revenue"
            icon={<IR.rupee />}
            prefix="₹"
            value={fmt(m.revenue.value)}
            delta={m.revenue.delta}
            tone={m.revenue.tone}
            compare={p.compareLabel}
          />
          <MetricBig
            label="Total bookings"
            icon={<IR.bookings />}
            value={m.bookings.value}
            delta={m.bookings.delta}
            tone={m.bookings.tone}
            compare={p.compareLabel}
          />
          <MetricBig
            label="New customers"
            icon={<IR.newcust />}
            value={m.newCust.value}
            delta={m.newCust.delta}
            tone={m.newCust.tone}
            compare={p.compareLabel}
          />
          <MetricBig
            label="No-show rate"
            icon={<IR.alert />}
            value={m.noShow.value.toFixed(1)}
            suffix="%"
            delta={m.noShow.delta}
            tone={m.noShow.tone}
            compare={p.compareLabel}
          />
          <MetricBig
            label="Avg service time"
            icon={<IR.clock />}
            value={p.timing.avgActualMinutes !== null ? p.timing.avgActualMinutes : "No data"}
            suffix={p.timing.avgActualMinutes !== null ? "min" : undefined}
            delta={m.serviceTime.delta}
            tone={m.serviceTime.tone}
            compare={m.serviceTime.compare}
          />
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">Actual vs estimate</div>
            <div className="mt-2 font-mono text-xl font-semibold text-ink">
              {p.timing.avgActualMinutes !== null && p.timing.avgEstimatedMinutes !== null
                ? `${p.timing.avgActualMinutes}m / ${p.timing.avgEstimatedMinutes}m`
                : "No data"}
            </div>
            <div className="mt-1 text-xs text-ink-soft">Completed services with timing only</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">Timed services</div>
            <div className="mt-2 font-mono text-xl font-semibold text-ink">{p.timing.completedWithTiming}</div>
            <div className="mt-1 text-xs text-ink-soft">Rows with start and complete time</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">Running late now</div>
            <div className={`mt-2 font-mono text-xl font-semibold ${p.timing.runningLate > 0 ? "text-amber" : "text-teal"}`}>{p.timing.runningLate}</div>
            <div className="mt-1 text-xs text-ink-soft">{p.timing.runningLate > 0 ? "Active bookings need attention" : "Active bookings on track"}</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">Best on-time stylist</div>
            <div className="mt-2 truncate text-xl font-semibold text-ink">{p.timing.bestOnTimeStylist || "Need more data"}</div>
            <div className="mt-1 text-xs text-ink-soft">Requires at least 3 timed services</div>
          </div>
        </div>

        {/* Bar chart */}
        <div className="rev-chart card">
          <div className="section-head" style={{ marginBottom: 8 }}>
            <div className="l">
              <h2>{p.chart.title}</h2>
              {p.chart.data.length > 0 && p.chart.data[p.chart.highlight] && (
                <span className="count">
                  Highest: {p.chart.data[p.chart.highlight].x} · ₹{fmt(p.chart.data[p.chart.highlight].v)}
                </span>
              )}
            </div>
            <div className="r" style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--ink-3)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--teal)" }}></span>
                Best
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--teal-soft)" }}></span>
                Other
              </span>
            </div>
          </div>
          <BarChart data={p.chart.data} highlightIdx={p.chart.highlight} />
        </div>

        {/* Two ranked lists */}
        <div className="rev-rank-grid">
          <div className="card">
            <div className="section-head" style={{ marginBottom: 12 }}>
              <div className="l">
                <h2>Top services</h2>
                <span className="count">by revenue</span>
              </div>
              <button className="btn btn-ghost btn-sm">All →</button>
            </div>
            <RankedList rows={p.topServices} type="service" />
          </div>
          <div className="card">
            <div className="section-head" style={{ marginBottom: 12 }}>
              <div className="l">
                <h2>Top stylists</h2>
                <span className="count">by bookings</span>
              </div>
              <button className="btn btn-ghost btn-sm">All →</button>
            </div>
            <RankedList rows={p.topStylists} type="stylist" />
          </div>
        </div>

        {/* Footer insight */}
        {p.chart.data.length > 0 && p.chart.data[p.chart.highlight] && (
          <div
            style={{
              marginTop: 4,
              padding: "16px 20px",
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
              <IR.arrow />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontWeight: 600 }}>
                {p.chart.data[p.chart.highlight].x} brought in {Math.round((p.chart.data[p.chart.highlight].v / (m.revenue.value || 1)) * 100)}% of the period{"'s"} revenue.
              </strong>{" "}
              Want to review your staffing schedule?
            </div>
            <Link href="/dashboard/settings" className="btn btn-sm" style={{ background: "var(--teal)", color: "#fff", height: 32, display: "inline-flex", alignItems: "center", padding: "0 12px", borderRadius: 8, fontWeight: 600, textDecoration: "none" }}>
              Settings →
            </Link>
          </div>
        )}
      </main>


    </div>
  );
}
