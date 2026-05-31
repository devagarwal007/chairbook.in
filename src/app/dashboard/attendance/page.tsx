"use client";

import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import { useProfile } from "@/context/ProfileContext";
import { useTodayAttendance } from "@/hooks/useTodayAttendance";
import { useCorrectionRequests } from "@/hooks/useCorrectionRequests";
import TodayAttendanceGrid from "@/components/features/attendance/TodayAttendanceGrid";
import CorrectionReviewCard from "@/components/features/attendance/CorrectionReviewCard";
import { Icons as I } from "@/components/ui";

export default function AdminAttendancePage() {
  const { salonId } = useProfile();
  const [activeTab, setActiveTab] = useState<"today" | "corrections">("today");
  
  const { rows, loading, actionBusy, adminClockIn, adminClockOut, adminMarkAbsent, reload } = useTodayAttendance(salonId);
  const { requests, loading: requestsLoading, reviewCorrection, reload: reloadCorrections } = useCorrectionRequests(salonId);

  const pendingRequests = requests.filter(r => r.status === "pending");

  // Summary Metrics
  const metrics = {
    working: rows.filter(r => r.displayStatus === "working" || r.displayStatus === "late").length,
    break: rows.filter(r => r.displayStatus === "on_break").length,
    absent: rows.filter(r => r.displayStatus === "absent").length,
    notClocked: rows.filter(r => r.displayStatus === "not_clocked_in").length,
  };

  const handleReview = async (requestId: string, status: "approved" | "rejected", reason?: string) => {
    const success = await reviewCorrection(requestId, status, reason);
    if (success) {
      reload();
      reloadCorrections();
    }
  };

  return (
    <div className="app animate-fade-in">
      <Header title="Attendance" subtitle="MANAGE TEAM SHIFTS" />

      <main className="app-main" style={{ paddingBottom: 120 }}>
        {/* Metric Cards Row */}
        <div className="grid grid-cols-4 gap-3 mb-6 max-[720px]:grid-cols-2 max-[480px]:grid-cols-1">
          {[
            { label: "Working", value: metrics.working, tone: "teal-soft", color: "text-teal font-semibold", dotColor: "bg-teal" },
            { label: "On Break", value: metrics.break, tone: "bg-amber-soft", color: "text-amber-ink font-semibold", dotColor: "bg-amber" },
            { label: "Absent", value: metrics.absent, tone: "bg-rose-soft", color: "text-rose font-semibold", dotColor: "bg-rose" },
            { label: "Not Clocked In", value: metrics.notClocked, tone: "bg-bg-2", color: "text-ink-3 font-semibold", dotColor: "bg-ink-3" },
          ].map((m) => (
            <div key={m.label} className={`border border-line rounded-xl p-4 flex items-center justify-between ${m.tone}`}>
              <div>
                <div className="text-[10px] uppercase tracking-[0.05em] text-ink-3 font-medium flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${m.dotColor}`} />
                  {m.label}
                </div>
                <div className="text-xl font-bold font-mono text-ink mt-1.5">{m.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Selection Header */}
        <div className="flex justify-between items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              className={`py-2 px-4 border-b-2 font-semibold text-sm transition duration-150 cursor-pointer ${
                activeTab === "today"
                  ? "border-teal text-teal"
                  : "border-transparent text-ink-3 hover:text-ink-2"
              }`}
              onClick={() => setActiveTab("today")}
            >
              Today&apos;s Grid
            </button>
            <button
              className={`py-2 px-4 border-b-2 font-semibold text-sm transition duration-150 cursor-pointer flex items-center gap-2 ${
                activeTab === "corrections"
                  ? "border-teal text-teal"
                  : "border-transparent text-ink-3 hover:text-ink-2"
              }`}
              onClick={() => setActiveTab("corrections")}
            >
              Correction Requests
              {pendingRequests.length > 0 && (
                <span className="text-[9px] font-bold text-white bg-rose w-4 h-4 rounded-full flex items-center justify-center font-mono">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>

          <Link href="/dashboard/attendance/reports" className="btn btn-outline btn-sm flex items-center gap-1.5 font-semibold" style={{ textDecoration: "none" }}>
            <I.clipboardList style={{ width: 14, height: 14 }} /> Shift Reports
          </Link>
        </div>

        {/* Tab Contents */}
        {activeTab === "today" ? (
          <TodayAttendanceGrid
            rows={rows}
            loading={loading}
            actionBusy={actionBusy}
            adminClockIn={adminClockIn}
            adminClockOut={adminClockOut}
            adminMarkAbsent={adminMarkAbsent}
            reload={reload}
            salonId={salonId}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {requestsLoading ? (
              <div className="flex justify-center p-8">
                <div style={{ width: 24, height: 24, border: "3px solid var(--line)", borderTopColor: "var(--teal)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="bg-white border border-line rounded-xl p-8 text-center text-ink-3 italic text-sm">
                No pending correction requests.
              </div>
            ) : (
              pendingRequests.map(req => (
                <CorrectionReviewCard
                  key={req.id}
                  request={req}
                  onApprove={() => handleReview(req.id, "approved")}
                  onReject={(reason) => handleReview(req.id, "rejected", reason)}
                  actionBusy={actionBusy}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
