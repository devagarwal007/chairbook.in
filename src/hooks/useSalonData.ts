"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

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

    const loadAll = async () => {
      queueMicrotask(() => setLoading(true));
      try {
        const [stRes, svRes, custRes] = await Promise.all([
          supabase.from("stylists").select("id, name, tone").eq("salon_id", salonId).eq("active", true),
          supabase.from("services").select("id, name, category, duration_min, price").eq("salon_id", salonId).eq("active", true),
          supabase.from("customers").select("id, name, phone, created_at").eq("salon_id", salonId).order("created_at", { ascending: false }),
        ]);

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
          setServices(rawServices.map((s) => ({
            id: s.id,
            name: s.name,
            cat: s.category || "General",
            duration: s.duration_min,
            price: Number(s.price),
          })));
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
        console.error("Error loading salon data:", err);
        queueMicrotask(() => setError(true));
      } finally {
        queueMicrotask(() => setLoading(false));
      }
    };

    queueMicrotask(() => {
      loadAll();
    });
  }, [salonId]);

  return { stylists, services, customers, loading, error };
}
