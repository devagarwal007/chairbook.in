"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { MOCK_ATTENDANCE_SETTINGS, DEFAULT_ATTENDANCE_SETTINGS } from "@/constants/attendanceConfig";
import type { AttendanceSettings } from "@/types";
import { useToast } from "@/context/ToastContext";
import { ATTENDANCE_SETTINGS_SELECT } from "@/lib/supabase-selects";

export function useAttendanceSettings(salonId: string | null) {
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { show: showToast } = useToast();

  const loadSettings = useCallback(async (signal?: AbortSignal) => {
    const requestSignal = signal ?? new AbortController().signal;

    if (!salonId) {
      if (!requestSignal.aborted) {
        setSettings(MOCK_ATTENDANCE_SETTINGS);
        setLoading(false);
      }
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      if (!requestSignal.aborted) {
        setSettings(MOCK_ATTENDANCE_SETTINGS);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance_settings")
        .select(ATTENDANCE_SETTINGS_SELECT)
        .eq("salon_id", salonId)
        .abortSignal(requestSignal)
        .maybeSingle();

      if (requestSignal.aborted) return;
      if (error) throw error;

      if (data) {
        setSettings(data as AttendanceSettings);
      } else {
        // First visit: Auto-create settings row with defaults
        const newSettings = {
          salon_id: salonId,
          ...DEFAULT_ATTENDANCE_SETTINGS,
        };

        const { data: inserted, error: insertError } = await supabase
          .from("attendance_settings")
          .insert(newSettings)
          .select(ATTENDANCE_SETTINGS_SELECT)
          .single();

        if (requestSignal.aborted) return;
        if (insertError) throw insertError;
        setSettings(inserted as AttendanceSettings);
      }
    } catch (err) {
      if (requestSignal.aborted) return;
      console.error("Error loading attendance settings:", err);
      // Fallback
      setSettings(MOCK_ATTENDANCE_SETTINGS);
    } finally {
      if (!requestSignal.aborted) setLoading(false);
    }
  }, [salonId]);

  const updateSettings = async (patch: Partial<AttendanceSettings>) => {
    if (!settings) return false;

    const updated = { ...settings, ...patch };

    // Optimistic update
    setSettings(updated);

    const supabase = getSupabaseBrowserClient();
    if (!supabase || settings.id === "preview-settings") {
      showToast("Settings updated (Mock Mode)");
      return true;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("attendance_settings")
        .update(patch)
        .eq("id", settings.id);

      if (error) throw error;
      showToast("✓ Settings updated successfully");
      return true;
    } catch (err) {
      console.error("Error updating attendance settings:", err);
      showToast("Failed to save settings. Please try again.", 2000);
      // Revert change
      setSettings(settings);
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      void loadSettings(controller.signal);
    });
    return () => controller.abort();
  }, [loadSettings]);

  return { settings, loading, saving, updateSettings, reload: loadSettings };
}
