export interface NotificationPayload {
  salon_id: string;
  stylist_id?: string | null;
  type: 'new_booking' | 'walk_in' | 'status_update' | 'cancellation' | 'reschedule' | 'payment' | 'daily_summary' | 'attendance_correction';
  title: string;
  body: string;
  meta?: NotificationMeta;
}

export interface Actor {
  name: string;
  initials: string;
  tone: string;
}

export interface NotificationItem {
  id: number;
  dbId?: string;
  kind: string;
  ts: string;
  day: string;
  unread: boolean;
  title: string;
  meta: string;
  actor: Actor | null;
  link: string;
}

export interface NotificationMeta {
  booking_id?: string | number | null;
  customer_id?: string | number | null;
  session_id?: string | number | null;
  stylist_id?: string | number | null;
  amount?: number | string | null;
  due?: number | string | null;
  method?: string | null;
  status?: string | null;
  reason?: string | null;
  new_date?: string | null;
  new_time?: string | null;
  customer_name?: string | null;
  service?: string | null;
  actor?: {
    name: string;
    initials?: string;
    tone?: string;
  } | null;
  link?: string | null;
  [key: string]: unknown;
}

export interface DbNotification {
  id: string;
  created_at: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  meta?: NotificationMeta | null;
}
