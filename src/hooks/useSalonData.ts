"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { SERVICE_SELECT_WITH_BUNDLES, mapServiceWithBundleDetails } from "@/lib/service-bundles";

import { Stylist, Service, Customer, DbStylistRaw, DbServiceRaw, DbCustomerRaw } from "@/types";

export type DbStylist = Stylist;
export type DbService = Service;
export type DbCustomer = Customer;


export function useSalonData(salonId: string | null) {
  const [stylists, setStylists] = useState<DbStylist[]>([]);
  const [services, setServices] = useState<DbService[]>([]);
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!salonId) {
      queueMicrotask(() => {
        setLoading(false);
      });
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      queueMicrotask(() => {
        setLoading(false);
      });
      return;
    }

    const controller = new AbortController();

    const loadAll = async () => {
      queueMicrotask(() => setLoading(true));
      try {
        const [stRes, svRes, custRes] = await Promise.all([
          supabase.from("stylists").select("id, name, tone").eq("salon_id", salonId).eq("active", true).order("name").abortSignal(controller.signal),
          supabase.from("services").select(SERVICE_SELECT_WITH_BUNDLES).eq("salon_id", salonId).eq("active", true).is("deleted_at", null).order("name").abortSignal(controller.signal),
          supabase.from("customers").select("id, name, phone, created_at").eq("salon_id", salonId).order("created_at", { ascending: false }).limit(500).abortSignal(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        if (stRes.data) {
          const rawStylists = stRes.data as unknown as DbStylistRaw[];
          setStylists(rawStylists.map((s) => ({
            id: s.id,
            name: s.name,
            short: s.name[0],
            tone: (s.tone || "tone-a").replace("tone-", ""),
            skills: [],
          })));
        }

        if (svRes.data) {
          const rawServices = svRes.data as unknown as DbServiceRaw[];
          setServices(rawServices.map(mapServiceWithBundleDetails));
        }

        if (custRes.data) {
          const rawCustomers = custRes.data as unknown as DbCustomerRaw[];
          const tones = ["a", "b", "c", "d", "e", "f"];
          setCustomers(rawCustomers.map((c, i: number) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || "",
            visits: 0,
            lastDays: 999,
            spend: 0,
            tone: tones[i % tones.length],
          })));
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error loading salon data:", err);
        queueMicrotask(() => setError(true));
      } finally {
        if (!controller.signal.aborted) {
          queueMicrotask(() => setLoading(false));
        }
      }
    };

    queueMicrotask(() => {
      loadAll();
    });
    return () => controller.abort();
  }, [salonId]);

  return { stylists, services, customers, loading, error };
}
