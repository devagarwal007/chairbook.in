"use client";

import React, { useState } from "react";
import { FormField } from "@/components/ui";
import { buildIndiaTimestamp, validateChronologicalRange } from "@/lib/attendance";
import type { AttendanceSession } from "@/types";

interface AdminEditFormProps {
  session: AttendanceSession;
  onSave: (
    updates: { clockInAt: string | null; clockOutAt: string | null; adminNote: string | null; isAbsent: boolean },
    reason: string
  ) => Promise<void>;
  actionBusy: boolean;
}

export default function AdminEditForm({
  session,
  onSave,
  actionBusy,
}: AdminEditFormProps) {
  const [isAbsent, setIsAbsent] = useState(session.is_absent);
  const [hasClockIn, setHasClockIn] = useState(!!session.clock_in_at);
  const [hasClockOut, setHasClockOut] = useState(!!session.clock_out_at);

  const defaultInTime = session.clock_in_at
    ? new Date(session.clock_in_at).toTimeString().slice(0, 5)
    : "10:00";
  const defaultOutTime = session.clock_out_at
    ? new Date(session.clock_out_at).toTimeString().slice(0, 5)
    : "18:00";

  const [inTime, setInTime] = useState(defaultInTime);
  const [outTime, setOutTime] = useState(defaultOutTime);
  const [adminNote, setAdminNote] = useState(session.admin_note || "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) return;

    const dateStr = session.session_date;
    const clockInAt = hasClockIn ? buildIndiaTimestamp(dateStr, inTime) : null;
    const clockOutAt = hasClockOut ? buildIndiaTimestamp(dateStr, outTime) : null;
    const rangeError = validateChronologicalRange(clockInAt, clockOutAt);
    if (rangeError) {
      setError(rangeError);
      return;
    }

    setError(null);
    onSave({
      clockInAt,
      clockOutAt,
      adminNote: adminNote.trim() || null,
      isAbsent,
    }, reason.trim());
  };

  const isFormValid = reason.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm mt-3 animate-fade-in">
      <div className="flex gap-4 items-center">
        <label className="flex items-center gap-2 cursor-pointer font-semibold text-ink">
          <input
            type="checkbox"
            checked={isAbsent}
            onChange={(e) => {
              setIsAbsent(e.target.checked);
              if (e.target.checked) {
                setHasClockIn(false);
                setHasClockOut(false);
              }
            }}
            className="accent-teal w-4 h-4"
          />
          <span>Mark Absent</span>
        </label>
      </div>

      {!isAbsent && (
        <div className="grid grid-cols-2 gap-4 border border-line rounded-lg p-3.5 bg-bg-2">
          {/* Clock In */}
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-ink-2">
              <input
                type="checkbox"
                checked={hasClockIn}
                onChange={(e) => setHasClockIn(e.target.checked)}
                className="accent-teal w-3.5 h-3.5"
              />
              <span>Clock-In Logged</span>
            </label>
            {hasClockIn && (
              <input
                type="time"
                value={inTime}
                onChange={(e) => setInTime(e.target.value)}
                className="h-10 px-3 border border-line-2 rounded-lg outline-none bg-white text-sm"
                required
              />
            )}
          </div>

          {/* Clock Out */}
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-ink-2">
              <input
                type="checkbox"
                checked={hasClockOut}
                disabled={!hasClockIn}
                onChange={(e) => setHasClockOut(e.target.checked)}
                className="accent-teal w-3.5 h-3.5"
              />
              <span>Clock-Out Logged</span>
            </label>
            {hasClockIn && hasClockOut && (
              <input
                type="time"
                value={outTime}
                onChange={(e) => setOutTime(e.target.value)}
                className="h-10 px-3 border border-line-2 rounded-lg outline-none bg-white text-sm"
                required
              />
            )}
          </div>
        </div>
      )}

      {/* Admin Notes */}
      <FormField label="Administrator Notes">
        <input
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="e.g. Approved half-day leave"
          className="w-full h-10 px-3 border border-line-2 rounded-lg outline-none bg-white text-sm"
        />
      </FormField>

      {/* Mandatory reason */}
      <FormField label="Reason for adjustment (required for audit trail)">
        <textarea
          placeholder="Why are you changing this stylist's attendance times?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full p-2.5 border border-line-2 rounded-lg outline-none resize-none font-sans text-sm bg-white"
          required
        />
      </FormField>

      {error && <div className="text-xs font-semibold text-rose bg-rose-soft rounded-lg px-3 py-2">{error}</div>}

      <button
        type="submit"
        className="btn btn-primary h-10 mt-2 font-semibold"
        disabled={actionBusy || !isFormValid}
      >
        {actionBusy ? "Saving adjustments..." : "Save Shift Adjustments"}
      </button>
    </form>
  );
}
