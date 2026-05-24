export interface NotificationPayload {
  salon_id: string;
  type: 'new_booking' | 'walk_in' | 'status_update' | 'cancellation' | 'reschedule' | 'payment' | 'daily_summary';
  title: string;
  body: string;
  meta?: Record<string, unknown>;
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

export interface DbNotification {
  id: string;
  created_at: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  meta?: {
    actor?: {
      name: string;
      initials?: string;
      tone?: string;
    } | null;
  } | null;
}

