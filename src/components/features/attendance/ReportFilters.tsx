"use client";

import React from "react";
import { Icons as I } from "@/components/ui/Icons";

interface StylistOption {
  id: string;
  name: string;
}

interface ReportFiltersProps {
  stylists: StylistOption[];
  selectedStylistId: string;
  onChangeStylistId: (id: string) => void;
  viewMode: "daily" | "monthly";
  date: string;
  onChangeDate: (date: string) => void;
  startDate: string;
  endDate: string;
  onChangeRange: (start: string, end: string) => void;
}

export default function ReportFilters({
  stylists,
  selectedStylistId,
  onChangeStylistId,
  viewMode,
  date,
  onChangeDate,
  startDate,
  endDate,
  onChangeRange,
}: ReportFiltersProps) {
  return (
    <div className="bg-white border border-line rounded-2xl p-5 mb-6 shadow-sm flex items-end gap-4 flex-wrap max-[720px]:flex-col max-[720px]:items-stretch">
      {/* View Selector (Informational indicator or toggle if needed, usually set from parent tab, but filters can adapt) */}
      <div className="flex-1 min-w-[200px] flex flex-col gap-2">
        <label className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
          Filter by Stylist
        </label>
        <div className="relative">
          <select
            value={selectedStylistId}
            onChange={(e) => onChangeStylistId(e.target.value)}
            className="w-full h-11 pl-4 pr-10 border border-line rounded-xl text-sm bg-white text-ink focus:outline-none focus:border-teal transition appearance-none font-medium"
          >
            <option value="all">All Team Members</option>
            {stylists.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none">
            <I.chev style={{ width: 14, height: 14 }} />
          </div>
        </div>
      </div>

      {viewMode === "daily" ? (
        <div className="min-w-[180px] max-[720px]:w-full flex flex-col gap-2">
          <label className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
            Select Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => onChangeDate(e.target.value)}
              className="w-full h-11 pl-4 pr-4 border border-line rounded-xl text-sm bg-white text-ink focus:outline-none focus:border-teal transition font-medium"
            />
          </div>
        </div>
      ) : (
        <>
          <div className="min-w-[150px] max-[720px]:w-full flex-1 flex flex-col gap-2">
            <label className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onChangeRange(e.target.value, endDate)}
              className="w-full h-11 px-4 border border-line rounded-xl text-sm bg-white text-ink focus:outline-none focus:border-teal transition font-medium"
            />
          </div>
          <div className="min-w-[150px] max-[720px]:w-full flex-1 flex flex-col gap-2">
            <label className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onChangeRange(startDate, e.target.value)}
              className="w-full h-11 px-4 border border-line rounded-xl text-sm bg-white text-ink focus:outline-none focus:border-teal transition font-medium"
            />
          </div>
        </>
      )}
    </div>
  );
}
