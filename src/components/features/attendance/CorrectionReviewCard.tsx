"use client";

import React, { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { ATTENDANCE_SESSION_SELECT } from "@/lib/supabase-selects";
import { Avatar } from "@/components/ui";
import type { CorrectionRequest, Stylist, AttendanceSession } from "@/types";

interface CorrectionReviewCardProps {
  request: CorrectionRequest;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  actionBusy: boolean;
}

export default function CorrectionReviewCard({
  request,
  onApprove,
  onReject,
  actionBusy,
}: CorrectionReviewCardProps) {
  const [stylist, setStylist] = useState<Stylist | null>(null);
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchMeta = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setStylist({ id: request.stylist_id, name: "Stylist (Mock)", tone: "b" });
        return;
      }

      try {
        // Fetch Stylist Name
        const { data: stData } = await supabase
          .from("stylists")
          .select("name, tone")
          .eq("id", request.stylist_id)
          .abortSignal(controller.signal)
          .single();

        if (controller.signal.aborted) return;
        if (stData) {
          setStylist({
            id: request.stylist_id,
            name: stData.name,
            tone: (stData.tone || "tone-a").replace("tone-", ""),
          });
        }

        // Fetch original Session
        const { data: sessData } = await supabase
          .from("attendance_sessions")
          .select(ATTENDANCE_SESSION_SELECT)
          .eq("id", request.session_id)
          .abortSignal(controller.signal)
          .single();

        if (controller.signal.aborted) return;
        if (sessData) {
          setSession(sessData as AttendanceSession);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error fetching request metadata:", err);
      }
    };

    void fetchMeta();
    return () => controller.abort();
  }, [request]);

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    await onReject(rejectReason.trim());
    setShowRejectionInput(false);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "None";
    try {
      return new Date(isoString).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white border border-line rounded-xl p-5 flex flex-col gap-4.5 hover:border-line-2 transition duration-150 animate-pop">
      {/* Header Info */}
      <div className="flex items-center gap-3">
        <Avatar
          initials={stylist?.name ? stylist.name[0] : "S"}
          tone={stylist?.tone || "a"}
          className="w-10 h-10 border-0"
        />
        <div>
          <div className="text-sm font-semibold text-ink">
            {stylist?.name || "Loading name..."}
          </div>
          <div className="text-[11px] text-ink-3 mt-0.5">
            Submitted on {formatDate(request.created_at)}
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-2 gap-4 border border-line rounded-lg p-3 bg-bg">
        {/* Clock In comparison */}
        {request.requested_clock_in && (
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-ink-2">Clock In Time:</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-ink-4 line-through font-mono">{formatTime(session?.clock_in_at || null)}</span>
              <span className="text-ink-4">→</span>
              <span className="text-teal font-semibold font-mono">{formatTime(request.requested_clock_in)}</span>
            </div>
          </div>
        )}

        {/* Clock Out comparison */}
        {request.requested_clock_out && (
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-ink-2">Clock Out Time:</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-ink-4 line-through font-mono">{formatTime(session?.clock_out_at || null)}</span>
              <span className="text-ink-4">→</span>
              <span className="text-teal font-semibold font-mono">{formatTime(request.requested_clock_out)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stylist Reason */}
      <div className="text-xs">
        <span className="font-semibold text-ink-2">Justification:</span>
        <div className="text-ink-3 italic mt-1 bg-bg-2 p-2.5 rounded-lg border border-line-2">
          &ldquo;{request.reason}&rdquo;
        </div>
      </div>

      {/* Action Buttons */}
      {!showRejectionInput ? (
        <div className="flex gap-2">
          <button
            className="btn btn-primary btn-sm px-4 h-9"
            onClick={onApprove}
            disabled={actionBusy}
          >
            Approve Adjustment
          </button>
          <button
            className="btn btn-outline btn-sm px-4 border-rose text-rose hover:bg-rose-soft/10 h-9"
            onClick={() => setShowRejectionInput(true)}
            disabled={actionBusy}
          >
            Reject
          </button>
        </div>
      ) : (
        <form onSubmit={handleRejectSubmit} className="flex flex-col gap-2.5 animate-pop">
          <input
            placeholder="Provide a reason for rejection (required)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full h-9 px-3 border border-line-2 rounded-lg outline-none text-xs bg-bg"
            required
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="btn btn-primary btn-sm px-4 h-8 text-xs bg-rose hover:bg-rose-ink"
              disabled={actionBusy || !rejectReason.trim()}
            >
              Confirm Rejection
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm px-3 h-8 text-xs text-ink-3"
              onClick={() => setShowRejectionInput(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
