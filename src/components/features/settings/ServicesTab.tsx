"use client";

import React from "react";
import { Icons as I } from "@/components/ui";
import SectionHead from "@/components/features/settings/SectionHead";
import { formatServiceCode } from "@/lib/service-codes";
import type { Service, ServiceKind, SettingsData } from "@/types";

type ServicesTabProps = {
  data: SettingsData;
  update: (next: SettingsData) => void;
  qServices: string;
  serviceResultCount: number;
  serviceSearch: string;
  setServiceSearch: (value: string) => void;
  totalActiveMenuItems: number;
  totalMenuItems: number;
  bundleServices: Service[];
  filteredNormalServices: Service[];
  filteredBundleServices: Service[];
  serviceCategories: string[];
  serviceById: Map<string | number, Service>;
  getComponentIds: (service: Service) => Array<string | number>;
  openAddService: (startKind?: ServiceKind) => void;
  openEditService: (service: Service) => void;
  deleteServiceMenuItem: (service: Service) => void;
};

const inr = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function ServicesTab({
  data,
  update,
  qServices,
  serviceResultCount,
  serviceSearch,
  setServiceSearch,
  totalActiveMenuItems,
  totalMenuItems,
  bundleServices,
  filteredNormalServices,
  filteredBundleServices,
  serviceCategories,
  serviceById,
  getComponentIds,
  openAddService,
  openEditService,
  deleteServiceMenuItem,
}: ServicesTabProps) {
  return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead
              title="Services"
              desc={qServices
                ? `${serviceResultCount} match${serviceResultCount === 1 ? "" : "es"} for "${serviceSearch}"`
                : `${totalActiveMenuItems} active · ${totalMenuItems} total · ${bundleServices.length} combo${bundleServices.length === 1 ? "" : "s"}`}
              action={
                <button className="btn btn-primary btn-sm" onClick={() => openAddService()}>
                  <I.plus style={{ width: 14, height: 14 }} /> Add
                </button>
              }
            />

            <div className="flex items-center gap-2.5 bg-white border border-line-2 rounded-xl px-3.5 h-11 focus-within:border-teal">
              <I.search style={{ width: 16, height: 16, color: "var(--ink-3)" }} />
              <input
                value={serviceSearch}
                onChange={(event) => setServiceSearch(event.target.value)}
                placeholder="Search by name, category, or code (e.g. #003)..."
                className="flex-1 h-full border-0 outline-0 bg-transparent text-sm"
              />
              {serviceSearch && (
                <button className="border-0 bg-transparent cursor-pointer text-ink-3 grid place-items-center" onClick={() => setServiceSearch("")} aria-label="Clear search">
                  <I.x />
                </button>
              )}
            </div>

            <div className="bg-white border border-line rounded-xl p-0">
              {serviceCategories.map(cat => {
                const items = filteredNormalServices.filter(s => (s.cat || s.category || "General") === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="p-[12px_20px] text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 bg-bg border-b border-line flex gap-2">
                      {cat} <span className="text-ink-4 font-mono">{items.length}</span>
                    </div>
                    {items.map(s => (
                      <div key={s.id} className={`grid grid-cols-[56px_1fr_auto_auto_auto] gap-3 p-[12px_20px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-[56px_1fr_auto] ${!s.active ? "opacity-55" : ""}`}>
                        <div className="font-mono text-xs font-semibold text-teal bg-teal-soft border border-teal-soft-2 rounded-lg px-2 py-1 text-center">
                          {s.code ? formatServiceCode(s) : "#---"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{s.name}</div>
                          <div className="text-xs text-ink-3 mt-0.5 font-mono">
                            {s.duration} min · ₹{s.price.toLocaleString("en-IN")}
                            {!s.active && " · Hidden from booking page"}
                          </div>
                        </div>
                        <label className="inline-flex cursor-pointer items-center relative shrink-0">
                          <input
                            type="checkbox"
                            className="absolute opacity-0 pointer-events-none peer"
                            checked={s.active}
                            onChange={() => {
                              const list = data.services.map(item => item.id === s.id ? { ...item, active: !item.active } : item);
                              update({ ...data, services: list });
                            }}
                          />
                          <span className="w-9 h-5.5 rounded-full bg-line-2 relative transition-colors duration-150 before:content-[''] before:absolute before:left-[2px] before:top-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform before:duration-[180ms] before:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-teal peer-checked:before:translate-x-[14px]"></span>
                        </label>
                        <button
                          className="cust-action wa max-[720px]:hidden"
                          style={{ opacity: 1, background: "transparent", borderColor: "var(--line)", cursor: "pointer" }}
                          onClick={() => openEditService(s)}
                        >
                          <I.edit style={{ width: 14, height: 14 }} />
                        </button>
                        <button
                          className="cust-action max-[720px]:hidden"
                          style={{ opacity: 1, background: "transparent", borderColor: "var(--line)", color: "var(--rose)", cursor: "pointer" }}
                          onClick={() => deleteServiceMenuItem(s)}
                        >
                          <I.trash style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}

              <div>
                <div className="p-[12px_20px] text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 bg-bg border-b border-line flex gap-2 items-center">
                  <span className="grid w-[14px] gap-0.5"><span className="h-0.5 rounded bg-current"></span><span className="h-0.5 rounded bg-current"></span><span className="h-0.5 rounded bg-current"></span></span>
                  Combos <span className="text-ink-4 font-mono">{filteredBundleServices.length}{qServices && filteredBundleServices.length !== bundleServices.length ? ` / ${bundleServices.length}` : ""}</span>
                  <span className="normal-case tracking-normal font-normal text-ink-4">Combo packs with a discount</span>
                </div>
                {filteredBundleServices.length === 0 && !qServices ? (
                  <div className="p-6 text-center">
                    <div className="font-semibold text-sm">No combos yet</div>
                    <div className="text-xs text-ink-3 mt-1 max-w-[420px] mx-auto">Group 2+ services into a discounted combo for wedding season, monthly packages, or first-time offers.</div>
                    <button className="btn btn-outline btn-sm mt-3" onClick={() => openAddService("bundle")}>
                      <I.plus style={{ width: 14, height: 14 }} /> Create combo
                    </button>
                  </div>
                ) : filteredBundleServices.length === 0 ? (
                  <div className="p-6 text-center text-xs text-ink-3">No matching combos.</div>
                ) : filteredBundleServices.map((bundle) => {
                  const included = getComponentIds(bundle)
                    .map((id) => serviceById.get(id))
                    .filter(Boolean) as Service[];
                  const sum = included.reduce((acc, service) => acc + Number(service.price || 0), 0);
                  const totalMin = included.reduce((acc, service) => acc + Number(service.duration || service.duration_min || 0), 0);
                  const save = Math.max(0, sum - Number(bundle.price || 0));
                  const pct = sum > 0 ? Math.round((save / sum) * 100) : 0;
                  return (
                    <div key={bundle.id} className={`grid grid-cols-[56px_1fr_auto_auto_auto] gap-3 p-[12px_20px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-[56px_1fr_auto] ${!bundle.active ? "opacity-55" : ""}`}>
                      <div className="font-mono text-xs font-semibold text-teal bg-teal-soft border border-teal-soft-2 rounded-lg px-2 py-1 text-center">
                        {formatServiceCode(bundle)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                          {bundle.name}
                          <span className="text-[10px] uppercase tracking-[0.05em] bg-amber-soft text-amber-ink border border-amber rounded-full px-2 py-0.5">Combo</span>
                          {save > 0 && <span className="text-[10px] uppercase tracking-[0.05em] bg-teal-soft text-teal border border-teal-soft-2 rounded-full px-2 py-0.5">Save {pct}%</span>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {included.map((service, index) => (
                            <React.Fragment key={service.id}>
                              <span className="text-[11px] bg-bg-2 border border-line rounded-full px-2 py-0.5">{service.name}</span>
                              {index < included.length - 1 && <span className="text-ink-4 text-xs">+</span>}
                            </React.Fragment>
                          ))}
                        </div>
                        <div className="text-xs text-ink-3 mt-1 font-mono">
                          {totalMin || bundle.duration} min · <span className="text-ink font-semibold">{inr(bundle.price)}</span>
                          {save > 0 && <span className="line-through ml-1">{inr(sum)}</span>}
                          {!bundle.active && " · Hidden from booking page"}
                          {bundle.bundle_note && bundle.active && <span className="font-sans"> · {bundle.bundle_note}</span>}
                        </div>
                      </div>
                      <label className="inline-flex cursor-pointer items-center relative shrink-0">
                        <input
                          type="checkbox"
                          className="absolute opacity-0 pointer-events-none peer"
                          checked={bundle.active}
                          onChange={() => {
                            const list = data.services.map(item => item.id === bundle.id ? { ...item, active: !item.active } : item);
                            update({ ...data, services: list });
                          }}
                        />
                        <span className="w-9 h-5.5 rounded-full bg-line-2 relative transition-colors duration-150 before:content-[''] before:absolute before:left-[2px] before:top-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform before:duration-[180ms] before:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-teal peer-checked:before:translate-x-[14px]"></span>
                      </label>
                      <button
                        className="cust-action wa max-[720px]:hidden"
                        style={{ opacity: 1, background: "transparent", borderColor: "var(--line)", cursor: "pointer" }}
                        onClick={() => openEditService(bundle)}
                      >
                        <I.edit style={{ width: 14, height: 14 }} />
                      </button>
                      <button
                        className="cust-action max-[720px]:hidden"
                        style={{ opacity: 1, background: "transparent", borderColor: "var(--line)", color: "var(--rose)", cursor: "pointer" }}
                        onClick={() => deleteServiceMenuItem(bundle)}
                      >
                        <I.trash style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

}
