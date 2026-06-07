"use client";

import { useMemo, useState } from "react";
import { Icons as I, Modal, FormField, PhoneInput } from "@/components/ui";
import { formatServiceCode } from "@/lib/service-codes";
import {
  getBundleOriginalPrice,
  getBundleSavings,
  getBundleSavingsPct,
  getServiceDuration,
  serviceMatchesBundleSearch,
} from "@/lib/service-bundles";
import type { Service, Stylist } from "@/types";

interface WalkInModalProps {
  onClose: () => void;
  onAdd: (data: { name: string; phone: string; services: Service[]; stylistId: string | number }) => void;
  services: Service[];
  stylists: Stylist[];
}

export default function WalkInModal({ onClose, onAdd, services, stylists }: WalkInModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [svcQuery, setSvcQuery] = useState("");

  const defaultStylistId = stylists.filter((s) => s.id !== "all")[0]?.id || "anjali";

  const [svcIds, setSvcIds] = useState<Array<string | number>>(() => services[0] ? [services[0].id] : []);
  const [stylistId, setStylistId] = useState(defaultStylistId);

  const filteredServices = useMemo(() => {
    return services.filter((service) => serviceMatchesBundleSearch(service, svcQuery));
  }, [svcQuery, services]);

  const selectedServices = useMemo(
    () => services.filter((service) => svcIds.some((id) => String(id) === String(service.id))),
    [services, svcIds]
  );
  const totalDuration = selectedServices.reduce((sum, service) => sum + getServiceDuration(service), 0);
  const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
  const isPhoneValid = !phone || phone.length === 10;
  const canSubmit = name.trim().length > 0 && isPhoneValid && selectedServices.length > 0;

  const toggleService = (id: string | number) => {
    setSvcIds((current) => current.some((item) => String(item) === String(id))
      ? current.filter((item) => String(item) !== String(id))
      : [...current, id]);
  };

  return (
    <Modal
      title="Add walk-in booking"
      onClose={onClose}
      width="min(440px, 100%)"
      footer={
        <>
          <button
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] font-sans text-sm font-medium border border-transparent cursor-pointer bg-transparent text-ink-2 hover:text-ink hover:bg-bg-2 transition-all duration-150"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] font-sans text-sm font-medium border border-transparent cursor-pointer bg-teal !text-white hover:bg-teal-ink transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canSubmit}
            onClick={() => {
              onAdd({ name, phone, services: selectedServices, stylistId });
              onClose();
            }}
          >
            Add {selectedServices.length || ""} to schedule
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 max-[480px]:grid-cols-1 gap-3">
        <FormField label="Customer name">
          <input
            placeholder="e.g. Priya Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full h-[42px] px-3.5 rounded-[10px] border border-line-2 bg-white font-sans text-sm text-ink outline-none transition-colors duration-150 focus:border-teal min-w-0"
          />
        </FormField>
        <FormField label="Phone (optional)">
          <PhoneInput
            value={phone}
            onChange={setPhone}
          />
        </FormField>
      </div>
      <FormField label="Service">
        <div className="flex items-center gap-2 border border-line-2 rounded-[10px] px-3.5 py-2 mb-3 bg-white">
          <I.search className="text-ink-3 shrink-0 w-4 h-4" />
          <input
            placeholder="Search service or combo..."
            value={svcQuery}
            onChange={(e) => setSvcQuery(e.target.value)}
            className="flex-1 border-0 outline-0 text-sm font-sans bg-transparent min-w-0"
          />
          {svcQuery && (
            <button className="border-0 bg-transparent cursor-pointer grid place-items-center text-ink-3 hover:text-ink" onClick={() => setSvcQuery("")}>
              <I.x className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-[230px] overflow-y-auto pr-1">
          {filteredServices.map((s) => {
            const selected = svcIds.some((id) => String(id) === String(s.id));
            const isBundle = s.kind === "bundle";
            const included = s.includedServices || [];
            const savings = getBundleSavings(s);
            const originalPrice = getBundleOriginalPrice(s);
            const savingsPct = getBundleSavingsPct(s);

            return (
              <button
                key={s.id}
                className={`p-[10px_12px] border rounded-[10px] cursor-pointer text-[13px] text-left font-sans transition-all duration-150 ${
                  selected ? "border-teal bg-teal-soft text-teal-ink font-medium" : "border-line bg-white text-ink hover:border-ink-3"
                }`}
                onClick={() => toggleService(s.id)}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="min-w-0 flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] text-teal bg-teal-soft border border-teal-soft-2 rounded-md px-1.5 py-0.5">
                      {formatServiceCode(s)}
                    </span>
                    <span className="font-semibold leading-snug">{s.name}</span>
                    {isBundle && (
                      <span className="text-[9px] text-amber-ink bg-amber-soft border border-amber rounded-full px-1.5 py-0.5 uppercase tracking-[0.04em]">
                        Combo
                      </span>
                    )}
                  </span>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-[7px] border ${
                    selected ? "border-teal bg-teal text-white" : "border-line-2 bg-white text-transparent"
                  }`}>
                    <I.check className="w-3 h-3" />
                  </span>
                </div>
                {isBundle && included.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {included.map((item) => (
                      <span key={item.id} className="rounded-full border border-line bg-bg-2 px-2 py-0.5 text-[11px] leading-tight text-ink-2">
                        {item.name}
                      </span>
                    ))}
                  </div>
                )}
                {isBundle && s.bundle_note && <div className="mt-1.5 text-[11px] leading-snug text-ink-3">{s.bundle_note}</div>}
                <div className={`mt-2 flex items-center justify-between gap-2 font-mono text-[11px] ${selected ? "text-teal" : "text-ink-3"}`}>
                  <span>{getServiceDuration(s)}m · ₹{Number(s.price || 0).toLocaleString("en-IN")}</span>
                  {isBundle && savings > 0 && (
                    <span className="text-teal font-semibold">
                      Save {savingsPct}% <span className="text-ink-4 line-through">₹{originalPrice.toLocaleString("en-IN")}</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {filteredServices.length === 0 && (
            <div className="col-span-2 text-center text-xs text-ink-3 py-4">No services match your search.</div>
          )}
        </div>
        <div className="mt-2 text-xs text-ink-3">
          {selectedServices.length} selected · {totalDuration} min · ₹{totalPrice.toLocaleString("en-IN")}
        </div>
      </FormField>
      <FormField label="Stylist">
        <select
          value={stylistId}
          onChange={(e) => setStylistId(e.target.value)}
          className="w-full h-[42px] px-3.5 rounded-[10px] border border-line-2 bg-white font-sans text-sm text-ink outline-none transition-colors duration-150 focus:border-teal"
        >
          {stylists.filter((s) => s.id !== "all").map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </FormField>
    </Modal>
  );
}
