"use client";

import { useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { PROGRESS_ACTION_NEXT_STATUS } from "@/lib/booking-progress";
import type { BookingProgressAction, BookingStatus, BookingTimingFields } from "@/types";

type BookingProgressRpcRow = {
  status?: string | null;
  arrived_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  actual_duration_minutes?: number | null;
};

export interface BookingProgressResult extends BookingTimingFields {
  status: BookingStatus;
}

function mapRpcStatus(status: string): BookingStatus {
  const lower = (status || "").toLowerCase();
  if (lower === "arrived") return "arrived";
  if (lower === "in service") return "in_service";
  if (lower === "completed" || lower === "paid") return "completed";
  if (lower === "no-show") return "noshow";
  if (lower === "cancelled") return "cancelled";
  return "confirmed";
}

export function useBookingProgress() {
  const advanceBooking = useCallback(async (bookingId: string, action: BookingProgressAction): Promise<BookingProgressResult> => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || bookingId.startsWith("preview-")) {
      const now = new Date().toISOString();
      return {
        status: PROGRESS_ACTION_NEXT_STATUS[action],
        arrivedAt: action === "mark_arrived" ? now : undefined,
        startedAt: action === "start_service" ? now : undefined,
        completedAt: action === "complete_service" ? now : undefined,
      };
    }

    const { data, error } = await supabase.rpc("advance_booking_status", {
      p_booking_id: bookingId,
      p_action: action,
    });

    if (error) {
      throw error;
    }

    const row = (Array.isArray(data) ? data[0] : data) as BookingProgressRpcRow | null;
    if (!row) {
      return { status: PROGRESS_ACTION_NEXT_STATUS[action] };
    }

    return {
      status: mapRpcStatus(row.status || ""),
      arrivedAt: row.arrived_at ?? null,
      startedAt: row.started_at ?? null,
      completedAt: row.completed_at ?? null,
      actualDurationMinutes: row.actual_duration_minutes ?? null,
    };
  }, []);

  return { advanceBooking };
}
