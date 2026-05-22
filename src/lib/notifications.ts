import { getSupabaseBrowserClient } from "@/lib/supabase";

export interface NotificationPayload {
  salon_id: string;
  type: 'new_booking' | 'walk_in' | 'status_update' | 'cancellation' | 'reschedule' | 'payment' | 'daily_summary';
  title: string;
  body: string;
  meta?: Record<string, unknown>;
}

export async function insertNotification(payload: NotificationPayload) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("notifications")
      .insert({
        salon_id: payload.salon_id,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        meta: payload.meta || {},
      });

    if (error) {
      console.error("Error inserting notification:", error);
    }
  } catch (err) {
    console.error("Failed to insert notification:", err);
  }
}
