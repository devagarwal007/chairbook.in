"use client";

import { useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { HoursData } from "@/types";

export interface DailyReportItem {
  stylistId: string;
  stylistName: string;
  initials: string;
  tone: string;
  status: string; // 'Present', 'Late', 'Absent', 'On Leave', 'Rest Day', 'Not Clocked In'
  clockIn: string; // formatted e.g. "10:05 AM" or "--"
  clockOut: string; // formatted e.g. "06:00 PM" or "--"
  workedMinutes: number;
  breakMinutes: number;
  paidMinutes: number;
  adminNote: string | null;
}

export interface MonthlyReportItem {
  stylistId: string;
  stylistName: string;
  initials: string;
  tone: string;
  daysPresent: number;
  daysLate: number;
  daysAbsent: number;
  daysLeave: number;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  paidMinutes: number;
  workingDays: number;
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function useAttendanceReports(salonId: string | null) {
  const [loading, setLoading] = useState(false);

  const loadDailyReport = useCallback(
    async (dateKey: string): Promise<DailyReportItem[]> => {
      if (!salonId) {
        // Return Mock data
        return getMockDailyReport();
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        return getMockDailyReport();
      }

      setLoading(true);
      try {
        // 1. Fetch stylists
        const { data: stylists, error: stylistsErr } = await supabase
          .from("stylists")
          .select("id, name, tone")
          .eq("salon_id", salonId)
          .eq("active", true);

        if (stylistsErr) throw stylistsErr;

        // 2. Fetch sessions for the date
        const { data: sessions, error: sessionsErr } = await supabase
          .from("attendance_sessions")
          .select("*")
          .eq("salon_id", salonId)
          .eq("session_date", dateKey);

        if (sessionsErr) throw sessionsErr;

        // 3. Fetch calendar blocks for the date
        const { data: blocks } = await supabase
          .from("blocks")
          .select("*")
          .eq("salon_id", salonId)
          .eq("date_from", dateKey);

        // 4. Fetch salon hours to see if it's a Rest Day
        const { data: salonProfile } = await supabase
          .from("salons")
          .select("hours")
          .eq("id", salonId)
          .maybeSingle();

        const hours = salonProfile?.hours as HoursData | null;
        const dObj = new Date(dateKey + "T12:00:00");
        const dayOfWeek = DAY_KEYS[dObj.getDay()];
        const isSalonOpen = hours ? hours[dayOfWeek]?.open ?? true : true;

        const results: DailyReportItem[] = (stylists || []).map((stylist) => {
          const session = (sessions || []).find((s) => s.stylist_id === stylist.id);
          const stylistBlocks = (blocks || []).filter(
            (b) => b.stylist_id === stylist.id || b.stylist_id === null
          );
          const hasLeaveBlock = stylistBlocks.some((b) => b.counts_as === "leave_absent");

          let status = "Not Clocked In";
          if (session) {
            if (session.is_absent) status = "Absent";
            else if (session.is_late) status = "Late";
            else if (session.clock_in_at) status = "Present";
          } else if (hasLeaveBlock) {
            status = "On Leave";
          } else if (!isSalonOpen) {
            status = "Rest Day";
          }

          const formatTime = (isoString: string | null) => {
            if (!isoString) return "--";
            try {
              const date = new Date(isoString);
              return date.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Kolkata",
              });
            } catch {
              return "--";
            }
          };

          return {
            stylistId: stylist.id,
            stylistName: stylist.name,
            initials: stylist.name[0] || "",
            tone: (stylist.tone || "tone-a").replace("tone-", ""),
            status,
            clockIn: session?.clock_in_at ? formatTime(session.clock_in_at) : "--",
            clockOut: session?.clock_out_at ? formatTime(session.clock_out_at) : "--",
            workedMinutes: session?.total_worked_minutes || 0,
            breakMinutes: session?.total_break_minutes || 0,
            paidMinutes: session?.paid_minutes || 0,
            adminNote: session?.admin_note || null,
          };
        });

        return results;
      } catch (err) {
        console.error("Error loading daily report:", err);
        return getMockDailyReport();
      } finally {
        setLoading(false);
      }
    },
    [salonId]
  );

  const loadMonthlyReport = useCallback(
    async (startDate: string, endDate: string): Promise<MonthlyReportItem[]> => {
      if (!salonId) {
        return getMockMonthlyReport();
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        return getMockMonthlyReport();
      }

      setLoading(true);
      try {
        // 1. Fetch active stylists
        const { data: stylists, error: stylistsErr } = await supabase
          .from("stylists")
          .select("id, name, tone")
          .eq("salon_id", salonId)
          .eq("active", true);

        if (stylistsErr) throw stylistsErr;

        // 2. Fetch sessions in range
        const { data: sessions, error: sessionsErr } = await supabase
          .from("attendance_sessions")
          .select("*")
          .eq("salon_id", salonId)
          .gte("session_date", startDate)
          .lte("session_date", endDate);

        if (sessionsErr) throw sessionsErr;

        // 3. Fetch blocks in range
        const { data: blocks } = await supabase
          .from("blocks")
          .select("*")
          .eq("salon_id", salonId)
          .gte("date_from", startDate)
          .lte("date_from", endDate);

        // 4. Fetch salon hours to count salon-open working days
        const { data: salonProfile } = await supabase
          .from("salons")
          .select("hours")
          .eq("id", salonId)
          .maybeSingle();

        const hours = salonProfile?.hours as HoursData | null;

        // Calculate working days in date range
        let workingDaysCount = 0;
        const startD = new Date(startDate + "T12:00:00");
        const endD = new Date(endDate + "T12:00:00");
        for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
          const dayOfWeek = DAY_KEYS[d.getDay()];
          const isOpen = hours ? hours[dayOfWeek]?.open ?? true : true;
          if (isOpen) {
            workingDaysCount++;
          }
        }

        const results: MonthlyReportItem[] = (stylists || []).map((stylist) => {
          const stylistSessions = (sessions || []).filter((s) => s.stylist_id === stylist.id);
          const stylistBlocks = (blocks || []).filter(
            (b) =>
              (b.stylist_id === stylist.id || b.stylist_id === null) &&
              b.counts_as === "leave_absent"
          );

          const daysPresent = stylistSessions.filter(
            (s) => s.clock_in_at !== null && !s.is_absent
          ).length;
          const daysLate = stylistSessions.filter((s) => s.is_late).length;
          const daysAbsent = stylistSessions.filter((s) => s.is_absent).length;
          const daysLeave = stylistBlocks.length;

          const totalWorkedMinutes = stylistSessions.reduce(
            (sum, s) => sum + (s.total_worked_minutes || 0),
            0
          );
          const totalBreakMinutes = stylistSessions.reduce(
            (sum, s) => sum + (s.total_break_minutes || 0),
            0
          );
          const paidMinutes = stylistSessions.reduce((sum, s) => sum + (s.paid_minutes || 0), 0);

          return {
            stylistId: stylist.id,
            stylistName: stylist.name,
            initials: stylist.name[0] || "",
            tone: (stylist.tone || "tone-a").replace("tone-", ""),
            daysPresent,
            daysLate,
            daysAbsent,
            daysLeave,
            totalWorkedMinutes,
            totalBreakMinutes,
            paidMinutes,
            workingDays: workingDaysCount,
          };
        });

        return results;
      } catch (err) {
        console.error("Error loading monthly report:", err);
        return getMockMonthlyReport();
      } finally {
        setLoading(false);
      }
    },
    [salonId]
  );

  return {
    loading,
    loadDailyReport,
    loadMonthlyReport,
  };
}

// ═══ MOCK DATA FALLBACKS ═══

function getMockDailyReport(): DailyReportItem[] {
  // Mock daily details for Anjali, Rahul, Meera, Arjun, Sneha
  return [
    {
      stylistId: "s1",
      stylistName: "Anjali Sharma",
      initials: "AS",
      tone: "b",
      status: "Present",
      clockIn: "10:03 AM",
      clockOut: "06:00 PM",
      workedMinutes: 447,
      breakMinutes: 30,
      paidMinutes: 447,
      adminNote: null,
    },
    {
      stylistId: "s2",
      stylistName: "Rahul Kapoor",
      initials: "RK",
      tone: "c",
      status: "Late",
      clockIn: "10:15 AM",
      clockOut: "--",
      workedMinutes: 260,
      breakMinutes: 15,
      paidMinutes: 260,
      adminNote: null,
    },
    {
      stylistId: "s3",
      stylistName: "Meera Desai",
      initials: "MD",
      tone: "d",
      status: "Not Clocked In",
      clockIn: "--",
      clockOut: "--",
      workedMinutes: 0,
      breakMinutes: 0,
      paidMinutes: 0,
      adminNote: null,
    },
    {
      stylistId: "s4",
      stylistName: "Arjun Patel",
      initials: "AP",
      tone: "e",
      status: "Absent",
      clockIn: "--",
      clockOut: "--",
      workedMinutes: 0,
      breakMinutes: 0,
      paidMinutes: 0,
      adminNote: "Family emergency",
    },
    {
      stylistId: "s5",
      stylistName: "Sneha Reddy",
      initials: "SR",
      tone: "a",
      status: "Present",
      clockIn: "10:00 AM",
      clockOut: "06:00 PM",
      workedMinutes: 450,
      breakMinutes: 30,
      paidMinutes: 450,
      adminNote: null,
    },
  ];
}

function getMockMonthlyReport(): MonthlyReportItem[] {
  return [
    {
      stylistId: "s1",
      stylistName: "Anjali Sharma",
      initials: "AS",
      tone: "b",
      daysPresent: 22,
      daysLate: 1,
      daysAbsent: 1,
      daysLeave: 1,
      totalWorkedMinutes: 9900,
      totalBreakMinutes: 660,
      paidMinutes: 9900,
      workingDays: 24,
    },
    {
      stylistId: "s2",
      stylistName: "Rahul Kapoor",
      initials: "RK",
      tone: "c",
      daysPresent: 20,
      daysLate: 5,
      daysAbsent: 2,
      daysLeave: 2,
      totalWorkedMinutes: 8800,
      totalBreakMinutes: 600,
      paidMinutes: 8800,
      workingDays: 24,
    },
    {
      stylistId: "s3",
      stylistName: "Meera Desai",
      initials: "MD",
      tone: "d",
      daysPresent: 21,
      daysLate: 0,
      daysAbsent: 1,
      daysLeave: 2,
      totalWorkedMinutes: 9450,
      totalBreakMinutes: 630,
      paidMinutes: 9450,
      workingDays: 24,
    },
    {
      stylistId: "s4",
      stylistName: "Arjun Patel",
      initials: "AP",
      tone: "e",
      daysPresent: 18,
      daysLate: 2,
      daysAbsent: 4,
      daysLeave: 2,
      totalWorkedMinutes: 8100,
      totalBreakMinutes: 540,
      paidMinutes: 8100,
      workingDays: 24,
    },
    {
      stylistId: "s5",
      stylistName: "Sneha Reddy",
      initials: "SR",
      tone: "a",
      daysPresent: 23,
      daysLate: 1,
      daysAbsent: 0,
      daysLeave: 1,
      totalWorkedMinutes: 10350,
      totalBreakMinutes: 690,
      paidMinutes: 10350,
      workingDays: 24,
    },
  ];
}
