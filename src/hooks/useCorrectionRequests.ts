"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";
import {
  buildAttendanceCorrectionNotification,
  calculateAttendanceTotals,
  isClockInLate,
  todayDateKey,
  validateChronologicalRange,
} from "@/lib/attendance";
import { insertNotification } from "@/lib/notifications";
import { ATTENDANCE_SESSION_SELECT, CORRECTION_REQUEST_SELECT } from "@/lib/supabase-selects";
import type { CorrectionRequest } from "@/types";

export function useCorrectionRequests(salonId: string | null) {
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const { show: showToast } = useToast();

  const loadRequests = useCallback(async (signal?: AbortSignal) => {
    const requestSignal = signal ?? new AbortController().signal;

    if (!salonId) {
      if (!requestSignal.aborted) {
        setRequests([]);
        setLoading(false);
      }
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      if (!requestSignal.aborted) {
        setRequests([]);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("correction_requests")
        .select(CORRECTION_REQUEST_SELECT)
        .eq("salon_id", salonId)
        .order("created_at", { ascending: false })
        .limit(100)
        .abortSignal(requestSignal);

      if (requestSignal.aborted) return;
      if (error) throw error;
      setRequests((data || []) as CorrectionRequest[]);
    } catch (err) {
      if (requestSignal.aborted) return;
      console.error("Error loading correction requests:", err);
    } finally {
      if (!requestSignal.aborted) setLoading(false);
    }
  }, [salonId]);

  const submitCorrection = async (payload: {
    sessionId: string | null;
    stylistId: string;
    sessionDate?: string;
    reason: string;
    requestedClockIn: string | null;
    requestedClockOut: string | null;
  }) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || payload.stylistId === "preview-stylist") {
      showToast("Correction request submitted (Mock Mode)");
      return true;
    }

    if (!salonId || !payload.stylistId) {
      showToast("Unable to submit correction without a stylist account.", 2500);
      return false;
    }

    // Check if there is already a pending correction for this session
    setActionBusy(true);
    try {
      const sessionDate = payload.sessionDate || todayDateKey();
      let sessionId = payload.sessionId;

      if (!sessionId) {
        const { data: existingSession, error: existingError } = await supabase
          .from("attendance_sessions")
          .select("id")
          .eq("salon_id", salonId)
          .eq("stylist_id", payload.stylistId)
          .eq("session_date", sessionDate)
          .maybeSingle();

        if (existingError) throw existingError;

        if (existingSession?.id) {
          sessionId = existingSession.id;
        } else {
          const { data: createdSession, error: createSessionError } = await supabase
            .from("attendance_sessions")
            .insert({
              salon_id: salonId,
              stylist_id: payload.stylistId,
              session_date: sessionDate,
              status: "needs_review",
            })
            .select("id")
            .single();

          if (createSessionError) throw createSessionError;
          sessionId = createdSession.id;
        }
      }

      if (!sessionId) throw new Error("Correction session could not be created");

      const { data: existing, error: checkError } = await supabase
        .from("correction_requests")
        .select("id")
        .eq("session_id", sessionId)
        .eq("status", "pending")
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        showToast("You already have a pending correction request for this shift.", 3000);
        return false;
      }

      const newRequest = {
        salon_id: salonId,
        session_id: sessionId,
        stylist_id: payload.stylistId,
        reason: payload.reason,
        requested_clock_in: payload.requestedClockIn,
        requested_clock_out: payload.requestedClockOut,
        status: "pending",
      };

      const { error } = await supabase
        .from("correction_requests")
        .insert(newRequest);

      if (error) throw error;

      await insertNotification(buildAttendanceCorrectionNotification(salonId, payload.stylistId, sessionId));

      showToast("✓ Correction request submitted to admin");
      loadRequests();
      return true;
    } catch (err) {
      console.error("Error submitting correction request:", err);
      showToast("Failed to submit request. Please try again.", 2500);
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const reviewCorrection = async (requestId: string, status: "approved" | "rejected", rejectionReason?: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      showToast(`Request ${status} (Mock Mode)`);
      return true;
    }

    setActionBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: request, error: fetchErr } = await supabase
        .from("correction_requests")
        .select(CORRECTION_REQUEST_SELECT)
        .eq("id", requestId)
        .single();

      if (fetchErr) throw fetchErr;

      const updatePayload: Record<string, unknown> = {
        status,
        reviewed_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
      };
      if (status === "rejected" && rejectionReason) {
        updatePayload.rejection_reason = rejectionReason;
      }

      const sessionUpdates: Record<string, unknown> = {};
      const auditLogs: Array<Record<string, unknown>> = [];

      // If approved, validate and prepare the corresponding session update before closing the request.
      if (status === "approved" && request) {
        const { data: sessionData } = await supabase
          .from("attendance_sessions")
          .select(ATTENDANCE_SESSION_SELECT)
          .eq("id", request.session_id)
          .single();

        if (sessionData) {
          if (request.requested_clock_in) {
            sessionUpdates.clock_in_at = request.requested_clock_in;
            sessionUpdates.is_late = sessionData.scheduled_start
              ? isClockInLate(new Date(request.requested_clock_in), sessionData.scheduled_start, 10)
              : false;

            auditLogs.push({
              salon_id: salonId,
              session_id: request.session_id,
              edited_by: user?.id || null,
              editor_name: "Admin Approval",
              field_changed: "clock_in_at",
              old_value: sessionData.clock_in_at,
              new_value: request.requested_clock_in,
              reason: request.reason,
              action_type: "approve_correction",
            });
          }

          if (request.requested_clock_out) {
            const effectiveClockIn = (sessionUpdates.clock_in_at as string | undefined) || sessionData.clock_in_at;
            if (!effectiveClockIn) {
              showToast("Clock-in time is required before clock-out.", 2500);
              return false;
            }

            const rangeError = validateChronologicalRange(effectiveClockIn, request.requested_clock_out);
            if (rangeError) {
              showToast(rangeError, 2500);
              return false;
            }

            sessionUpdates.clock_out_at = request.requested_clock_out;
            sessionUpdates.status = "closed";

            const { data: sessionBreaks, error: breaksError } = await supabase
              .from("attendance_breaks")
              .select("duration_minutes, is_paid")
              .eq("session_id", request.session_id);

            if (breaksError) throw breaksError;

            const totals = calculateAttendanceTotals(effectiveClockIn, request.requested_clock_out, sessionBreaks || []);
            sessionUpdates.total_worked_minutes = totals.totalWorkedMinutes;
            sessionUpdates.total_break_minutes = totals.totalBreakMinutes;
            sessionUpdates.paid_minutes = totals.paidMinutes;

            auditLogs.push({
              salon_id: salonId,
              session_id: request.session_id,
              edited_by: user?.id || null,
              editor_name: "Admin Approval",
              field_changed: "clock_out_at",
              old_value: sessionData.clock_out_at,
              new_value: request.requested_clock_out,
              reason: request.reason,
              action_type: "approve_correction",
            });
          }
        }
      }

      // Update the correction request status
      const { error: updateErr } = await supabase
        .from("correction_requests")
        .update(updatePayload)
        .eq("id", requestId);

      if (updateErr) throw updateErr;

      if (status === "approved" && request) {
        if (Object.keys(sessionUpdates).length > 0) {
          await supabase
            .from("attendance_sessions")
            .update(sessionUpdates)
            .eq("id", request.session_id);
        }

        if (auditLogs.length > 0) {
          await supabase
            .from("attendance_audit_log")
            .insert(auditLogs);
        }
      }

      showToast(`✓ Correction request ${status}`);
      loadRequests();
      return true;
    } catch (err) {
      console.error("Error reviewing correction request:", err);
      showToast("Failed to process request review.", 2500);
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      void loadRequests(controller.signal);
    });
    return () => controller.abort();
  }, [loadRequests]);

  return {
    requests,
    loading,
    actionBusy,
    submitCorrection,
    reviewCorrection,
    reload: loadRequests,
  };
}
