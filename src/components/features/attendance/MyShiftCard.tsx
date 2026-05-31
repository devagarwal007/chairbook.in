"use client";

import React, { useState, useEffect } from "react";
import { useMyShift } from "@/hooks/useMyShift";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import { Icons as I } from "@/components/ui";
import { formatDuration } from "@/lib/attendance";
import CorrectionRequestForm from "./CorrectionRequestForm";

interface MyShiftCardProps {
  stylistId: string | null;
  salonId: string | null;
}

export default function MyShiftCard({ stylistId, salonId }: MyShiftCardProps) {
  const {
    session,
    breaks,
    activeBreak,
    settings,
    displayStatus,
    scheduledStart,
    scheduledEnd,
    isSalonOpenToday,
    loading,
    actionBusy,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
  } = useMyShift(stylistId, salonId);

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [liveWorkedMinutes, setLiveWorkedMinutes] = useState(0);
  const [liveBreakMinutes, setLiveBreakMinutes] = useState(0);

  // Live Timer Interval
  useEffect(() => {
    if (loading || !session) return;

    const updateTimers = () => {
      const now = new Date();
      
      // Calculate total break minutes
      let totalBreakMins = breaks.reduce((sum, b) => sum + (b.duration_minutes || 0), 0);
      if (activeBreak) {
        const breakStart = new Date(activeBreak.break_start);
        const currentBreakDuration = Math.max(0, Math.round((now.getTime() - breakStart.getTime()) / 60000));
        totalBreakMins += currentBreakDuration;
      }
      setLiveBreakMinutes(totalBreakMins);

      // Calculate worked minutes
      if (session.clock_in_at) {
        const clockInTime = new Date(session.clock_in_at);
        const endTime = session.clock_out_at ? new Date(session.clock_out_at) : now;
        const totalSessionMins = Math.max(0, Math.round((endTime.getTime() - clockInTime.getTime()) / 60000));
        
        // Worked minutes = session time - break time
        // If they are currently on break, worked minutes shouldn't keep ticking up
        setLiveWorkedMinutes(Math.max(0, totalSessionMins - totalBreakMins));
      } else {
        setLiveWorkedMinutes(0);
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 10000); // Update every 10s (or 1s if needed, but 10s is sufficient and performant)
    return () => clearInterval(interval);
  }, [session, breaks, activeBreak, loading]);

  if (loading) {
    return (
      <div className="bg-white border border-line rounded-xl p-5 mb-6 animate-pulse">
        <div className="h-6 w-1/4 bg-bg-2 rounded mb-3" />
        <div className="h-10 w-full bg-bg-2 rounded" />
      </div>
    );
  }

  // If attendance feature is disabled entirely, do not show the widget
  if (settings && !settings.is_enabled) {
    return null;
  }

  // Display Schedule String
  const scheduleText = scheduledStart && scheduledEnd
    ? `${scheduledStart} – ${scheduledEnd}`
    : isSalonOpenToday
      ? "Flexible Shift"
      : "Closed Today";

  return (
    <div className="bg-white border border-line rounded-xl p-5.5 mb-6 animate-fade-in">
      <div className="flex justify-between items-start gap-4 mb-4 flex-wrap">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Daily Attendance</div>
          <div className="text-base font-semibold text-ink mt-0.5 flex items-center gap-2">
            <span>Today&apos;s shift: {scheduleText}</span>
            {session && session.is_late && (
              <span className="text-[10px] font-semibold uppercase bg-amber-soft text-amber-ink px-2 py-0.5 rounded">Late</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AttendanceStatusBadge status={displayStatus} />
        </div>
      </div>

      {/* Stats Summary if clocked in */}
      {session && session.clock_in_at && (
        <div className="grid grid-cols-2 gap-4 bg-bg-2 rounded-lg p-3.5 mb-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-ink-3 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full bg-teal ${displayStatus === "working" || displayStatus === "late" ? "animate-ping" : ""}`} />
              Worked Time
            </div>
            <div className="text-lg font-semibold font-mono text-ink mt-1">
              {formatDuration(liveWorkedMinutes)}
            </div>
            {session.clock_in_at && (
              <div className="text-[10px] text-ink-3 mt-0.5">
                In: {new Date(session.clock_in_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-ink-3 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full bg-amber ${displayStatus === "on_break" ? "animate-ping" : ""}`} />
              Breaks
            </div>
            <div className="text-lg font-semibold font-mono text-ink mt-1">
              {formatDuration(liveBreakMinutes)}
            </div>
            {session.clock_out_at && (
              <div className="text-[10px] text-ink-3 mt-0.5">
                Out: {new Date(session.clock_out_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2.5 flex-wrap items-center">
        {settings && !settings.allow_stylist_clock ? (
          <div className="text-xs text-ink-3 italic bg-bg-2 p-3 rounded-lg w-full text-center">
            * Attendance is recorded by your salon administrator.
          </div>
        ) : (
          <>
            {displayStatus === "not_clocked_in" && (
              <button
                className="btn btn-primary btn-sm px-5 flex items-center gap-1.5 h-9"
                onClick={clockIn}
                disabled={actionBusy}
              >
                <I.clockIn style={{ width: 15, height: 15 }} /> Clock In
              </button>
            )}

            {(displayStatus === "working" || displayStatus === "late") && (
              <>
                {settings?.enable_break_tracking && (
                  <button
                    className="btn btn-outline btn-sm px-4 flex items-center gap-1.5 h-9"
                    onClick={() => startBreak(false)}
                    disabled={actionBusy}
                  >
                    <I.pause style={{ width: 14, height: 14 }} /> Take Break
                  </button>
                )}
                <button
                  className="btn btn-outline btn-sm px-4 border-rose text-rose hover:bg-rose-soft/10 h-9"
                  onClick={clockOut}
                  disabled={actionBusy}
                >
                  <I.clockOut style={{ width: 15, height: 15 }} /> Clock Out
                </button>
              </>
            )}

            {displayStatus === "on_break" && (
              <button
                className="btn btn-primary btn-sm px-5 flex items-center gap-1.5 h-9"
                onClick={endBreak}
                disabled={actionBusy}
              >
                <I.play style={{ width: 14, height: 14 }} /> End Break
              </button>
            )}

            {displayStatus === "clocked_out" && (
              <div className="text-xs text-ink-3 bg-bg-2 py-2 px-3 rounded-lg flex items-center gap-1.5">
                <I.check style={{ color: "var(--teal)", width: 14, height: 14 }} />
                Shift completed for today!
              </div>
            )}
          </>
        )}

        {/* Correction Request Trigger */}
        {settings && settings.allow_correction_request && (
          <button
            className="btn btn-ghost btn-sm text-ink-3 hover:text-ink ml-auto max-[480px]:w-full max-[480px]:mt-2"
            onClick={() => setShowCorrectionModal(true)}
          >
            <I.edit style={{ width: 13, height: 13, marginRight: 4 }} /> Request Correction
          </button>
        )}
      </div>

      {/* Correction Modal */}
      {showCorrectionModal && (
        <CorrectionRequestForm
          session={session}
          stylistId={stylistId}
          salonId={salonId}
          onClose={() => setShowCorrectionModal(false)}
        />
      )}
    </div>
  );
}
