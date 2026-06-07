"use client";

import dynamic from "next/dynamic";
import { FormField } from "@/components/ui";
import SectionHead from "@/components/features/settings/SectionHead";
import { INDIAN_STATE_OPTIONS, validateGstin } from "@/lib/gst";
import type { InvoiceListHook } from "@/hooks/useInvoiceSearch";
import type { GstInvoiceListFilters, GstInvoiceListRow } from "@/types/invoice";
import type { SalonGstSettings, SettingsData } from "@/types";
import { DEFAULT_GST_SETTINGS } from "@/types";

const GstInvoiceHistory = dynamic(
  () => import("@/components/features/invoices/InvoiceHistory").then(m => ({ default: m.GstInvoiceHistory })),
  { loading: () => <div className="animate-pulse bg-bg-2 rounded-xl h-[200px]" /> }
);

type GstTabProps = {
  data: SettingsData;
  update: (next: SettingsData) => void;
  gstInvoiceList: InvoiceListHook<GstInvoiceListRow, GstInvoiceListFilters>;
};

export default function GstTab({ data, update, gstInvoiceList }: GstTabProps) {
  const gstForm = data.gst || DEFAULT_GST_SETTINGS;
        const gstinResult = gstForm.gstin ? validateGstin(gstForm.gstin) : null;
        const gstinValid = gstForm.gstin ? (gstinResult?.valid ?? false) : true;
        const updateGst = (patch: Partial<SalonGstSettings>) => {
          const updated = { ...gstForm, ...patch };
          if (patch.gstin && patch.gstin.length === 15) {
            const result = validateGstin(patch.gstin);
            if (result.valid && result.stateCode && result.stateName) {
              updated.state = result.stateName;
              updated.state_code = result.stateCode;
            }
          }
          update({ ...data, gst: updated });
        };
        return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead title="GST & Billing" desc="Configure GST for customer invoices." />
            {/* Enable / Disable Toggle */}
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold">GST invoicing</div>
                  <div className="text-xs text-ink-3 mt-0.5">
                    {gstForm.gst_enabled
                      ? "Tax invoices will be generated for every completed payment."
                      : "Enable to generate GST-compliant invoices for customers."}
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center relative shrink-0">
                  <input type="checkbox" className="absolute opacity-0 pointer-events-none peer" checked={gstForm.gst_enabled} onChange={e => updateGst({ gst_enabled: e.target.checked })} />
                  <div className="w-[44px] h-[24px] rounded-full bg-line peer-checked:bg-teal transition" />
                  <div className="absolute left-[3px] top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition peer-checked:translate-x-[20px]" />
                </label>
              </div>
            </div>
            {gstForm.gst_enabled && (
              <>
                {/* Business details */}
                <div className="bg-white border border-line rounded-xl p-[20px_22px]">
                  <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mb-3">Business details</div>
                  <FormField label="GSTIN">
                    <input value={gstForm.gstin} onChange={e => updateGst({ gstin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15) })} placeholder="e.g. 27AABCU9603R1ZM" maxLength={15} style={{ padding: "10px 12px", border: `1px solid ${gstForm.gstin && !gstinValid ? "var(--red)" : "var(--line-2)"}`, borderRadius: 8, outline: 0, fontSize: 14, fontFamily: "monospace", letterSpacing: "0.05em" }} />
                    {gstForm.gstin && !gstinValid && <div className="text-xs text-red-500 mt-1">Invalid GSTIN format</div>}
                    {gstinResult?.valid && <div className="text-xs text-teal-ink mt-1">{"\u2713"} {gstinResult.stateName} ({gstinResult.stateCode})</div>}
                  </FormField>
                  <FormField label="Legal business name" style={{ marginTop: 14 }}>
                    <input value={gstForm.legal_name} onChange={e => updateGst({ legal_name: e.target.value })} placeholder="As on GST certificate" style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }} />
                  </FormField>
                  <FormField label="Registered address" style={{ marginTop: 14 }}>
                    <textarea value={gstForm.registered_address} onChange={e => updateGst({ registered_address: e.target.value })} placeholder="Full address as per GST registration" rows={2} style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, resize: "vertical" }} />
                  </FormField>
                  <div className="field-row" style={{ marginTop: 14 }}>
                    <FormField label="State">
                      <select value={gstForm.state_code || ""} onChange={e => { const opt = INDIAN_STATE_OPTIONS.find(s => s.code === e.target.value); if (opt) updateGst({ state: opt.name, state_code: opt.code }); }} style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, background: "#fff" }}>
                        <option value="">Select state</option>
                        {INDIAN_STATE_OPTIONS.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                      </select>
                    </FormField>
                    <FormField label="State code">
                      <input value={gstForm.state_code || ""} readOnly style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, background: "var(--bg)", maxWidth: 80 }} />
                    </FormField>
                  </div>
                </div>
                {/* Tax configuration */}
                <div className="bg-white border border-line rounded-xl p-[20px_22px]">
                  <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mb-3">Tax configuration</div>
                  <div className="text-xs font-semibold text-ink-2 mb-2">Pricing mode</div>
                  <div className="flex gap-2 mb-4">
                    {(["tax_inclusive", "tax_exclusive"] as const).map(mode => (
                      <button key={mode} className={`flex-1 p-3 rounded-lg border text-sm font-medium text-left transition ${gstForm.pricing_mode === mode ? "border-teal bg-teal-soft text-teal-ink" : "border-line bg-white text-ink-2 hover:border-ink-3"}`} onClick={() => updateGst({ pricing_mode: mode })}>
                        <div className="font-semibold">{mode === "tax_inclusive" ? "Tax inclusive" : "Tax exclusive"}</div>
                        <div className="text-xs mt-0.5 opacity-70">{mode === "tax_inclusive" ? "Prices already include GST" : "GST added on top of prices"}</div>
                      </button>
                    ))}
                  </div>
                  <div className="field-row">
                    <FormField label="GST rate (%)">
                      <input type="number" value={gstForm.gst_rate} onChange={e => updateGst({ gst_rate: parseFloat(e.target.value) || 0 })} min={0} max={100} step={0.5} style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, maxWidth: 100 }} />
                      <div className="text-xs text-ink-3 mt-1">CGST {(gstForm.gst_rate / 2).toFixed(1)}% + SGST {(gstForm.gst_rate / 2).toFixed(1)}%</div>
                    </FormField>
                    <FormField label="SAC code">
                      <input value={gstForm.sac_code} onChange={e => updateGst({ sac_code: e.target.value.replace(/\D/g, "").slice(0, 8) })} style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, fontFamily: "monospace", maxWidth: 120 }} />
                      <div className="text-xs text-ink-3 mt-1">Default: 999721 (Salon services)</div>
                    </FormField>
                    <FormField label="Invoice prefix">
                      <input value={gstForm.invoice_prefix} onChange={e => updateGst({ invoice_prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) })} maxLength={6} style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, fontFamily: "monospace", maxWidth: 100 }} />
                      <div className="text-xs text-ink-3 mt-1">e.g. SAL = SAL-2627-000001</div>
                    </FormField>
                  </div>
                </div>

                <GstInvoiceHistory list={gstInvoiceList} />
              </>
            )}
          </div>
        );
}
