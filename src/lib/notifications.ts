import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { NotificationPayload } from "@/types";
import { describeNotificationError } from "./notification-errors";

export async function insertNotification(payload: NotificationPayload) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("notifications")
      .insert({
        salon_id: payload.salon_id,
        stylist_id: payload.stylist_id || null,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        meta: payload.meta || {},
      });

    if (error) {
      console.warn("Notification insert skipped:", describeNotificationError(error));
    }
  } catch (err) {
    console.warn("Notification insert skipped:", describeNotificationError(err));
  }
}
