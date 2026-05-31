"use client";

import React from "react";
import type { DailyReportItem } from "@/hooks/useAttendanceReports";
import { formatDuration } from "@/lib/attendance";

interface DailyReportProps {
  rows: DailyReportItem[];
  loading: boolean;
}

export default function DailyReport({ rows, loading }: DailyReportProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 bg-white border border-line rounded-2xl">
        <div style={{ width: 28, height: 28, border: "3px solid var(--line)", borderTopColor: "var(--teal)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="bg-white border border-line rounded-2xl p-10 text-center text-ink-3 italic">
        No records found for this date.
      </div>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "present":
        return "badge teal";
      case "late":
        return "badge warning";
      case "absent":
        return "badge danger";
      case "on leave":
        return "badge info";
      case "rest day":
        return "badge neutral";
      default:
        return "badge neutral";
    }
  };

  return (
    <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line bg-bg-2">
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Stylist</th>
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Status</th>
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Clock In</th>
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Clock Out</th>
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Worked Hours</th>
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Breaks</th>
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Paid Time</th>
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.stylistId} className="hover:bg-bg/40 transition">
                <td className="p-4.5">
                  <div className="flex items-center gap-3">
                    <span className={`avatar sm tone-${row.tone}`} style={{ fontSize: 10, width: 26, height: 26 }}>
                      {row.initials}
                    </span>
                    <span className="text-sm font-semibold text-ink">{row.stylistName}</span>
                  </div>
                </td>
                <td className="p-4.5">
                  <span className={getStatusBadgeClass(row.status)}>{row.status}</span>
                </td>
                <td className="p-4.5 text-sm text-ink-2 font-mono">{row.clockIn}</td>
                <td className="p-4.5 text-sm text-ink-2 font-mono">{row.clockOut}</td>
                <td className="p-4.5 text-sm text-ink-2 font-medium">
                  {row.workedMinutes > 0 ? formatDuration(row.workedMinutes) : "--"}
                </td>
                <td className="p-4.5 text-sm text-ink-2 font-medium">
                  {row.breakMinutes > 0 ? formatDuration(row.breakMinutes) : "--"}
                </td>
                <td className="p-4.5 text-sm text-ink font-semibold">
                  {row.paidMinutes > 0 ? formatDuration(row.paidMinutes) : "--"}
                </td>
                <td className="p-4.5 text-xs text-ink-3 italic max-w-[200px] truncate" title={row.adminNote || ""}>
                  {row.adminNote || "--"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
