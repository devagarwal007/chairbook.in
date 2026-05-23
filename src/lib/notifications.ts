import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { NotificationPayload } from "@/types";

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
