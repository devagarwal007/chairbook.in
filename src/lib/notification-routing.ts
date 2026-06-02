import type { Actor, DbNotification, NotificationItem, NotificationMeta } from "@/types";

const KIND_ALIASES: Record<string, string> = {
  cancellation: "cancelled",
  reschedule: "rescheduled",
  daily_summary: "daily",
};

const BOOKING_DETAIL_KINDS = new Set([
  "new_booking",
  "walk_in",
  "status_update",
  "confirmed",
  "rescheduled",
  "cancelled",
  "noshow",
]);

const SAFE_EXPLICIT_LINKS = new Set([
  "/dashboard",
  "/dashboard/bookings",
  "/dashboard/customers",
  "/dashboard/revenue",
  "/dashboard/attendance",
  "/dashboard/settings",
  "/dashboard/notifications",
  "/dashboard/new-booking",
  "/dashboard/block-time",
  "/dashboard/broadcast",
]);

const SAFE_EXPLICIT_LINK_PREFIXES = [
  "/dashboard/",
  "/dashboard/bookings/",
  "/dashboard/checkout/",
  "/dashboard/customers/",
  "/dashboard/attendance/",
];

export function normalizeNotificationKind(type: string | null | undefined) {
  const kind = String(type || "new_booking");
  return KIND_ALIASES[kind] || kind;
}

function routeSegment(value: unknown) {
  const raw = typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
  return raw ? encodeURIComponent(raw) : null;
}

function hasUnsafePathSegment(link: string) {
  if (/%2f|%5c/i.test(link)) return true;
  const path = link.split(/[?#]/, 1)[0];

  return path.split("/").some((segment) => {
    try {
      const decoded = decodeURIComponent(segment).toLowerCase();
      return decoded === "." || decoded === "..";
    } catch {
      return true;
    }
  });
}

function isSafeExplicitLink(link: unknown): link is string {
  if (typeof link !== "string") return false;
  if (!link.startsWith("/") || link.startsWith("//")) return false;
  if (link.includes("\\") || /[\u0000-\u001F\u007F]/.test(link)) return false;
  if (hasUnsafePathSegment(link)) return false;
  return SAFE_EXPLICIT_LINKS.has(link) || SAFE_EXPLICIT_LINK_PREFIXES.some((prefix) => link.startsWith(prefix));
}

export function resolveNotificationLink(type: string | null | undefined, meta: NotificationMeta | null | undefined = {}) {
  const safeLink = isSafeExplicitLink(meta?.link) ? meta.link : null;
  if (safeLink) return safeLink;

  const kind = normalizeNotificationKind(type);
  const bookingId = routeSegment(meta?.booking_id);
  const customerId = routeSegment(meta?.customer_id);

  if (kind === "payment") {
    return bookingId ? `/dashboard/checkout/${bookingId}` : "/dashboard/revenue";
  }

  if (BOOKING_DETAIL_KINDS.has(kind)) {
    return bookingId ? `/dashboard/bookings/${bookingId}` : "/dashboard/bookings";
  }

  if (kind === "attendance_correction") return "/dashboard/attendance";
  if (kind === "review") return "/dashboard/revenue";
  if (kind === "daily") return "/dashboard";
  if (customerId) return `/dashboard/customers/${customerId}`;

  return "/dashboard/bookings";
}

function getDay(created: Date, now: Date) {
  const startOfCreated = new Date(created);
  startOfCreated.setHours(0, 0, 0, 0);
  const startOfNow = new Date(now);
  startOfNow.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((startOfNow.getTime() - startOfCreated.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return "Earlier";
}

function getTime(created: Date) {
  const hours = created.getHours();
  const minutes = String(created.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getActor(actor: NotificationMeta["actor"]): Actor | null {
  if (!actor || typeof actor.name !== "string" || !actor.name.trim()) return null;
  return {
    name: actor.name,
    initials: typeof actor.initials === "string" && actor.initials.trim() ? actor.initials : "?",
    tone: typeof actor.tone === "string" && actor.tone.trim() ? actor.tone : "a",
  };
}

export function mapDbNotificationToItem(row: DbNotification, index: number, now = new Date()): NotificationItem {
  const created = new Date(row.created_at);
  const safeCreated = Number.isNaN(created.getTime()) ? now : created;

  return {
    id: index + 1,
    dbId: row.id,
    kind: normalizeNotificationKind(row.type),
    ts: getTime(safeCreated),
    day: getDay(safeCreated, now),
    unread: !row.read,
    title: row.title,
    meta: row.body || "",
    actor: getActor(row.meta?.actor),
    link: resolveNotificationLink(row.type, row.meta),
  };
}
