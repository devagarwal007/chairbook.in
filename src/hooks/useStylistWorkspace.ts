"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { PROGRESS_ACTION_NEXT_STATUS } from "@/lib/booking-progress";
import { formatDateKey, initialsOf, mapDbStatusToUi } from "@/lib/utils";
import { useBookingProgress } from "@/hooks/useBookingProgress";
import type { BookingProgressAction, StylistAppointment, StylistClient, StylistNotification, StylistSessionProfile } from "@/types";

interface DbStylistAccount {
  id: string;
  salon_id: string;
  name: string;
  role_label: string | null;
  email: string | null;
  specialisations: string[] | null;
  photo_url: string | null;
  booking_slug: string | null;
  tone: string | null;
}

interface DbSalonLite {
  id: string;
  name: string;
  area: string | null;
  slug: string;
}

interface DbStylistBooking {
  id: string;
  customer_id: string | null;
  date: string;
  start_time: string | null;
  duration: number | null;
  status: string;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  actual_duration_minutes: number | null;
  notes: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
  booking_services: Array<{ service: { name: string } | null } | null> | null;
}

interface DbStylistNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

const tones = ["a", "b", "c", "d", "e", "f"];

const fallbackProfile: StylistSessionProfile = {
  userId: "preview-user",
  stylistId: "preview-stylist",
  salonId: "preview-salon",
  salonSlug: "glow-salon",
  salonName: "GLOW SALON",
  salonArea: "ANDHERI",
  name: "Anjali Sharma",
  roleLabel: "Senior stylist",
  email: "anjali@glowsalon.example",
  initials: "AS",
  specialisations: ["Haircuts", "Color", "Bridal styling"],
  photoUrl: null,
  bookingSlug: "anjali-sharma",
  tone: "b",
};

const today = new Date();

function getWeekBounds(base = today) {
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function mapBooking(row: DbStylistBooking, index: number): StylistAppointment {
  const customerName = row.customer?.name || "Walk-in";
  const service = (row.booking_services || [])
    .map((item) => item?.service?.name)
    .filter(Boolean)
    .join(" + ") || "Service";

  return {
    id: row.id,
    customerId: row.customer?.id || row.customer_id || "",
    customerName,
    customerInitials: initialsOf(customerName),
    customerPhone: row.customer?.phone || "",
    date: row.date,
    time: (row.start_time || "09:00").slice(0, 5),
    duration: row.duration || 30,
    service,
    status: mapDbStatusToUi(row.status),
    arrivedAt: row.arrived_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    actualDurationMinutes: row.actual_duration_minutes,
    notes: row.notes || "",
    tone: tones[index % tones.length],
  };
}

function demoAppointments(): StylistAppointment[] {
  const todayKey = formatDateKey(new Date());
  return [
    {
      id: "preview-1",
      customerId: "preview-c1",
      customerName: "Priya Sharma",
      customerInitials: "PS",
      customerPhone: "+91 98765 43210",
      date: todayKey,
      time: "10:30",
      duration: 45,
      service: "Haircut + Blow dry",
      status: "confirmed",
      notes: "Prefers soft layers.",
      tone: "b",
    },
    {
      id: "preview-2",
      customerId: "preview-c2",
      customerName: "Meera Iyer",
      customerInitials: "MI",
      customerPhone: "+91 91234 56789",
      date: todayKey,
      time: "13:00",
      duration: 90,
      service: "Global color",
      status: "arrived",
      notes: "Patch test done last visit.",
      tone: "c",
    },
  ];
}

export function useStylistWorkspace() {
  const { advanceBooking } = useBookingProgress();
  const [profile, setProfile] = useState<StylistSessionProfile | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<StylistAppointment[]>([]);
  const [weekAppointments, setWeekAppointments] = useState<StylistAppointment[]>([]);
  const [clients, setClients] = useState<StylistClient[]>([]);
  const [notifications, setNotifications] = useState<StylistNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      const demo = demoAppointments();
      setProfile(fallbackProfile);
      setTodayAppointments(demo);
      setWeekAppointments(demo);
      setClients([
        { id: "preview-c1", name: "Priya Sharma", phone: "+91 98765 43210", initials: "PS", visits: 4, lastDate: formatDateKey(new Date()), lastService: "Haircut + Blow dry", tone: "b" },
        { id: "preview-c2", name: "Meera Iyer", phone: "+91 91234 56789", initials: "MI", visits: 2, lastDate: formatDateKey(new Date()), lastService: "Global color", tone: "c" },
      ]);
      setNotifications([
        { id: "preview-n1", type: "new_booking", title: "New booking assigned", body: "Priya booked Haircut + Blow dry today.", read: false, createdAt: new Date().toISOString() },
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Please sign in with your stylist account.");
        setLoading(false);
        return;
      }

      const { data: stylist, error: stylistError } = await supabase
        .from("stylists")
        .select("id, salon_id, name, role_label, email, specialisations, photo_url, booking_slug, tone")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (stylistError || !stylist) {
        setError("This login is not linked to an active stylist profile.");
        setLoading(false);
        return;
      }

      const stylistRow = stylist as unknown as DbStylistAccount;

      const { data: salon } = await supabase
        .from("salons")
        .select("id, name, area, slug")
        .eq("id", stylistRow.salon_id)
        .maybeSingle();

      const salonRow = salon as unknown as DbSalonLite | null;
      const cleanTone = (stylistRow.tone || "tone-b").replace("tone-", "");

      const nextProfile: StylistSessionProfile = {
        userId: user.id,
        stylistId: stylistRow.id,
        salonId: stylistRow.salon_id,
        salonSlug: salonRow?.slug || "",
        salonName: (salonRow?.name || "Salon").toUpperCase(),
        salonArea: (salonRow?.area || "").toUpperCase(),
        name: stylistRow.name || user.user_metadata?.name || user.email?.split("@")[0] || "Stylist",
        roleLabel: stylistRow.role_label || "Stylist",
        email: stylistRow.email || user.email || "",
        initials: initialsOf(stylistRow.name || user.email || "S"),
        specialisations: stylistRow.specialisations || [],
        photoUrl: stylistRow.photo_url,
        bookingSlug: stylistRow.booking_slug,
        tone: cleanTone,
      };

      setProfile(nextProfile);

      const todayKey = formatDateKey(new Date());
      const { start, end } = getWeekBounds();

      const { data: bookingRows, error: bookingError } = await supabase
        .from("bookings")
        .select(`
          id,
          customer_id,
          date,
          start_time,
          duration,
          status,
          arrived_at,
          started_at,
          completed_at,
          actual_duration_minutes,
          notes,
          customer:customers (id, name, phone),
          booking_services (
            service:services (name)
          )
        `)
        .eq("stylist_id", stylistRow.id)
        .gte("date", formatDateKey(start))
        .lte("date", formatDateKey(end))
        .neq("status", "Cancelled")
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (bookingError) {
        throw bookingError;
      }

      const mapped = ((bookingRows || []) as unknown as DbStylistBooking[]).map(mapBooking);
      setWeekAppointments(mapped);
      setTodayAppointments(mapped.filter((booking) => booking.date === todayKey));

      const { data: clientBookingRows } = await supabase
        .from("bookings")
        .select(`
          id,
          customer_id,
          date,
          start_time,
          duration,
          status,
          arrived_at,
          started_at,
          completed_at,
          actual_duration_minutes,
          notes,
          customer:customers (id, name, phone),
          booking_services (
            service:services (name)
          )
        `)
        .eq("stylist_id", stylistRow.id)
        .neq("status", "Cancelled")
        .order("date", { ascending: false })
        .limit(200);

      const grouped = new Map<string, StylistClient>();
      ((clientBookingRows || []) as unknown as DbStylistBooking[]).forEach((booking, index) => {
        if (!booking.customer?.id) return;
        const service = (booking.booking_services || []).map((item) => item?.service?.name).filter(Boolean).join(" + ") || "Service";
        const current = grouped.get(booking.customer.id);
        if (current) {
          current.visits += 1;
          return;
        }

        grouped.set(booking.customer.id, {
          id: booking.customer.id,
          name: booking.customer.name,
          phone: booking.customer.phone || "",
          initials: initialsOf(booking.customer.name),
          visits: 1,
          lastDate: booking.date,
          lastService: service,
          tone: tones[index % tones.length],
        });
      });
      setClients(Array.from(grouped.values()));

      const { data: notifRows } = await supabase
        .from("notifications")
        .select("id, type, title, body, read, created_at")
        .eq("stylist_id", stylistRow.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications(((notifRows || []) as unknown as DbStylistNotification[]).map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        body: item.body || "",
        read: item.read,
        createdAt: item.created_at,
      })));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load stylist dashboard.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  const advanceAppointmentStatus = useCallback(async (bookingId: string, action: BookingProgressAction) => {
    const optimisticStatus = PROGRESS_ACTION_NEXT_STATUS[action];
    setTodayAppointments((prev) => prev.map((item) => item.id === bookingId ? { ...item, status: optimisticStatus } : item));
    setWeekAppointments((prev) => prev.map((item) => item.id === bookingId ? { ...item, status: optimisticStatus } : item));

    try {
      const result = await advanceBooking(bookingId, action);
      const timing = {
        status: result.status,
      };
      setTodayAppointments((prev) => prev.map((item) => item.id === bookingId ? {
        ...item,
        ...timing,
        arrivedAt: result.arrivedAt ?? item.arrivedAt,
        startedAt: result.startedAt ?? item.startedAt,
        completedAt: result.completedAt ?? item.completedAt,
        actualDurationMinutes: result.actualDurationMinutes ?? item.actualDurationMinutes,
      } : item));
      setWeekAppointments((prev) => prev.map((item) => item.id === bookingId ? {
        ...item,
        ...timing,
        arrivedAt: result.arrivedAt ?? item.arrivedAt,
        startedAt: result.startedAt ?? item.startedAt,
        completedAt: result.completedAt ?? item.completedAt,
        actualDurationMinutes: result.actualDurationMinutes ?? item.actualDurationMinutes,
      } : item));
    } catch (err) {
      await load();
      throw err;
    }
  }, [advanceBooking, load]);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    const supabase = getSupabaseBrowserClient();
    setNotifications((prev) => prev.map((item) => item.id === notificationId ? { ...item, read: true } : item));

    if (!supabase || notificationId.startsWith("preview-")) {
      return;
    }

    await supabase.from("notifications").update({ read: true }).eq("id", notificationId);
  }, []);

  const updateProfile = useCallback(async (updates: { name: string; roleLabel: string; specialisations: string[]; bookingSlug: string | null; photoUrl?: string | null }) => {
    const supabase = getSupabaseBrowserClient();
    if (!profile) return;

    const nextProfile = {
      ...profile,
      name: updates.name,
      roleLabel: updates.roleLabel,
      specialisations: updates.specialisations,
      bookingSlug: updates.bookingSlug,
      photoUrl: updates.photoUrl !== undefined ? updates.photoUrl : profile.photoUrl,
      initials: initialsOf(updates.name),
    };
    setProfile(nextProfile);

    if (!supabase || profile.userId === "preview-user") {
      return;
    }

    const { error: stylistError } = await supabase
      .from("stylists")
      .update({
        name: updates.name,
        role_label: updates.roleLabel,
        specialisations: updates.specialisations,
        booking_slug: updates.bookingSlug,
        photo_url: updates.photoUrl !== undefined ? updates.photoUrl : profile.photoUrl,
      })
      .eq("id", profile.stylistId);

    if (stylistError) {
      await load();
      throw stylistError;
    }

    await supabase.from("users").update({ name: updates.name }).eq("id", profile.userId);
  }, [load, profile]);

  const uploadProfilePhoto = useCallback(async (file: File) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !profile) {
      return null;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("stylist-photos")
      .upload(path, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("stylist-photos").getPublicUrl(path);
    await updateProfile({
      name: profile.name,
      roleLabel: profile.roleLabel,
      specialisations: profile.specialisations,
      bookingSlug: profile.bookingSlug,
      photoUrl: data.publicUrl,
    });

    return data.publicUrl;
  }, [profile, updateProfile]);

  return {
    profile,
    todayAppointments,
    weekAppointments,
    clients,
    notifications,
    unreadCount,
    loading,
    error,
    refresh: load,
    advanceAppointmentStatus,
    markNotificationRead,
    updateProfile,
    uploadProfilePhoto,
  };
}
