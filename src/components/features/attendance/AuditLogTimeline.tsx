"use client";

import React from "react";
import type { AttendanceAuditEntry } from "@/types";

interface AuditLogTimelineProps {
  log: AttendanceAuditEntry[];
}

const actionLabels: Record<string, string> = {
  manual_clock_in: "Manual Clock-In",
  manual_clock_out: "Manual Clock-Out",
  edit_clock_in: "Clock-In Time Edited",
  edit_clock_out: "Clock-Out Time Edited",
  add_break: "Manual Break Logged",
  edit_break: "Break Record Adjusted",
  delete_break: "Break Record Deleted",
  mark_absent: "Marked Absent",
  mark_present: "Marked Present",
  approve_correction: "Approved Correction Request",
  reject_correction: "Rejected Correction Request",
};

export default function AuditLogTimeline({ log }: AuditLogTimelineProps) {
  if (log.length === 0) {
    return (
      <div className="text-xs text-ink-3 italic p-4 text-center border border-dashed border-line rounded-lg mt-3">
        No modifications logged. Original record holds.
      </div>
    );
  }

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "-";
    try {
      return new Date(isoString).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex flex-col relative pl-6 mt-4 before:content-[''] before:absolute before:left-[11px] before:top-1.5 before:bottom-1.5 before:w-[1px] before:bg-line animate-fade-in">
      {log.map((entry, index) => {
        const date = new Date(entry.created_at);
        const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        const label = actionLabels[entry.action_type] || entry.action_type.replace("_", " ");

        return (
          <div key={entry.id || index} className="relative mb-5 last:mb-0 text-xs">
            {/* Timeline Dot */}
            <span className="absolute left-[-21px] top-1 w-2.5 h-2.5 rounded-full bg-teal border-2 border-white ring-1 ring-line shrink-0" />
            
            <div className="flex flex-col gap-1 bg-bg-2 p-3 rounded-lg border border-line">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className="font-bold text-ink-2 capitalize">{label}</span>
                <span className="text-[10px] text-ink-4 font-mono">{dateStr}</span>
              </div>
              
              <div className="text-ink-3 mt-1 font-sans">
                By <span className="font-medium text-ink-2">{entry.editor_name || "System"}</span>:
                {entry.field_changed && (
                  <span className="ml-1 leading-[1.4]">
                    Changed <code className="bg-line px-1 rounded text-[10px]">{entry.field_changed.replace("_", " ")}</code> from{" "}
                    <strong className="text-ink-2 font-mono">{formatTime(entry.old_value)}</strong> to{" "}
                    <strong className="text-ink-2 font-mono">{formatTime(entry.new_value)}</strong>
                  </span>
                )}
              </div>

              {entry.reason && (
                <div className="text-[11px] text-ink-3 italic mt-1.5 pl-2 border-l-2 border-line-2">
                  &ldquo;{entry.reason}&rdquo;
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
