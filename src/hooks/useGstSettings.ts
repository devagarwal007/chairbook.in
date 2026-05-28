"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { getSupabaseErrorMessage, isMissingGstSchemaError } from "@/lib/supabase-errors";
import type { SalonGstSettings, GstInvoice } from "@/types/gst";
import { DEFAULT_GST_SETTINGS } from "@/types/gst";

interface UseGstSettingsReturn {
  settings: SalonGstSettings;
  invoices: GstInvoice[];
  loading: boolean;
  saving: boolean;
  isGstEnabled: boolean;
  save: (settings: SalonGstSettings) => Promise<void>;
  refreshInvoices: () => Promise<void>;
}

export function useGstSettings(salonId: string | null): UseGstSettingsReturn {
  const [settings, setSettings] = useState<SalonGstSettings>(DEFAULT_GST_SETTINGS);
  const [invoices, setInvoices] = useState<GstInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!salonId) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    const load = async () => {
      queueMicrotask(() => setLoading(true));
      try {
        const { data, error } = await supabase
          .from("salon_gst_settings")
          .select("*")
          .eq("salon_id", salonId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSettings({
            id: data.id,
            salon_id: data.salon_id,
            gst_enabled: data.gst_enabled,
            gstin: data.gstin || "",
            legal_name: data.legal_name || "",
            registered_address: data.registered_address || "",
            state: data.state || "",
            state_code: data.state_code || "",
            gst_rate: Number(data.gst_rate),
            sac_code: data.sac_code || "999721",
            pricing_mode: data.pricing_mode || "tax_exclusive",
            invoice_prefix: data.invoice_prefix || "SAL",
          });
        }

        // Load recent invoices
        const { data: invData, error: invError } = await supabase
          .from("gst_invoices")
          .select("*")
          .eq("salon_id", salonId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (invError) throw invError;

        if (invData) {
          setInvoices(invData as unknown as GstInvoice[]);
        }
      } catch (err) {
        if (!isMissingGstSchemaError(err)) {
          console.error("Error loading GST settings:", getSupabaseErrorMessage(err));
        }
      } finally {
        queueMicrotask(() => setLoading(false));
      }
    };

    queueMicrotask(() => { load(); });
  }, [salonId]);

  const save = useCallback(async (newSettings: SalonGstSettings) => {
    if (!salonId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setSaving(true);
    try {
      const payload = {
        salon_id: salonId,
        gst_enabled: newSettings.gst_enabled,
        gstin: newSettings.gstin.trim().toUpperCase() || null,
        legal_name: newSettings.legal_name.trim() || null,
        registered_address: newSettings.registered_address.trim() || null,
        state: newSettings.state || null,
        state_code: newSettings.state_code || null,
        gst_rate: newSettings.gst_rate,
        sac_code: newSettings.sac_code.trim() || "999721",
        pricing_mode: newSettings.pricing_mode,
        invoice_prefix: newSettings.invoice_prefix.trim().toUpperCase() || "SAL",
        updated_at: new Date().toISOString(),
      };

      if (newSettings.id) {
        const { error } = await supabase
          .from("salon_gst_settings")
          .update(payload)
          .eq("id", newSettings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("salon_gst_settings")
          .upsert(payload, { onConflict: "salon_id" })
          .select("id")
          .single();
        if (error) throw error;
        if (data) {
          newSettings.id = data.id;
        }
      }

      setSettings({ ...newSettings });
    } catch (err) {
      if (!isMissingGstSchemaError(err)) {
        console.error("Error saving GST settings:", getSupabaseErrorMessage(err));
      }
      throw err;
    } finally {
      setSaving(false);
    }
  }, [salonId]);

  const refreshInvoices = useCallback(async () => {
    if (!salonId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("gst_invoices")
        .select("*")
        .eq("salon_id", salonId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        setInvoices(data as unknown as GstInvoice[]);
      }
    } catch (err) {
      if (!isMissingGstSchemaError(err)) {
        console.error("Error refreshing invoices:", getSupabaseErrorMessage(err));
      }
    }
  }, [salonId]);

  return {
    settings,
    invoices,
    loading,
    saving,
    isGstEnabled: settings.gst_enabled,
    save,
    refreshInvoices,
  };
}
