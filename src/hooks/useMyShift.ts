"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";
import { useAttendanceSettings } from "./useAttendanceSettings";
import {
  calculateAttendanceTotals,
  computeDisplayStatus,
  getScheduledShift,
  isClockInLate,
  isTooEarlyToClockIn,
  todayDateKey,
} from "@/lib/attendance";
import { ATTENDANCE_BREAK_SELECT, ATTENDANCE_SESSION_SELECT } from "@/lib/supabase-selects";
import type { AttendanceSession, AttendanceBreak, HoursData } from "@/types";
import {
  MOCK_ATTENDANCE_SESSION,
  MOCK_ATTENDANCE_BREAKS,
} from "@/constants/attendanceConfig";

export function useMyShift(stylistId: string | null, salonId: string | null) {
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [breaks, setBreaks] = useState<AttendanceBreak[]>([]);
  const [salonHours, setSalonHours] = useState<HoursData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const { show: showToast } = useToast();

  const { settings, loading: settingsLoading } = useAttendanceSettings(salonId);

  // Helper to load salon business hours
  const loadSalonHours = useCallback(async (signal?: AbortSignal) => {
    const requestSignal = signal ?? new AbortController().signal;
    if (!salonId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("salons")
        .select("hours")
        .eq("id", salonId)
        .abortSignal(requestSignal)
        .maybeSingle();

      if (requestSignal.aborted) return;
      if (error) throw error;
      if (data?.hours) {
        setSalonHours(data.hours as HoursData);
      }
    } catch (err) {
      if (requestSignal.aborted) return;
      console.error("Error loading salon hours:", err);
    }
  }, [salonId]);

  // Load stylist's today session + breaks
  const loadTodayShift = useCallback(async (signal?: AbortSignal) => {
    const requestSignal = signal ?? new AbortController().signal;

    if (!stylistId || !salonId) {
      if (!requestSignal.aborted) {
        setSession(null);
        setBreaks([]);
        setLoading(false);
      }
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase || stylistId === "preview-stylist") {
      // Mock Fallback
      if (!requestSignal.aborted) {
        setSession(MOCK_ATTENDANCE_SESSION as AttendanceSession);
        setBreaks(MOCK_ATTENDANCE_BREAKS as AttendanceBreak[]);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const today = todayDateKey();

      // Check for missed clock-outs of previous days (status = 'open' and session_date < today)
      const { data: openYesterday, error: yesterdayError } = await supabase
        .from("attendance_sessions")
        .select(ATTENDANCE_SESSION_SELECT)
        .eq("stylist_id", stylistId)
        .eq("status", "open")
        .lt("session_date", today)
        .abortSignal(requestSignal);

      if (requestSignal.aborted) return;

      if (!yesterdayError && openYesterday && openYesterday.length > 0) {
        for (const prevSess of openYesterday) {
          await supabase
            .from("attendance_sessions")
            .update({ status: "needs_review" })
            .eq("id", prevSess.id);
        }
      }

      // Fetch today's session
      const { data: sessData, error: sessError } = await supabase
        .from("attendance_sessions")
        .select(ATTENDANCE_SESSION_SELECT)
        .eq("stylist_id", stylistId)
        .eq("session_date", today)
        .abortSignal(requestSignal)
        .maybeSingle();

      if (requestSignal.aborted) return;
      if (sessError) throw sessError;

      if (sessData) {
        setSession(sessData as AttendanceSession);

        // Fetch breaks for this session
        const { data: breaksData, error: breaksError } = await supabase
          .from("attendance_breaks")
          .select(ATTENDANCE_BREAK_SELECT)
          .eq("session_id", sessData.id)
          .order("break_start", { ascending: true })
          .abortSignal(requestSignal);

        if (requestSignal.aborted) return;
        if (breaksError) throw breaksError;
        setBreaks((breaksData || []) as AttendanceBreak[]);
      } else {
        setSession(null);
        setBreaks([]);
      }
    } catch (err) {
      if (requestSignal.aborted) return;
      console.error("Error loading today's shift:", err);
      showToast("Error loading shift. Working in offline fallback mode.", 2500);
      setSession(MOCK_ATTENDANCE_SESSION as AttendanceSession);
      setBreaks(MOCK_ATTENDANCE_BREAKS as AttendanceBreak[]);
    } finally {
      if (!requestSignal.aborted) setLoading(false);
    }
  }, [stylistId, salonId, showToast]);

  // Clock In trigger
  const clockIn = async () => {
    if (!stylistId || !salonId || actionBusy) return;

    const schedule = getScheduledShift(salonHours);
    const now = new Date();

    // Early clock-in check
    if (settings && settings.early_clock_in_minutes > 0 && schedule.start) {
      const isTooEarly = isTooEarlyToClockIn(now, schedule.start, settings.early_clock_in_minutes);
      if (isTooEarly) {
        showToast(`Too early to clock in. You can clock in ${settings.early_clock_in_minutes} mins before ${schedule.start}.`, 3000);
        return;
      }
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase || stylistId === "preview-stylist") {
      // Mock Action
      const mockSess: AttendanceSession = {
        id: "preview-att-1",
        salon_id: salonId,
        stylist_id: stylistId,
        session_date: todayDateKey(),
        clock_in_at: now.toISOString(),
        clock_out_at: null,
        scheduled_start: schedule.start,
        scheduled_end: schedule.end,
        total_worked_minutes: 0,
        total_break_minutes: 0,
        paid_minutes: 0,
        status: "open",
        is_late: schedule.start ? isClockInLate(now, schedule.start, settings?.late_threshold_minutes ?? 10) : false,
        is_absent: false,
        admin_note: null,
        clocked_in_by: "preview-user",
        clocked_out_by: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      setSession(mockSess);
      setBreaks([]);
      showToast("Clocked in (Mock Mode)");
      return;
    }

    setActionBusy(true);
    try {
      const isLate = schedule.start ? isClockInLate(now, schedule.start, settings?.late_threshold_minutes ?? 10) : false;
      const { data: { user } } = await supabase.auth.getUser();

      const newSession = {
        salon_id: salonId,
        stylist_id: stylistId,
        session_date: todayDateKey(),
        clock_in_at: now.toISOString(),
        scheduled_start: schedule.start,
        scheduled_end: schedule.end,
        is_late: isLate,
        is_absent: false,
        status: "open",
        clocked_in_by: user?.id || null,
      };

      const { data, error } = await supabase
        .from("attendance_sessions")
        .insert(newSession)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") { // unique constraint violation
          showToast("Already clocked in for today.", 2500);
        } else {
          throw error;
        }
      } else {
        setSession(data as AttendanceSession);
        setBreaks([]);
        showToast("✓ Clocked in successfully");
      }
    } catch (err) {
      console.error("Error clocking in:", err);
      showToast("Failed to clock in. Please check your network.", 2500);
    } finally {
      setActionBusy(false);
    }
  };

  // Clock Out trigger
  const clockOut = async () => {
    if (!session || actionBusy) return;

    const now = new Date();
    const supabase = getSupabaseBrowserClient();

    if (!supabase || stylistId === "preview-stylist") {
      // Mock Action
      let finalBreaks = [...breaks];
      const activeBrk = breaks.find(b => b.break_end === null);
      if (activeBrk) {
        finalBreaks = breaks.map(b => b.id === activeBrk.id ? { ...b, break_end: now.toISOString(), duration_minutes: 10 } : b);
        setBreaks(finalBreaks);
      }
      const totalBreakMins = finalBreaks.reduce((sum, b) => sum + (b.duration_minutes || 0), 0);
      const start = new Date(session.clock_in_at!);
      const worked = Math.max(0, Math.round((now.getTime() - start.getTime()) / 60000) - totalBreakMins);

      setSession({
        ...session,
        clock_out_at: now.toISOString(),
        status: "closed",
        total_break_minutes: totalBreakMins,
        total_worked_minutes: worked,
        paid_minutes: worked,
      });
      showToast("Clocked out (Mock Mode)");
      return;
    }

    setActionBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let totalBreaksForTotals: Array<Pick<AttendanceBreak, "duration_minutes" | "is_paid">> = breaks;

      // 1. Auto-end active break if on break
      const activeBreak = breaks.find(b => b.break_end === null);
      if (activeBreak) {
        const breakStart = new Date(activeBreak.break_start);
        const breakDuration = Math.max(1, Math.round((now.getTime() - breakStart.getTime()) / 60000));

        const { error: endBreakErr } = await supabase
          .from("attendance_breaks")
          .update({
            break_end: now.toISOString(),
            duration_minutes: breakDuration,
          })
          .eq("id", activeBreak.id);

        if (endBreakErr) throw endBreakErr;

        // Fetch latest breaks to calculate correct sum
        const { data: freshBreaks } = await supabase
          .from("attendance_breaks")
          .select("duration_minutes, is_paid")
          .eq("session_id", session.id);

        totalBreaksForTotals = (freshBreaks || []) as Array<Pick<AttendanceBreak, "duration_minutes" | "is_paid">>;
      }

      // 2. Perform clock out
      const totals = calculateAttendanceTotals(session.clock_in_at, now.toISOString(), totalBreaksForTotals);

      const { data, error } = await supabase
        .from("attendance_sessions")
        .update({
          clock_out_at: now.toISOString(),
          total_worked_minutes: totals.totalWorkedMinutes,
          total_break_minutes: totals.totalBreakMinutes,
          paid_minutes: totals.paidMinutes,
          status: "closed",
          clocked_out_by: user?.id || null,
        })
        .eq("id", session.id)
        .select()
        .single();

      if (error) throw error;
      setSession(data as AttendanceSession);
      showToast("✓ Clocked out successfully");
      loadTodayShift();
    } catch (err) {
      console.error("Error clocking out:", err);
      showToast("Failed to clock out. Please check your network.", 2500);
    } finally {
      setActionBusy(false);
    }
  };

  // Start Break trigger
  const startBreak = async (isPaid = false) => {
    if (!session || actionBusy) return;

    const now = new Date();
    const supabase = getSupabaseBrowserClient();

    if (!supabase || stylistId === "preview-stylist") {
      // Mock Action
      const newBrk: AttendanceBreak = {
        id: `preview-brk-${Date.now()}`,
        session_id: session.id,
        salon_id: salonId!,
        break_start: now.toISOString(),
        break_end: null,
        duration_minutes: null,
        is_paid: isPaid,
        created_by: "preview-user",
        created_at: now.toISOString(),
      };
      setBreaks(prev => [...prev, newBrk]);
      showToast("Break started (Mock Mode)");
      return;
    }

    setActionBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const newBreak = {
        session_id: session.id,
        salon_id: salonId,
        break_start: now.toISOString(),
        is_paid: isPaid,
        created_by: user?.id || null,
      };

      const { data, error } = await supabase
        .from("attendance_breaks")
        .insert(newBreak)
        .select()
        .single();

      if (error) throw error;
      setBreaks(prev => [...prev, data as AttendanceBreak]);
      showToast("Break started. Take rest!");
    } catch (err) {
      console.error("Error starting break:", err);
      showToast("Failed to start break.", 2500);
    } finally {
      setActionBusy(false);
    }
  };

  // End Break trigger
  const endBreak = async () => {
    if (!session || actionBusy) return;

    const activeBreak = breaks.find(b => b.break_end === null);
    if (!activeBreak) return;

    const now = new Date();
    const breakStart = new Date(activeBreak.break_start);
    const breakDuration = Math.max(1, Math.round((now.getTime() - breakStart.getTime()) / 60000));

    const supabase = getSupabaseBrowserClient();

    if (!supabase || stylistId === "preview-stylist") {
      // Mock Action
      setBreaks(prev => prev.map(b => b.id === activeBreak.id ? { ...b, break_end: now.toISOString(), duration_minutes: breakDuration } : b));
      showToast("Break ended (Mock Mode)");
      return;
    }

    setActionBusy(true);
    try {
      const { error } = await supabase
        .from("attendance_breaks")
        .update({
          break_end: now.toISOString(),
          duration_minutes: breakDuration,
        })
        .eq("id", activeBreak.id);

      if (error) throw error;

      // Fetch fresh breaks & recalculate total
        const { data: freshBreaks } = await supabase
          .from("attendance_breaks")
          .select(ATTENDANCE_BREAK_SELECT)
          .eq("session_id", session.id)
          .order("break_start", { ascending: true });

      setBreaks((freshBreaks || []) as AttendanceBreak[]);

      const totalBreakMins = (freshBreaks || []).reduce((sum, b) => sum + (b.duration_minutes || 0), 0);

      // Update session totals
      const { data: updatedSess, error: sessionUpdateErr } = await supabase
        .from("attendance_sessions")
        .update({
          total_break_minutes: totalBreakMins,
        })
        .eq("id", session.id)
        .select()
        .single();

      if (sessionUpdateErr) throw sessionUpdateErr;
      setSession(updatedSess as AttendanceSession);

      showToast("Break ended. Welcome back!");
    } catch (err) {
      console.error("Error ending break:", err);
      showToast("Failed to end break.", 2500);
    } finally {
      setActionBusy(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (stylistId && salonId) {
      const controller = new AbortController();
      queueMicrotask(() => {
        void loadSalonHours(controller.signal);
        void loadTodayShift(controller.signal);
      });
      return () => controller.abort();
    }
  }, [stylistId, salonId, loadSalonHours, loadTodayShift]);

  // Derived active break
  const activeBreak = breaks.find(b => b.break_end === null) || null;

  // Derived display status
  const displayStatus = computeDisplayStatus(
    session,
    activeBreak
  );

  return {
    session,
    breaks,
    activeBreak,
    settings,
    displayStatus,
    scheduledStart: session?.scheduled_start || getScheduledShift(salonHours).start,
    scheduledEnd: session?.scheduled_end || getScheduledShift(salonHours).end,
    isSalonOpenToday: getScheduledShift(salonHours).isOpen,
    loading: loading || settingsLoading,
    actionBusy,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    reload: loadTodayShift,
  };
}
