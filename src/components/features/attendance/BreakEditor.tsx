"use client";

import React, { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";
import {
  buildIndiaTimestamp,
  calculateAttendanceTotals,
  formatDuration,
  minutesBetween,
  validateChronologicalRange,
} from "@/lib/attendance";
import { Icons as I, FormField } from "@/components/ui";
import type { AttendanceBreak, AttendanceSession } from "@/types";

interface BreakEditorProps {
  session: AttendanceSession;
  salonId: string | null;
  initialBreaks: AttendanceBreak[];
  onReload: () => void;
}

export default function BreakEditor({
  session,
  salonId,
  initialBreaks,
  onReload,
}: BreakEditorProps) {
  const { show: showToast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [breakStart, setBreakStart] = useState("13:00");
  const [breakEnd, setBreakEnd] = useState("13:30");
  const [isPaid, setIsPaid] = useState(false);
  const [busy, setBusy] = useState(false);

  const recalculateSessionTotals = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data: freshBreaks, error: breaksError } = await supabase
      .from("attendance_breaks")
      .select("duration_minutes, is_paid")
      .eq("session_id", session.id);

    if (breaksError) throw breaksError;

    const totals = calculateAttendanceTotals(
      session.clock_in_at,
      session.clock_out_at,
      (freshBreaks || []) as Array<Pick<AttendanceBreak, "duration_minutes" | "is_paid">>,
    );

    const updatePayload: Record<string, number> = {
      total_break_minutes: totals.totalBreakMinutes,
    };

    if (session.clock_out_at) {
      updatePayload.total_worked_minutes = totals.totalWorkedMinutes;
      updatePayload.paid_minutes = totals.paidMinutes;
    }

    await supabase
      .from("attendance_sessions")
      .update(updatePayload)
      .eq("id", session.id);
  };

  const handleAddBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      showToast("Break added (Mock Mode)");
      setShowAddForm(false);
      return;
    }

    setBusy(true);
    try {
      const startTimestamp = buildIndiaTimestamp(session.session_date, breakStart);
      const endTimestamp = buildIndiaTimestamp(session.session_date, breakEnd);
      const rangeError = validateChronologicalRange(startTimestamp, endTimestamp);
      if (rangeError) {
        showToast(rangeError, 2500);
        return;
      }
      const duration = minutesBetween(startTimestamp, endTimestamp);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("attendance_breaks")
        .insert({
          session_id: session.id,
          salon_id: salonId,
          break_start: startTimestamp,
          break_end: endTimestamp,
          duration_minutes: duration,
          is_paid: isPaid,
          created_by: user?.id || null,
        });

      if (error) throw error;

      await recalculateSessionTotals();

      // Audit Log
      await supabase
        .from("attendance_audit_log")
        .insert({
          salon_id: salonId,
          session_id: session.id,
          edited_by: user?.id || null,
          editor_name: "Admin",
          field_changed: "breaks",
          old_value: null,
          new_value: `${breakStart}-${breakEnd}`,
          reason: "Manual break insert by administrator",
          action_type: "add_break",
        });

      showToast("✓ Break logged successfully");
      setShowAddForm(false);
      onReload();
    } catch (err) {
      console.error("Error logging break:", err);
      showToast("Failed to log break", 2500);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteBreak = async (breakId: string) => {
    if (!confirm("Are you sure you want to delete this break record?")) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      showToast("Break deleted (Mock Mode)");
      onReload();
      return;
    }

    try {
      const { error } = await supabase
        .from("attendance_breaks")
        .delete()
        .eq("id", breakId);

      if (error) throw error;

      await recalculateSessionTotals();

      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from("attendance_audit_log")
        .insert({
          salon_id: salonId,
          session_id: session.id,
          edited_by: user?.id || null,
          editor_name: "Admin",
          field_changed: "breaks",
          old_value: "logged_break",
          new_value: null,
          reason: "Break deleted by administrator",
          action_type: "delete_break",
        });

      showToast("✓ Break record deleted");
      onReload();
    } catch (err) {
      console.error("Error deleting break:", err);
      showToast("Failed to delete break", 2500);
    }
  };

  return (
    <div className="flex flex-col gap-3 mt-3 animate-fade-in">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-xs text-ink-2 uppercase tracking-wide">Logged Breaks</span>
        {!showAddForm && (
          <button className="btn btn-outline btn-sm text-xs px-2.5 py-1 flex items-center gap-1" onClick={() => setShowAddForm(true)}>
            <I.plus style={{ width: 12, height: 12 }} /> Log Break
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddBreak} className="border border-line rounded-lg p-3 bg-bg animate-pop flex flex-col gap-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">Log Manual Break</div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Time">
              <input type="time" value={breakStart} onChange={e => setBreakStart(e.target.value)} className="h-9 px-2 bg-white rounded border border-line-2 outline-none font-mono text-sm" required />
            </FormField>
            <FormField label="End Time">
              <input type="time" value={breakEnd} onChange={e => setBreakEnd(e.target.value)} className="h-9 px-2 bg-white rounded border border-line-2 outline-none font-mono text-sm" required />
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} className="accent-teal w-4 h-4" />
            <span>This is a paid break (deducts from worked time, not paid time)</span>
          </label>
          <div className="flex gap-2 justify-end mt-1">
            <button type="button" className="btn btn-ghost btn-sm text-xs" onClick={() => setShowAddForm(false)} disabled={busy}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm text-xs px-3" disabled={busy}>Add Break</button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-1.5 mt-1">
        {initialBreaks.length === 0 ? (
          <div className="text-xs text-ink-3 italic p-4 text-center border border-dashed border-line rounded-lg">
            No breaks logged for this shift.
          </div>
        ) : (
          initialBreaks.map((b) => (
            <div key={b.id} className="flex justify-between items-center p-2.5 border border-line rounded-lg bg-white text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber" />
                <span className="font-semibold text-ink-2 font-mono">
                  {new Date(b.break_start).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                  {b.break_end && <> – {new Date(b.break_end).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</>}
                </span>
                {b.duration_minutes && (
                  <span className="text-ink-3">({formatDuration(b.duration_minutes)})</span>
                )}
                {b.is_paid && (
                  <span className="text-[9px] font-semibold text-teal bg-teal-soft px-1.5 py-0.5 rounded">Paid</span>
                )}
              </div>
              <button className="text-rose hover:text-rose-ink border-0 bg-transparent cursor-pointer grid place-items-center" onClick={() => handleDeleteBreak(b.id)}>
                <I.trash style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
