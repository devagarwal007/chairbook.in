"use client";

import React from "react";
import type { MonthlyReportItem } from "@/hooks/useAttendanceReports";
import { formatDuration } from "@/lib/attendance";

interface MonthlyReportProps {
  rows: MonthlyReportItem[];
  loading: boolean;
}

export default function MonthlyReport({ rows, loading }: MonthlyReportProps) {
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
        No records found for this period.
      </div>
    );
  }

  return (
    <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line bg-bg-2">
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Stylist</th>
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Attendance Rate</th>
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Days Present</th>
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Lates</th>
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Absents</th>
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Leaves</th>
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Total Worked</th>
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Avg Shift</th>
              <th className="p-4.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Paid Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const presentRate = row.workingDays > 0 
                ? Math.round((row.daysPresent / row.workingDays) * 100) 
                : 0;

              const avgShiftMinutes = row.daysPresent > 0 
                ? Math.round(row.totalWorkedMinutes / row.daysPresent) 
                : 0;

              return (
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
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-bg-2 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${presentRate >= 90 ? "bg-teal" : presentRate >= 75 ? "bg-amber" : "bg-rose"}`}
                          style={{ width: `${Math.min(presentRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-ink-2 font-mono">{presentRate}%</span>
                    </div>
                  </td>
                  <td className="p-4.5 text-sm text-ink-2 font-medium">
                    <span className="font-semibold">{row.daysPresent}</span> / {row.workingDays} <span className="text-[10px] text-ink-3">days</span>
                  </td>
                  <td className="p-4.5 text-sm">
                    {row.daysLate > 0 ? (
                      <span className="text-amber-ink bg-amber-soft px-2 py-0.5 rounded-md font-bold font-mono text-xs">
                        {row.daysLate}
                      </span>
                    ) : (
                      <span className="text-ink-3 font-mono">0</span>
                    )}
                  </td>
                  <td className="p-4.5 text-sm">
                    {row.daysAbsent > 0 ? (
                      <span className="text-rose bg-rose-soft px-2 py-0.5 rounded-md font-bold font-mono text-xs">
                        {row.daysAbsent}
                      </span>
                    ) : (
                      <span className="text-ink-3 font-mono">0</span>
                    )}
                  </td>
                  <td className="p-4.5 text-sm">
                    {row.daysLeave > 0 ? (
                      <span className="text-blue bg-blue-soft px-2 py-0.5 rounded-md font-bold font-mono text-xs">
                        {row.daysLeave}
                      </span>
                    ) : (
                      <span className="text-ink-3 font-mono">0</span>
                    )}
                  </td>
                  <td className="p-4.5 text-sm text-ink-2 font-semibold">
                    {row.totalWorkedMinutes > 0 ? formatDuration(row.totalWorkedMinutes) : "--"}
                  </td>
                  <td className="p-4.5 text-sm text-ink-2 font-medium">
                    {avgShiftMinutes > 0 ? formatDuration(avgShiftMinutes) : "--"}
                  </td>
                  <td className="p-4.5 text-sm text-teal font-bold">
                    {row.paidMinutes > 0 ? formatDuration(row.paidMinutes) : "--"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
