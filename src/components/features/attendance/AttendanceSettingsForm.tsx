"use client";

import React from "react";
import Link from "next/link";
import { useAttendanceSettings } from "@/hooks/useAttendanceSettings";
import { Icons as I, FormField } from "@/components/ui";

interface AttendanceSettingsFormProps {
  salonId: string | null;
}

export default function AttendanceSettingsForm({ salonId }: AttendanceSettingsFormProps) {
  const { settings, loading, saving, updateSettings } = useAttendanceSettings(salonId);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-20 bg-bg-2 rounded-xl" />
        <div className="h-40 bg-bg-2 rounded-xl" />
        <div className="h-32 bg-bg-2 rounded-xl" />
      </div>
    );
  }

  const s = settings || {
    is_enabled: false,
    allow_stylist_clock: true,
    early_clock_in_minutes: 15,
    late_threshold_minutes: 10,
    allow_admin_edit: true,
    require_edit_reason: true,
    allow_correction_request: true,
    enable_break_tracking: true,
  };

  return (
    <div className="flex flex-col gap-[18px] animate-fade-in">
      <div className="flex justify-between items-center gap-4 mb-1.5 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold tracking-[0.04em] uppercase text-ink-3 m-0">Time & Attendance</h2>
          <p className="text-xs text-ink-3 mt-1">Configure shifts, clock-in policies, and correction requests.</p>
        </div>
        <Link href="/dashboard/attendance" className="btn btn-primary btn-sm flex items-center gap-1.5" style={{ textDecoration: "none" }}>
          <I.clock style={{ width: 14, height: 14 }} /> Go to Attendance
        </Link>
      </div>

      {/* Main Switch */}
      <div className="bg-white border border-line rounded-xl p-[20px_22px]">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm font-semibold">Enable attendance tracking</div>
            <div className="text-xs text-ink-3 mt-0.5">
              {s.is_enabled
                ? "Stylist day view and owner reports will be active."
                : "Toggle to enable clock-in/out features and reports."}
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center relative shrink-0">
            <input
              type="checkbox"
              className="absolute opacity-0 pointer-events-none peer"
              checked={s.is_enabled}
              onChange={e => void updateSettings({ is_enabled: e.target.checked })}
              disabled={saving}
            />
            <div className="w-[44px] h-[24px] rounded-full bg-line peer-checked:bg-teal transition" />
            <div className="absolute left-[3px] top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition peer-checked:translate-x-[20px]" />
          </label>
        </div>
      </div>

      {s.is_enabled && (
        <>
          {/* Stylist Options */}
          <div className="bg-white border border-line rounded-xl p-[20px_22px] flex flex-col gap-4">
            <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3">Stylist portal options</div>

            <div className="flex justify-between items-center py-2.5 border-b border-line last:border-b-0 last:pb-0 first:pt-0">
              <div>
                <div className="text-sm font-medium">Stylists clock themselves in</div>
                <div className="text-xs text-ink-3 mt-0.5">Allow stylists to clock in, take breaks, and clock out on their own devices.</div>
              </div>
              <label className="inline-flex cursor-pointer items-center relative shrink-0">
                <input
                  type="checkbox"
                  className="absolute opacity-0 pointer-events-none peer"
                  checked={s.allow_stylist_clock}
                  onChange={e => void updateSettings({ allow_stylist_clock: e.target.checked })}
                  disabled={saving}
                />
                <span className="w-9 h-5.5 rounded-full bg-line-2 relative transition-colors duration-150 before:content-[''] before:absolute before:left-[2px] before:top-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform before:duration-[180ms] before:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-teal peer-checked:before:translate-x-[14px]"></span>
              </label>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-line last:border-b-0 last:pb-0">
              <div>
                <div className="text-sm font-medium">Break tracking</div>
                <div className="text-xs text-ink-3 mt-0.5">Show pause buttons in the stylist panel to track lunch breaks or personal time.</div>
              </div>
              <label className="inline-flex cursor-pointer items-center relative shrink-0">
                <input
                  type="checkbox"
                  className="absolute opacity-0 pointer-events-none peer"
                  checked={s.enable_break_tracking}
                  onChange={e => void updateSettings({ enable_break_tracking: e.target.checked })}
                  disabled={saving}
                />
                <span className="w-9 h-5.5 rounded-full bg-line-2 relative transition-colors duration-150 before:content-[''] before:absolute before:left-[2px] before:top-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform before:duration-[180ms] before:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-teal peer-checked:before:translate-x-[14px]"></span>
              </label>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-line last:border-b-0 last:pb-0">
              <div>
                <div className="text-sm font-medium">Correction requests</div>
                <div className="text-xs text-ink-3 mt-0.5">Allow stylists to submit adjustment requests if they forget to clock in or out.</div>
              </div>
              <label className="inline-flex cursor-pointer items-center relative shrink-0">
                <input
                  type="checkbox"
                  className="absolute opacity-0 pointer-events-none peer"
                  checked={s.allow_correction_request}
                  onChange={e => void updateSettings({ allow_correction_request: e.target.checked })}
                  disabled={saving}
                />
                <span className="w-9 h-5.5 rounded-full bg-line-2 relative transition-colors duration-150 before:content-[''] before:absolute before:left-[2px] before:top-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform before:duration-[180ms] before:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-teal peer-checked:before:translate-x-[14px]"></span>
              </label>
            </div>
          </div>

          {/* Time Thresholds */}
          <div className="bg-white border border-line rounded-xl p-[20px_22px] flex flex-col gap-4">
            <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3">Time buffers & thresholds</div>

            <div className="field-row">
              <FormField label="Early clock-in buffer">
                <select
                  value={s.early_clock_in_minutes}
                  onChange={e => void updateSettings({ early_clock_in_minutes: parseInt(e.target.value) })}
                  className="w-full h-10 px-3 rounded-lg border border-line-2 bg-white text-sm outline-none focus:border-teal"
                  disabled={saving}
                >
                  <option value={0}>Always allow</option>
                  <option value={5}>5 minutes before</option>
                  <option value={10}>10 minutes before</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>60 minutes before</option>
                </select>
                <div className="text-[11px] text-ink-3 mt-1">Prevents clocking in too early before scheduled shift starts.</div>
              </FormField>

              <FormField label="Late threshold">
                <select
                  value={s.late_threshold_minutes}
                  onChange={e => void updateSettings({ late_threshold_minutes: parseInt(e.target.value) })}
                  className="w-full h-10 px-3 rounded-lg border border-line-2 bg-white text-sm outline-none focus:border-teal"
                  disabled={saving}
                >
                  <option value={0}>Exact shift start</option>
                  <option value={5}>5 minutes grace period</option>
                  <option value={10}>10 minutes grace period</option>
                  <option value={15}>15 minutes grace period</option>
                  <option value={30}>30 minutes grace period</option>
                </select>
                <div className="text-[11px] text-ink-3 mt-1">Grace period before clock-in is flagged as &quot;Late&quot;.</div>
              </FormField>
            </div>
          </div>

          {/* Administrative Control */}
          <div className="bg-white border border-line rounded-xl p-[20px_22px] flex flex-col gap-4">
            <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3">Administrative controls</div>

            <div className="flex justify-between items-center py-2.5 border-b border-line last:border-b-0 last:pb-0 first:pt-0">
              <div>
                <div className="text-sm font-medium">Manual admin edits</div>
                <div className="text-xs text-ink-3 mt-0.5">Allows salon owners and managers to manually edit clock logs or force clock actions.</div>
              </div>
              <label className="inline-flex cursor-pointer items-center relative shrink-0">
                <input
                  type="checkbox"
                  className="absolute opacity-0 pointer-events-none peer"
                  checked={s.allow_admin_edit}
                  onChange={e => void updateSettings({ allow_admin_edit: e.target.checked })}
                  disabled={saving}
                />
                <span className="w-9 h-5.5 rounded-full bg-line-2 relative transition-colors duration-150 before:content-[''] before:absolute before:left-[2px] before:top-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform before:duration-[180ms] before:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-teal peer-checked:before:translate-x-[14px]"></span>
              </label>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-line last:border-b-0 last:pb-0">
              <div>
                <div className="text-sm font-medium">Mandatory edit reason</div>
                <div className="text-xs text-ink-3 mt-0.5">Requires the editor to provide a written explanation for every adjustment (saved in audit log).</div>
              </div>
              <label className="inline-flex cursor-pointer items-center relative shrink-0">
                <input
                  type="checkbox"
                  className="absolute opacity-0 pointer-events-none peer"
                  checked={s.require_edit_reason}
                  onChange={e => void updateSettings({ require_edit_reason: e.target.checked })}
                  disabled={saving}
                />
                <span className="w-9 h-5.5 rounded-full bg-line-2 relative transition-colors duration-150 before:content-[''] before:absolute before:left-[2px] before:top-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform before:duration-[180ms] before:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-teal peer-checked:before:translate-x-[14px]"></span>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
