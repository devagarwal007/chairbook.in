"use client";

import React, { useState } from "react";
import type { AttendanceStylistRow as RowType } from "@/types";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import { Avatar, Icons as I } from "@/components/ui";
import { formatDuration } from "@/lib/attendance";

interface AttendanceStylistRowProps {
  row: RowType;
  actionBusy: boolean;
  onClockIn: (timeStr: string) => Promise<void>;
  onClockOut: (timeStr: string) => Promise<void>;
  onMarkAbsent: () => Promise<void>;
  onViewDetails: () => void;
}

export default function AttendanceStylistRow({
  row,
  actionBusy,
  onClockIn,
  onClockOut,
  onMarkAbsent,
  onViewDetails,
}: AttendanceStylistRowProps) {
  const [showClockInPicker, setShowClockInPicker] = useState(false);
  const [showClockOutPicker, setShowClockOutPicker] = useState(false);
  const [timeInput, setTimeInput] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

  const handleClockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await onClockIn(timeInput);
    setShowClockInPicker(false);
  };

  const handleClockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    await onClockOut(timeInput);
    setShowClockOutPicker(false);
  };

  return (
    <div className="bg-white border border-line rounded-xl p-[14px_18px] flex items-center justify-between gap-4 flex-wrap hover:border-line-2 transition duration-150 relative">
      <div className="flex items-center gap-3.5 min-w-0">
        <Avatar initials={row.initials} tone={row.tone} className="w-[42px] h-[42px] border-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-ink truncate">{row.stylistName}</span>
            <AttendanceStatusBadge status={row.displayStatus} />
            {row.hasPendingCorrection && (
              <span className="text-[9px] font-semibold text-amber bg-amber-soft px-1.5 py-0.5 rounded border border-amber/20 animate-pulse">
                Correction Pending
              </span>
            )}
          </div>
          <div className="text-xs text-ink-3 mt-1 flex gap-2 flex-wrap font-mono">
            {row.clockInAt && (
              <span>In: {new Date(row.clockInAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
            )}
            {row.clockOutAt && (
              <span>Out: {new Date(row.clockOutAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
            )}
            {row.workedMinutes > 0 && (
              <span className="font-medium text-teal">Worked: {formatDuration(row.workedMinutes)}</span>
            )}
            {row.breakMinutes > 0 && (
              <span className="font-medium text-amber">Breaks: {formatDuration(row.breakMinutes)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap max-[560px]:w-full max-[560px]:justify-end">
        {/* Inline Clock-In time picker */}
        {showClockInPicker ? (
          <form onSubmit={handleClockIn} className="flex items-center gap-1.5 bg-bg-2 p-1.5 rounded-lg border border-line animate-pop">
            <input
              type="time"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              className="px-2 h-7 rounded border border-line-2 outline-none font-mono text-xs bg-white"
              required
            />
            <button type="submit" className="btn btn-primary btn-sm px-3 h-7 text-xs" disabled={actionBusy}>
              Clock In
            </button>
            <button type="button" className="btn btn-ghost btn-sm px-2 h-7 text-xs" onClick={() => setShowClockInPicker(false)}>
              Cancel
            </button>
          </form>
        ) : showClockOutPicker ? (
          <form onSubmit={handleClockOut} className="flex items-center gap-1.5 bg-bg-2 p-1.5 rounded-lg border border-line animate-pop">
            <input
              type="time"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              className="px-2 h-7 rounded border border-line-2 outline-none font-mono text-xs bg-white"
              required
            />
            <button type="submit" className="btn btn-primary btn-sm px-3 h-7 text-xs" disabled={actionBusy}>
              Clock Out
            </button>
            <button type="button" className="btn btn-ghost btn-sm px-2 h-7 text-xs" onClick={() => setShowClockOutPicker(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <>
            {row.displayStatus === "not_clocked_in" && (
              <>
                <button
                  className="btn btn-outline btn-sm text-xs h-8 px-3 flex items-center gap-1.5"
                  onClick={() => {
                    const d = new Date();
                    setTimeInput(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
                    setShowClockInPicker(true);
                  }}
                  disabled={actionBusy}
                >
                  <I.clockIn style={{ width: 13, height: 13 }} /> Clock In
                </button>
                <button
                  className="btn btn-outline btn-sm text-xs h-8 px-3 border-rose text-rose hover:bg-rose-soft/10"
                  onClick={onMarkAbsent}
                  disabled={actionBusy}
                >
                  Absent
                </button>
              </>
            )}

            {(row.displayStatus === "working" || row.displayStatus === "late" || row.displayStatus === "on_break") && (
              <button
                className="btn btn-outline btn-sm text-xs h-8 px-3 border-rose text-rose hover:bg-rose-soft/10 flex items-center gap-1.5"
                onClick={() => {
                  const d = new Date();
                  setTimeInput(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
                  setShowClockOutPicker(true);
                }}
                disabled={actionBusy}
              >
                <I.clockOut style={{ width: 13, height: 13 }} /> Clock Out
              </button>
            )}

            <button
              className="btn btn-ghost btn-sm text-xs h-8 px-3 text-ink-3 hover:text-ink flex items-center gap-1"
              onClick={onViewDetails}
            >
              <I.edit style={{ width: 13, height: 13 }} /> Edit / Details
            </button>
          </>
        )}
      </div>
    </div>
  );
}
