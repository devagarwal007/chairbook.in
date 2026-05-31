"use client";

import React, { useState } from "react";
import type { AttendanceStylistRow as RowType } from "@/types";
import AttendanceStylistRow from "./AttendanceStylistRow";
import AttendanceDetailModal from "./AttendanceDetailModal";

interface TodayAttendanceGridProps {
  rows: RowType[];
  loading: boolean;
  actionBusy: boolean;
  adminClockIn: (stylistId: string, timeStr: string) => Promise<void>;
  adminClockOut: (sessionId: string, timeStr: string) => Promise<void>;
  adminMarkAbsent: (stylistId: string) => Promise<void>;
  reload: () => void;
  salonId: string | null;
}

export default function TodayAttendanceGrid({
  rows,
  loading,
  actionBusy,
  adminClockIn,
  adminClockOut,
  adminMarkAbsent,
  reload,
  salonId,
}: TodayAttendanceGridProps) {
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col gap-2.5 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[74px] bg-white border border-line rounded-xl" />
        ))}
      </div>
    );
  }

  const selectedRow = rows.find(r => r.stylistId === selectedStylistId) || null;

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      {rows.length === 0 ? (
        <div className="bg-white border border-line rounded-xl p-8 text-center text-ink-3 italic text-sm">
          No active stylists found in the salon.
        </div>
      ) : (
        rows.map(row => (
          <AttendanceStylistRow
            key={row.stylistId}
            row={row}
            actionBusy={actionBusy}
            onClockIn={(time) => adminClockIn(row.stylistId, time)}
            onClockOut={(time) => adminClockOut(row.sessionId!, time)}
            onMarkAbsent={() => adminMarkAbsent(row.stylistId)}
            onViewDetails={() => setSelectedStylistId(row.stylistId)}
          />
        ))
      )}

      {selectedStylistId && selectedRow && (
        <AttendanceDetailModal
          stylistId={selectedStylistId}
          row={selectedRow}
          salonId={salonId}
          onClose={() => {
            setSelectedStylistId(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
