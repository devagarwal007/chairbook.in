"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export interface DbStylist {
  id: string;
  name: string;
  short: string;
  tone: string;
}

export interface DbService {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
}

export interface DbCustomer {
  id: string;
  name: string;
  phone: string;
  visits: number;
  lastDays: number;
  spend: number;
  tone: string;
}

export function useSalonData(salonId: string | null) {
  const [stylists, setStylists] = useState<DbStylist[]>([]);
  const [services, setServices] = useState<DbService[]>([]);
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!salonId) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const loadAll = async () => {
      setLoading(true);
      try {
        const [stRes, svRes, custRes] = await Promise.all([
          supabase.from("stylists").select("id, name, tone").eq("salon_id", salonId).eq("active", true),
          supabase.from("services").select("id, name, category, duration_min, price").eq("salon_id", salonId).eq("active", true),
          supabase.from("customers").select("id, name, phone, created_at").eq("salon_id", salonId).order("created_at", { ascending: false }),
        ]);

        if (stRes.data) {
          setStylists(stRes.data.map((s: any) => ({
            id: s.id,
            name: s.name,
            short: s.name[0],
            tone: (s.tone || "tone-a").replace("tone-", ""),
          })));
        }

        if (svRes.data) {
          setServices(svRes.data.map((s: any) => ({
            id: s.id,
            name: s.name,
            category: s.category || "General",
            duration: s.duration_min,
            price: Number(s.price),
          })));
        }

        if (custRes.data) {
          const tones = ["a", "b", "c", "d", "e", "f"];
          setCustomers(custRes.data.map((c: any, i: number) => ({
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
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [salonId]);

  return { stylists, services, customers, loading, error };
}
