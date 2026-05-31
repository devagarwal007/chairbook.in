"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useProfile } from "@/context/ProfileContext";
import { useSalonData } from "@/hooks/useSalonData";
import { useAttendanceReports, type DailyReportItem, type MonthlyReportItem } from "@/hooks/useAttendanceReports";
import { Icons as I } from "@/components/ui/Icons";
import ReportFilters from "@/components/features/attendance/ReportFilters";
import DailyReport from "@/components/features/attendance/DailyReport";
import MonthlyReport from "@/components/features/attendance/MonthlyReport";
import CSVExportButton from "@/components/features/attendance/CSVExportButton";
import { todayDateKey } from "@/lib/attendance";

export default function ReportsPage() {
  const { salonId } = useProfile();
  const { stylists, loading: stylistsLoading } = useSalonData(salonId);
  const { loading: reportsLoading, loadDailyReport, loadMonthlyReport } = useAttendanceReports(salonId);

  // States
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");
  const [selectedStylistId, setSelectedStylistId] = useState<string>("all");
  const [date, setDate] = useState<string>(todayDateKey());
  
  // Start/End Dates (Default to current month)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  });

  const [dailyData, setDailyData] = useState<DailyReportItem[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyReportItem[]>([]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      void (async () => {
        if (viewMode === "daily") {
          const data = await loadDailyReport(date);
          if (active) setDailyData(data);
        } else {
          const data = await loadMonthlyReport(startDate, endDate);
          if (active) setMonthlyData(data);
        }
      })();
    });

    return () => {
      active = false;
    };
  }, [viewMode, date, startDate, endDate, salonId, loadDailyReport, loadMonthlyReport]);

  // Filter lists based on selected Stylist
  const filteredDaily = selectedStylistId === "all"
    ? dailyData
    : dailyData.filter(item => item.stylistId === selectedStylistId);

  const filteredMonthly = selectedStylistId === "all"
    ? monthlyData
    : monthlyData.filter(item => item.stylistId === selectedStylistId);

  return (
    <div className="app animate-fade-in">
      <div className="app-top">
        <div className="app-top-inner">
          <div className="brand">
            <Link 
              className="book-back" 
              href="/dashboard/attendance" 
              aria-label="Back" 
              style={{ background: "transparent", display: "inline-grid", placeItems: "center", width: 36, height: 36, textDecoration: "none" }}
            >
              <I.back />
            </Link>
            <span className="brand-text" style={{ marginLeft: 8 }}>Shift Reports</span>
          </div>
          <div className="greeting">
            <div className="h">Shift Performance</div>
            <div className="d">DAILY &amp; MONTHLY ATTENDANCE METRICS</div>
          </div>
          <div className="top-actions flex items-center gap-2">
            <CSVExportButton
              data={viewMode === "daily" ? filteredDaily : filteredMonthly}
              filename={
                viewMode === "daily"
                  ? `chairbook_daily_report_${date}`
                  : `chairbook_monthly_report_${startDate}_to_${endDate}`
              }
              type={viewMode}
            />
          </div>
        </div>
      </div>

      <main className="app-main" style={{ paddingBottom: 120 }}>
        {/* View Toggle */}
        <div className="flex items-center gap-2.5 mb-6 bg-white border border-line p-1 rounded-2xl max-w-xs shadow-sm">
          <button
            onClick={() => setViewMode("daily")}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition cursor-pointer ${
              viewMode === "daily" ? "bg-teal text-white" : "text-ink-3 hover:text-ink"
            }`}
          >
            Daily Report
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition cursor-pointer ${
              viewMode === "monthly" ? "bg-teal text-white" : "text-ink-3 hover:text-ink"
            }`}
          >
            Monthly Summary
          </button>
        </div>

        {/* Filters Panel */}
        <ReportFilters
          stylists={stylists.map(s => ({ id: String(s.id), name: s.name }))}
          selectedStylistId={selectedStylistId}
          onChangeStylistId={setSelectedStylistId}
          viewMode={viewMode}
          date={date}
          onChangeDate={setDate}
          startDate={startDate}
          endDate={endDate}
          onChangeRange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />

        {/* Main Table view */}
        {viewMode === "daily" ? (
          <DailyReport rows={filteredDaily} loading={reportsLoading || stylistsLoading} />
        ) : (
          <MonthlyReport rows={filteredMonthly} loading={reportsLoading || stylistsLoading} />
        )}
      </main>
    </div>
  );
}
