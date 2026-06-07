"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal, Avatar, Icons as I } from "@/components/ui";
import type { AttendanceStylistRow as RowType, AttendanceSession, AttendanceBreak, AttendanceAuditEntry } from "@/types";
import { useTodayAttendance } from "@/hooks/useTodayAttendance";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { ATTENDANCE_AUDIT_SELECT, ATTENDANCE_BREAK_SELECT, ATTENDANCE_SESSION_SELECT } from "@/lib/supabase-selects";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import AdminEditForm from "./AdminEditForm";
import BreakEditor from "./BreakEditor";
import AuditLogTimeline from "./AuditLogTimeline";

interface AttendanceDetailModalProps {
  row: RowType;
  stylistId: string;
  salonId: string | null;
  onClose: () => void;
}

export default function AttendanceDetailModal({
  row,
  stylistId,
  salonId,
  onClose,
}: AttendanceDetailModalProps) {
  const { adminClockIn, adminMarkAbsent, adminEditSession, actionBusy } = useTodayAttendance(salonId);
  
  const [activeTab, setActiveTab] = useState<"edit" | "breaks" | "history">("edit");
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [breaks, setBreaks] = useState<AttendanceBreak[]>([]);
  const [auditLog, setAuditLog] = useState<AttendanceAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch session details, breaks, and audit log
  const loadDetails = useCallback(async (signal?: AbortSignal) => {
    const requestSignal = signal ?? new AbortController().signal;

    if (!row.sessionId || !salonId) {
      if (!requestSignal.aborted) setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      if (!requestSignal.aborted) setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch Session row
      const { data: sessData } = await supabase
        .from("attendance_sessions")
        .select(ATTENDANCE_SESSION_SELECT)
        .eq("id", row.sessionId)
        .abortSignal(requestSignal)
        .single();
      
      if (requestSignal.aborted) return;
      if (sessData) {
        setSession(sessData as AttendanceSession);
      }

      // 2. Fetch Breaks
      const { data: breaksData } = await supabase
        .from("attendance_breaks")
        .select(ATTENDANCE_BREAK_SELECT)
        .eq("session_id", row.sessionId)
        .order("break_start", { ascending: true })
        .abortSignal(requestSignal);

      if (requestSignal.aborted) return;
      setBreaks((breaksData || []) as AttendanceBreak[]);

      // 3. Fetch Audit Log
      const { data: auditData } = await supabase
        .from("attendance_audit_log")
        .select(ATTENDANCE_AUDIT_SELECT)
        .eq("session_id", row.sessionId)
        .order("created_at", { ascending: true })
        .abortSignal(requestSignal);

      if (requestSignal.aborted) return;
      setAuditLog((auditData || []) as AttendanceAuditEntry[]);
    } catch (err) {
      if (requestSignal.aborted) return;
      console.error("Error loading session details:", err);
    } finally {
      if (!requestSignal.aborted) setLoading(false);
    }
  }, [row.sessionId, salonId]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      void loadDetails(controller.signal);
    });
    return () => controller.abort();
  }, [loadDetails]);

  const handleManualClockIn = async () => {
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    await adminClockIn(stylistId, timeStr);
    onClose();
  };

  const handleMarkAbsent = async () => {
    await adminMarkAbsent(stylistId);
    onClose();
  };

  const handleSaveSession = async (updates: { clockInAt: string | null; clockOutAt: string | null; adminNote: string | null; isAbsent: boolean }, reason: string) => {
    if (session) {
      await adminEditSession(session.id, updates, reason);
      onClose();
    }
  };

  return (
    <Modal
      title="Attendance Shift Details"
      onClose={onClose}
      width="min(600px, 100%)"
      footer={
        <div className="flex justify-end items-center w-full">
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Hero Card */}
        <div className="flex items-center gap-3.5 bg-bg-2 p-4 rounded-xl border border-line">
          <Avatar initials={row.initials} tone={row.tone} className="w-[52px] h-[52px] border-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base text-ink">{row.stylistName}</span>
              <AttendanceStatusBadge status={row.displayStatus} />
            </div>
            <div className="text-xs text-ink-3 mt-1 font-sans">
              Shift Date: {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Tab Controls if session exists */}
        {row.sessionId && (
          <div className="flex border-b border-line gap-2 mt-2">
            {(["edit", "breaks", "history"] as const).map((tab) => (
              <button
                key={tab}
                className={`py-2 px-4 border-b-2 font-semibold text-xs transition duration-150 cursor-pointer capitalize ${
                  activeTab === tab
                    ? "border-teal text-teal"
                    : "border-transparent text-ink-3 hover:text-ink-2"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "edit" ? "Edit Times" : tab === "breaks" ? `Breaks (${breaks.length})` : "Audit History"}
              </button>
            ))}
          </div>
        )}

        {/* Tabs Render */}
        {loading ? (
          <div className="flex justify-center p-8">
            <div style={{ width: 24, height: 24, border: "3px solid var(--line)", borderTopColor: "var(--teal)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          </div>
        ) : !row.sessionId ? (
          <div className="flex flex-col items-center gap-3.5 p-6 text-center">
            <div className="w-12 h-12 bg-bg-2 rounded-full grid place-items-center text-ink-3">
              <I.clock style={{ width: 24, height: 24 }} />
            </div>
            <div>
              <div className="font-bold text-sm text-ink">No shift log exists for today.</div>
              <div className="text-xs text-ink-3 mt-1">Clock the stylist in manually or mark them absent.</div>
            </div>
            <div className="flex gap-2.5 mt-2">
              <button className="btn btn-primary btn-sm flex items-center gap-1.5" onClick={handleManualClockIn} disabled={actionBusy}>
                <I.clockIn style={{ width: 14, height: 14 }} /> Clock In
              </button>
              <button className="btn btn-outline btn-sm border-rose text-rose hover:bg-rose-soft/10" onClick={handleMarkAbsent} disabled={actionBusy}>
                Mark Absent
              </button>
            </div>
          </div>
        ) : (
          <div className="min-h-[220px]">
            {activeTab === "edit" && session && (
              <AdminEditForm
                session={session}
                onSave={handleSaveSession}
                actionBusy={actionBusy}
              />
            )}

            {activeTab === "breaks" && session && (
              <BreakEditor
                session={session}
                salonId={salonId}
                initialBreaks={breaks}
                onReload={loadDetails}
              />
            )}

            {activeTab === "history" && (
              <AuditLogTimeline log={auditLog} />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
