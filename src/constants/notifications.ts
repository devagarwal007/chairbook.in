import { NotificationItem } from "@/types";

export const KINDS = {
  new_booking:    { icon: 'calendar' as const, tone: 'teal',  label: 'New booking' },
  walk_in:        { icon: 'calendar' as const, tone: 'teal',  label: 'Walk-in' },
  status_update:  { icon: 'check' as const,    tone: 'green', label: 'Booking updated' },
  confirmed:      { icon: 'check' as const,    tone: 'green', label: 'Customer confirmed' },
  rescheduled:    { icon: 'edit' as const,     tone: 'amber', label: 'Reschedule request' },
  cancelled:      { icon: 'cancel' as const,   tone: 'rose',  label: 'Booking cancelled' },
  noshow:         { icon: 'alert' as const,    tone: 'rose',  label: 'No-show' },
  payment:        { icon: 'cash' as const,     tone: 'green', label: 'Payment received' },
  attendance_correction: { icon: 'clock' as const, tone: 'amber', label: 'Attendance correction' },
  review:         { icon: 'star' as const,     tone: 'amber', label: 'New review' },
  wa_reply:       { icon: 'wa' as const,       tone: 'wa',    label: 'WhatsApp reply' },
  daily:          { icon: 'summary' as const,  tone: 'neutral', label: 'Daily summary' },
};

export const INITIAL_NOTIFS: NotificationItem[] = [
  { id: 1,  kind: 'new_booking', ts: '01:08 PM', day: 'Today',     unread: true,  title: 'Aisha Khan booked Keratin',      meta: 'Saturday 24 May · 11:00 AM · with Anjali · ₹4,500',                actor: { name: 'Aisha Khan', initials: 'AK', tone: 'd' }, link: '/dashboard/bookings' },
  { id: 2,  kind: 'wa_reply',    ts: '12:42 PM', day: 'Today',     unread: true,  title: 'Priya Sharma replied YES',       meta: 'To your reminder for Saturday\'s appointment',                       actor: { name: 'Priya Sharma', initials: 'PS', tone: 'b' }, link: '/dashboard/bookings' },
  { id: 3,  kind: 'rescheduled', ts: '11:58 AM', day: 'Today',     unread: true,  title: 'Meera Iyer requested reschedule',meta: 'From Saturday 10:00 AM → wants Sunday 11:00 AM',                    actor: { name: 'Meera Iyer', initials: 'MI', tone: 'c' }, link: '/dashboard/bookings' },
  { id: 4,  kind: 'payment',     ts: '11:34 AM', day: 'Today',     unread: false, title: 'Payment received from Kavya Reddy', meta: '₹2,700 · UPI · GPay',                                             actor: { name: 'Kavya Reddy', initials: 'KR', tone: 'e' }, link: '/dashboard/revenue' },
  { id: 5,  kind: 'daily',       ts: '08:00 AM', day: 'Today',     unread: false, title: 'Your day at a glance',           meta: '8 bookings · 4 confirmed · 3 to confirm · Pooja off after 6 PM',     actor: null, link: '/dashboard' },
  { id: 6,  kind: 'cancelled',   ts: '07:42 PM', day: 'Yesterday', unread: false, title: 'Divya Menon cancelled',          meta: 'Pedicure with Kiran · Reason: "Not feeling well"',                  actor: { name: 'Divya Menon', initials: 'DM', tone: 'e' }, link: '/dashboard/bookings' },
  { id: 7,  kind: 'review',      ts: '03:15 PM', day: 'Yesterday', unread: false, title: 'Priya left a 5-star review',     meta: '"Anjali got the color exactly right — already booked next month."', actor: { name: 'Priya Sharma', initials: 'PS', tone: 'b' }, link: '/dashboard/revenue' },
  { id: 8,  kind: 'noshow',      ts: '04:30 PM', day: 'Yesterday', unread: false, title: 'Divya Menon was a no-show',      meta: 'Pedicure with Kiran · 3rd no-show this year',                       actor: { name: 'Divya Menon', initials: 'DM', tone: 'e' }, link: '/dashboard/customers' },
  { id: 9,  kind: 'new_booking', ts: '11:02 AM', day: 'Earlier',   unread: false, title: 'Ravi K booked Beard Trim',       meta: 'Today 4:30 PM · with Kiran · ₹200',                                 actor: { name: 'Ravi K', initials: 'RK', tone: 'c' }, link: '/dashboard/bookings' },
  { id: 10, kind: 'confirmed',   ts: '10:12 AM', day: 'Earlier',   unread: false, title: 'Sneha P confirmed',              meta: 'Threading with Rekha · Today 12:00 PM',                             actor: { name: 'Sneha P', initials: 'SP', tone: 'd' }, link: '/dashboard/bookings' },
  { id: 11, kind: 'review',      ts: '09:30 AM', day: 'Earlier',   unread: false, title: 'Anita V left a 5-star review',   meta: '"Pooja\'s facials are the best in Andheri."',                       actor: { name: 'Anita Verma', initials: 'AV', tone: 'a' }, link: '/dashboard/revenue' },
];

export const FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'unread',   label: 'Unread' },
  { id: 'bookings', label: 'Bookings',   kinds: ['new_booking', 'walk_in', 'status_update', 'confirmed', 'rescheduled', 'cancelled'] },
  { id: 'alerts',   label: 'Alerts',     kinds: ['noshow', 'attendance_correction'] },
  { id: 'payments', label: 'Payments',   kinds: ['payment'] },
  { id: 'wa',       label: 'WhatsApp',   kinds: ['wa_reply', 'review'] },
];
