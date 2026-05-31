"use client";

import React, { useState } from "react";
import { useCorrectionRequests } from "@/hooks/useCorrectionRequests";
import { useToast } from "@/context/ToastContext";
import { buildIndiaTimestamp, todayDateKey, validateChronologicalRange } from "@/lib/attendance";
import { Modal, FormField } from "@/components/ui";
import type { AttendanceSession } from "@/types";

interface CorrectionRequestFormProps {
  session: AttendanceSession | null;
  stylistId: string | null;
  salonId: string | null;
  onClose: () => void;
}

export default function CorrectionRequestForm({
  session,
  stylistId,
  salonId,
  onClose,
}: CorrectionRequestFormProps) {
  const { submitCorrection, actionBusy } = useCorrectionRequests(salonId);
  const { show: showToast } = useToast();

  const [correctClockIn, setCorrectClockIn] = useState(false);
  const [correctClockOut, setCorrectClockOut] = useState(false);

  // Default times
  const defaultInTime = session?.clock_in_at
    ? new Date(session.clock_in_at).toTimeString().slice(0, 5)
    : "10:00";
  const defaultOutTime = session?.clock_out_at
    ? new Date(session.clock_out_at).toTimeString().slice(0, 5)
    : "18:00";

  const [inTime, setInTime] = useState(defaultInTime);
  const [outTime, setOutTime] = useState(defaultOutTime);
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    if (!reason.trim()) return;

    // Construct timestamps
    const dateStr = session?.session_date || todayDateKey();
    const inTimestamp = correctClockIn ? buildIndiaTimestamp(dateStr, inTime) : null;
    const outTimestamp = correctClockOut ? buildIndiaTimestamp(dateStr, outTime) : null;

    if (!correctClockIn && !correctClockOut) return;
    if (!session && !inTimestamp) {
      showToast("Add a clock-in time for a missing shift correction.", 3000);
      return;
    }

    const effectiveClockIn = inTimestamp || session?.clock_in_at || null;
    const rangeError = validateChronologicalRange(effectiveClockIn, outTimestamp);
    if (rangeError) {
      showToast(rangeError, 2500);
      return;
    }

    const success = await submitCorrection({
      sessionId: session?.id || null,
      stylistId: stylistId || "",
      sessionDate: dateStr,
      reason: reason.trim(),
      requestedClockIn: inTimestamp,
      requestedClockOut: outTimestamp,
    });

    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      title="Request Attendance Correction"
      onClose={onClose}
      width="min(460px, 100%)"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={actionBusy}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={actionBusy || !reason.trim() || (!correctClockIn && !correctClockOut)}
          >
            {actionBusy ? "Submitting..." : "Submit Request"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm text-ink-2">
        <p className="m-0 leading-relaxed text-ink-3">
          Did you forget to clock in/out? Request a correction below. Your salon administrator will review and apply the changes.
        </p>

        {/* Correct clock-in */}
        <div className="border border-line rounded-lg p-3">
          <label className="flex items-center gap-2 font-semibold cursor-pointer text-ink">
            <input
              type="checkbox"
              checked={correctClockIn}
              onChange={e => setCorrectClockIn(e.target.checked)}
              className="accent-teal w-4 h-4"
            />
            <span>Correct Clock-In Time</span>
          </label>
          {correctClockIn && (
            <div className="mt-3">
              <FormField label="Requested Clock-In Time">
                <input
                  type="time"
                  value={inTime}
                  onChange={e => setInTime(e.target.value)}
                  className="w-full h-[40px] px-3 border border-line-2 rounded-lg outline-none"
                />
              </FormField>
            </div>
          )}
        </div>

        {/* Correct clock-out */}
        <div className="border border-line rounded-lg p-3">
          <label className="flex items-center gap-2 font-semibold cursor-pointer text-ink">
            <input
              type="checkbox"
              checked={correctClockOut}
              onChange={e => setCorrectClockOut(e.target.checked)}
              className="accent-teal w-4 h-4"
            />
            <span>Correct Clock-Out Time</span>
          </label>
          {correctClockOut && (
            <div className="mt-3">
              <FormField label="Requested Clock-Out Time">
                <input
                  type="time"
                  value={outTime}
                  onChange={e => setOutTime(e.target.value)}
                  className="w-full h-[40px] px-3 border border-line-2 rounded-lg outline-none"
                />
              </FormField>
            </div>
          )}
        </div>

        {/* Reason */}
        <FormField label="Reason for correction (required)">
          <textarea
            placeholder="e.g. Forgot to clock in when starting, or system offline"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            className="w-full p-2.5 border border-line-2 rounded-lg outline-none resize-none font-sans text-sm"
            required
          />
        </FormField>
      </div>
    </Modal>
  );
}
