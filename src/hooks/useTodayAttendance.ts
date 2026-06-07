"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";
import {
  buildIndiaTimestamp,
  calculateAttendanceTotals,
  computeDisplayStatus,
  todayDateKey,
  validateChronologicalRange,
} from "@/lib/attendance";
import { ATTENDANCE_BLOCK_SELECT, ATTENDANCE_BREAK_SELECT, ATTENDANCE_SESSION_SELECT } from "@/lib/supabase-selects";
import type { AttendanceBreak, AttendanceSession, AttendanceStylistRow } from "@/types";
import { MOCK_ADMIN_ATTENDANCE_ROWS } from "@/constants/attendanceConfig";

export function useTodayAttendance(salonId: string | null, dateKey?: string) {
  const [rows, setRows] = useState<AttendanceStylistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const { show: showToast } = useToast();

  const targetDate = dateKey || todayDateKey();

  const loadTodayAttendance = useCallback(async (signal?: AbortSignal) => {
    const requestSignal = signal ?? new AbortController().signal;

    if (!salonId) {
      if (!requestSignal.aborted) {
        setRows(MOCK_ADMIN_ATTENDANCE_ROWS);
        setLoading(false);
      }
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      if (!requestSignal.aborted) {
        setRows(MOCK_ADMIN_ATTENDANCE_ROWS);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch all active stylists
      const { data: stylists, error: stylistsErr } = await supabase
        .from("stylists")
        .select("id, name, tone")
        .eq("salon_id", salonId)
        .eq("active", true)
        .abortSignal(requestSignal);

      if (requestSignal.aborted) return;
      if (stylistsErr) throw stylistsErr;

      // 2. Fetch all attendance sessions for target date
      const { data: sessions, error: sessionsErr } = await supabase
        .from("attendance_sessions")
        .select(ATTENDANCE_SESSION_SELECT)
        .eq("salon_id", salonId)
        .eq("session_date", targetDate)
        .abortSignal(requestSignal);

      if (requestSignal.aborted) return;
      if (sessionsErr) throw sessionsErr;
      const attendanceSessions = (sessions || []) as AttendanceSession[];

      // 3. Fetch all breaks for target date sessions
      const sessionIds = attendanceSessions.map((s) => s.id);
      let breaks: AttendanceBreak[] = [];
      if (sessionIds.length > 0) {
        const { data: breaksData } = await supabase
          .from("attendance_breaks")
          .select(ATTENDANCE_BREAK_SELECT)
          .in("session_id", sessionIds)
          .abortSignal(requestSignal);
        if (requestSignal.aborted) return;
        breaks = (breaksData || []) as AttendanceBreak[];
      }

      // 4. Fetch pending correction requests to show badges
      const { data: corrections } = await supabase
        .from("correction_requests")
        .select("stylist_id, status")
        .eq("salon_id", salonId)
        .eq("status", "pending")
        .abortSignal(requestSignal);

      if (requestSignal.aborted) return;

      // 5. Fetch calendar blocks to check for absent/leaves
      const { data: blocks } = await supabase
        .from("blocks")
        .select(ATTENDANCE_BLOCK_SELECT)
        .eq("salon_id", salonId)
        .eq("date_from", targetDate)
        .abortSignal(requestSignal);

      if (requestSignal.aborted) return;

      const mappedRows: AttendanceStylistRow[] = (stylists || []).map((stylist) => {
        const session = attendanceSessions.find((s) => s.stylist_id === stylist.id) || null;
        const pendingCorr = (corrections || []).some((c) => c.stylist_id === stylist.id);
        const stylistBreaks = breaks.filter((b) => b.session_id === session?.id);
        const activeBreak = stylistBreaks.find((b) => b.break_end === null) || null;

        // Check if there is a leave/absent block for this stylist (or for all stylists)
        const hasLeaveBlock = (blocks || []).some(
          (b) =>
            b.counts_as === "leave_absent" &&
            (b.stylist_id === stylist.id || b.stylist_id === null)
        );

        let finalStatus = computeDisplayStatus(session, activeBreak);
        if (finalStatus === "not_clocked_in" && hasLeaveBlock) {
          finalStatus = "absent";
        }

        const clockInStr = session?.clock_in_at || null;
        const clockOutStr = session?.clock_out_at || null;

        const breakMins = stylistBreaks.reduce((sum, b) => sum + (b.duration_minutes || 0), 0);
        let workedMins = session?.total_worked_minutes || 0;

        if (session && !session.clock_out_at && session.clock_in_at) {
          const now = new Date();
          const start = new Date(session.clock_in_at);
          const totalMins = Math.max(0, Math.round((now.getTime() - start.getTime()) / 60000));
          workedMins = Math.max(0, totalMins - breakMins);
        }

        return {
          stylistId: stylist.id,
          stylistName: stylist.name,
          initials: stylist.name[0],
          tone: (stylist.tone || "tone-a").replace("tone-", ""),
          displayStatus: finalStatus,
          clockInAt: clockInStr,
          clockOutAt: clockOutStr,
          workedMinutes: workedMins,
          breakMinutes: breakMins,
          isLate: session?.is_late || false,
          sessionId: session?.id || null,
          hasPendingCorrection: pendingCorr,
        };
      });

      setRows(mappedRows);
    } catch (err) {
      if (requestSignal.aborted) return;
      console.error("Error loading today's attendance grid:", err);
      setRows(MOCK_ADMIN_ATTENDANCE_ROWS);
    } finally {
      if (!requestSignal.aborted) setLoading(false);
    }
  }, [salonId, targetDate]);

  // Admin Manual Actions
  const adminClockIn = async (stylistId: string, timeStr: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      showToast("Manual Clock-In (Mock Mode)");
      return;
    }

    setActionBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const clockInAt = buildIndiaTimestamp(targetDate, timeStr);

      const newSession = {
        salon_id: salonId,
        stylist_id: stylistId,
        session_date: targetDate,
        clock_in_at: clockInAt,
        clocked_in_by: user?.id || null,
        status: "open",
      };

      const { data, error } = await supabase
        .from("attendance_sessions")
        .insert(newSession)
        .select()
        .single();

      if (error) throw error;

      // Log to audit log
      await supabase
        .from("attendance_audit_log")
        .insert({
          salon_id: salonId,
          session_id: data.id,
          edited_by: user?.id || null,
          editor_name: "Admin",
          field_changed: "clock_in_at",
          old_value: null,
          new_value: clockInAt,
          reason: "Manual clock-in by administrator",
          action_type: "manual_clock_in",
        });

      showToast("✓ Stylist clocked in successfully");
      loadTodayAttendance();
    } catch (err) {
      console.error("Error admin clock-in:", err);
      showToast("Failed to clock in stylist.", 2500);
    } finally {
      setActionBusy(false);
    }
  };

  const adminClockOut = async (sessionId: string, timeStr: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      showToast("Manual Clock-Out (Mock Mode)");
      return;
    }

    setActionBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const clockOutAt = buildIndiaTimestamp(targetDate, timeStr);

      // Fetch session data first to calculate worked time
      const { data: sessionData } = await supabase
        .from("attendance_sessions")
        .select(ATTENDANCE_SESSION_SELECT)
        .eq("id", sessionId)
        .single();

      if (!sessionData) throw new Error("Session not found");

      const rangeError = validateChronologicalRange(sessionData.clock_in_at, clockOutAt);
      if (rangeError) {
        showToast(rangeError, 2500);
        return;
      }

      const { data: sessionBreaks, error: breaksError } = await supabase
        .from("attendance_breaks")
        .select("duration_minutes, is_paid")
        .eq("session_id", sessionId);

      if (breaksError) throw breaksError;

      const totals = calculateAttendanceTotals(
        sessionData.clock_in_at,
        clockOutAt,
        (sessionBreaks || []) as Array<Pick<AttendanceBreak, "duration_minutes" | "is_paid">>,
      );

      const { error } = await supabase
        .from("attendance_sessions")
        .update({
          clock_out_at: clockOutAt,
          total_worked_minutes: totals.totalWorkedMinutes,
          total_break_minutes: totals.totalBreakMinutes,
          paid_minutes: totals.paidMinutes,
          status: "closed",
          clocked_out_by: user?.id || null,
        })
        .eq("id", sessionId);

      if (error) throw error;

      // Log to audit log
      await supabase
        .from("attendance_audit_log")
        .insert({
          salon_id: salonId,
          session_id: sessionId,
          edited_by: user?.id || null,
          editor_name: "Admin",
          field_changed: "clock_out_at",
          old_value: null,
          new_value: clockOutAt,
          reason: "Manual clock-out by administrator",
          action_type: "manual_clock_out",
        });

      showToast("✓ Stylist clocked out successfully");
      loadTodayAttendance();
    } catch (err) {
      console.error("Error admin clock-out:", err);
      showToast("Failed to clock out stylist.", 2500);
    } finally {
      setActionBusy(false);
    }
  };

  const adminEditSession = async (
    sessionId: string,
    updates: { clockInAt: string | null; clockOutAt: string | null; adminNote: string | null; isAbsent: boolean },
    reason: string
  ) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      showToast("Edit Session (Mock Mode)");
      return;
    }

    setActionBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch original session
      const { data: original } = await supabase
        .from("attendance_sessions")
        .select(ATTENDANCE_SESSION_SELECT)
        .eq("id", sessionId)
        .single();

      if (!original) throw new Error("Original session not found");

      const rangeError = validateChronologicalRange(updates.clockInAt, updates.clockOutAt);
      if (rangeError) {
        showToast(rangeError, 2500);
        return;
      }

      const { data: sessionBreaks, error: breaksError } = await supabase
        .from("attendance_breaks")
        .select("duration_minutes, is_paid")
        .eq("session_id", sessionId);

      if (breaksError) throw breaksError;

      const dbUpdates: Record<string, unknown> = {
        admin_note: updates.adminNote,
        is_absent: updates.isAbsent,
        status: updates.isAbsent ? "closed" : (updates.clockOutAt ? "closed" : "open"),
      };

      if (updates.clockInAt) {
        dbUpdates.clock_in_at = updates.clockInAt;
      } else {
        dbUpdates.clock_in_at = null;
      }

      if (updates.clockOutAt) {
        dbUpdates.clock_out_at = updates.clockOutAt;
      } else {
        dbUpdates.clock_out_at = null;
      }

      // Re-calculate minutes
      if (updates.isAbsent) {
        dbUpdates.total_worked_minutes = 0;
        dbUpdates.paid_minutes = 0;
      } else if (updates.clockInAt && updates.clockOutAt) {
        const totals = calculateAttendanceTotals(
          updates.clockInAt,
          updates.clockOutAt,
          (sessionBreaks || []) as Array<Pick<AttendanceBreak, "duration_minutes" | "is_paid">>,
        );
        dbUpdates.total_worked_minutes = totals.totalWorkedMinutes;
        dbUpdates.total_break_minutes = totals.totalBreakMinutes;
        dbUpdates.paid_minutes = totals.paidMinutes;
      } else {
        dbUpdates.total_worked_minutes = 0;
        dbUpdates.paid_minutes = 0;
      }

      const { error } = await supabase
        .from("attendance_sessions")
        .update(dbUpdates)
        .eq("id", sessionId);

      if (error) throw error;

      // Write audits
      const auditInserts = [];
      if (original.clock_in_at !== updates.clockInAt) {
        auditInserts.push({
          salon_id: salonId,
          session_id: sessionId,
          edited_by: user?.id || null,
          editor_name: "Admin",
          field_changed: "clock_in_at",
          old_value: original.clock_in_at,
          new_value: updates.clockInAt,
          reason,
          action_type: "edit_clock_in",
        });
      }
      if (original.clock_out_at !== updates.clockOutAt) {
        auditInserts.push({
          salon_id: salonId,
          session_id: sessionId,
          edited_by: user?.id || null,
          editor_name: "Admin",
          field_changed: "clock_out_at",
          old_value: original.clock_out_at,
          new_value: updates.clockOutAt,
          reason,
          action_type: "edit_clock_out",
        });
      }
      if (original.admin_note !== updates.adminNote) {
        auditInserts.push({
          salon_id: salonId,
          session_id: sessionId,
          edited_by: user?.id || null,
          editor_name: "Admin",
          field_changed: "admin_note",
          old_value: original.admin_note,
          new_value: updates.adminNote,
          reason,
          action_type: original.admin_note ? "edit_note" : "add_note",
        });
      }
      if (original.is_absent !== updates.isAbsent) {
        auditInserts.push({
          salon_id: salonId,
          session_id: sessionId,
          edited_by: user?.id || null,
          editor_name: "Admin",
          field_changed: "is_absent",
          old_value: String(original.is_absent),
          new_value: String(updates.isAbsent),
          reason,
          action_type: updates.isAbsent ? "mark_absent" : "mark_present",
        });
      }

      if (auditInserts.length > 0) {
        await supabase
          .from("attendance_audit_log")
          .insert(auditInserts);
      }

      showToast("✓ Shift session updated successfully");
      loadTodayAttendance();
    } catch (err) {
      console.error("Error editing session:", err);
      showToast("Failed to edit session.", 2500);
    } finally {
      setActionBusy(false);
    }
  };

  const adminMarkAbsent = async (stylistId: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      showToast("Mark Absent (Mock Mode)");
      return;
    }

    setActionBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const newSession = {
        salon_id: salonId,
        stylist_id: stylistId,
        session_date: targetDate,
        is_absent: true,
        status: "closed",
        total_worked_minutes: 0,
        paid_minutes: 0,
        clocked_in_by: user?.id || null,
      };

      const { data, error } = await supabase
        .from("attendance_sessions")
        .insert(newSession)
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("attendance_audit_log")
        .insert({
          salon_id: salonId,
          session_id: data.id,
          edited_by: user?.id || null,
          editor_name: "Admin",
          field_changed: "is_absent",
          old_value: "false",
          new_value: "true",
          reason: "Marked absent by administrator",
          action_type: "mark_absent",
        });

      showToast("✓ Stylist marked absent");
      loadTodayAttendance();
    } catch (err) {
      console.error("Error marking absent:", err);
      showToast("Failed to mark stylist absent.", 2500);
    } finally {
      setActionBusy(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      void loadTodayAttendance(controller.signal);
    });
    return () => controller.abort();
  }, [loadTodayAttendance]);

  return {
    rows,
    loading,
    actionBusy,
    adminClockIn,
    adminClockOut,
    adminEditSession,
    adminMarkAbsent,
    reload: loadTodayAttendance,
  };
}
