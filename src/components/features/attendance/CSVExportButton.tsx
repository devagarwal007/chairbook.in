"use client";

import React from "react";
import { Icons as I } from "@/components/ui/Icons";
import { useToast } from "@/context/ToastContext";
import type { DailyReportItem, MonthlyReportItem } from "@/hooks/useAttendanceReports";

interface CSVExportButtonProps {
  data: (DailyReportItem | MonthlyReportItem)[];
  filename: string;
  type: "daily" | "monthly";
}

export default function CSVExportButton({ data, filename, type }: CSVExportButtonProps) {
  const { show: showToast } = useToast();

  const handleExport = () => {
    if (!data || data.length === 0) {
      showToast("No data to export.", 2500);
      return;
    }

    let csvContent = "";

    if (type === "daily") {
      // Headers
      const headers = [
        "Stylist Name",
        "Status",
        "Clock In",
        "Clock Out",
        "Worked Time",
        "Break Time",
        "Paid Time",
        "Admin Note",
      ];
      csvContent += headers.join(",") + "\n";

      // Rows
      (data as DailyReportItem[]).forEach((row) => {
        const formatMins = (mins: number) => {
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          return h > 0 ? `${h}h ${m}m` : `${m}m`;
        };

        const csvRow = [
          `"${row.stylistName.replace(/"/g, '""')}"`,
          `"${row.status}"`,
          `"${row.clockIn}"`,
          `"${row.clockOut}"`,
          `"${formatMins(row.workedMinutes)}"`,
          `"${formatMins(row.breakMinutes)}"`,
          `"${formatMins(row.paidMinutes)}"`,
          `"${(row.adminNote || "").replace(/"/g, '""')}"`,
        ];
        csvContent += csvRow.join(",") + "\n";
      });
    } else {
      // Monthly headers
      const headers = [
        "Stylist Name",
        "Working Days",
        "Days Present",
        "Days Late",
        "Days Absent",
        "Days Leave",
        "Total Worked Hours",
        "Total Break Hours",
        "Total Paid Hours",
      ];
      csvContent += headers.join(",") + "\n";

      // Rows
      (data as MonthlyReportItem[]).forEach((row) => {
        const toHours = (mins: number) => (mins / 60).toFixed(1) + "h";

        const csvRow = [
          `"${row.stylistName.replace(/"/g, '""')}"`,
          row.workingDays,
          row.daysPresent,
          row.daysLate,
          row.daysAbsent,
          row.daysLeave,
          `"${toHours(row.totalWorkedMinutes)}"`,
          `"${toHours(row.totalBreakMinutes)}"`,
          `"${toHours(row.paidMinutes)}"`,
        ];
        csvContent += csvRow.join(",") + "\n";
      });
    }

    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("✓ CSV exported successfully");
    } catch (err) {
      console.error("Export to CSV failed", err);
      showToast("Export failed.", 2500);
    }
  };

  return (
    <button
      onClick={handleExport}
      className="btn btn-outline btn-sm flex items-center gap-1.75 font-semibold text-teal hover:bg-teal hover:text-white transition duration-150"
    >
      <I.download style={{ width: 14, height: 14 }} />
      Export CSV
    </button>
  );
}
