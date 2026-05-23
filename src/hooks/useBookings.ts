import { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Appointment } from "@/types";
import { mapDbStatusToUi, formatDateKey } from "@/lib/utils";

export function useBookings(salonId: string | null, day: string) {
  const [bookings, setBookings] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (cancelledRef: { cancelled: boolean }) => {
    if (!salonId) {
      if (!cancelledRef.cancelled) {
        setBookings([]);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      if (!cancelledRef.cancelled) {
        setLoading(false);
      }
      return;
    }

    try {
      const d = new Date();
      if (day === "tomorrow") {
        d.setDate(d.getDate() + 1);
      }
      const dateStr = formatDateKey(d);

      const { data, error: fetchError } = await supabase
        .from("bookings")
        .select(`
          id,
          customer_id,
          date,
          start_time,
          duration,
          status,
          notes,
          customer:customers (id, name, phone),
          stylist:stylists (id, name, tone),
          booking_services (
            qty,
            price_at_booking,
            service:services (id, name)
          )
        `)
        .eq("salon_id", salonId)
        .eq("date", dateStr)
        .order("start_time", { ascending: true });

      if (cancelledRef.cancelled) return;
      if (fetchError) throw fetchError;

      if (data) {
        const customerIds = Array.from(new Set(data.map((b) => b.customer_id).filter(Boolean)));
        const visitsMap: Record<string, number> = {};
        
        if (customerIds.length > 0) {
          const { data: visitsData } = await supabase
            .from("bookings")
            .select("customer_id, status")
            .in("customer_id", customerIds)
            .in("status", ["Completed", "Paid"]);
            
          if (visitsData && !cancelledRef.cancelled) {
            visitsData.forEach((v) => {
              visitsMap[v.customer_id] = (visitsMap[v.customer_id] || 0) + 1;
            });
          }
        }

        if (cancelledRef.cancelled) return;

        const cleanTone = (t: string) => t.replace("tone-", "");
        const mappedAppts: Appointment[] = data.map((b: any) => {
          const custName = b.customer?.name || "Walk-in Customer";
          const initials = custName
            .split(" ")
            .map((p: string) => p[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "WC";
          
          const cleanToneVal = b.stylist?.tone ? cleanTone(b.stylist.tone) : "a";
          const serviceNames = b.booking_services
            ?.map((bs: any) => bs.service?.name)
            .filter(Boolean)
            .join(" + ") || "No service";
          
          const price = b.booking_services
            ?.reduce((total: number, bs: any) => total + (Number(bs.price_at_booking) * (bs.qty || 1)), 0) || 0;

          return {
            id: b.id,
            customerId: b.customer_id,
            time: (b.start_time || "09:00").slice(0, 5),
            duration: b.duration || 30,
            customer: custName,
            initials,
            tone: cleanToneVal,
            service: serviceNames,
            stylist: b.stylist?.id || "unassigned",
            price,
            status: mapDbStatusToUi(b.status),
            visits: visitsMap[b.customer_id] || 0,
            phone: b.customer?.phone || "",
            note: b.notes || ""
          };
        });

        setBookings(mappedAppts);
      }
    } catch (err: any) {
      console.error("Error loading bookings from Supabase:", err);
      if (!cancelledRef.cancelled) {
        setError(err);
        setBookings([]);
      }
    } finally {
      if (!cancelledRef.cancelled) {
        setLoading(false);
      }
    }
  }, [salonId, day]);

  useEffect(() => {
    const cancelledRef = { cancelled: false };
    load(cancelledRef);
    return () => {
      cancelledRef.cancelled = true;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    await load({ cancelled: false });
  }, [load]);

  return { bookings, setBookings, loading, error, refresh };
}
