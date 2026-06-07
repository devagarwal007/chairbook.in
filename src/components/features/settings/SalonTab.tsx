"use client";

import React from "react";
import Image from "next/image";
import { FormField, Icons as I } from "@/components/ui";
import SectionHead from "@/components/features/settings/SectionHead";
import { DAYS } from "@/constants/settings";
import { MAX_BOOKING_WINDOW_DAYS, MIN_BOOKING_WINDOW_DAYS, normalizeBookingWindowDays } from "@/lib/booking-window";
import type { SettingsData } from "@/types";

type SalonTabProps = {
  data: SettingsData;
  update: (next: SettingsData) => void;
  deletePhoto: (url: string) => void;
  handlePhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function SalonTab({ data, update, deletePhoto, handlePhotoUpload }: SalonTabProps) {
  return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead title="Salon profile" desc="What your customers see on the booking page." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <FormField label="Salon name">
                <input
                  value={data.salon.name}
                  onChange={e => update({ ...data, salon: { ...data.salon, name: e.target.value } })}
                  style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                />
              </FormField>
              <FormField label="Area / address" style={{ marginTop: 14 }}>
                <input
                  value={data.salon.area}
                  onChange={e => update({ ...data, salon: { ...data.salon, area: e.target.value } })}
                  style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                />
              </FormField>
              <div className="field-row" style={{ marginTop: 14 }}>
                <FormField label="City">
                  <input
                    value={data.salon.city}
                    onChange={e => update({ ...data, salon: { ...data.salon, city: e.target.value } })}
                    style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                  />
                </FormField>
                <FormField label="Salon type">
                  <select
                    value={data.salon.type}
                    onChange={e => update({ ...data, salon: { ...data.salon, type: e.target.value } })}
                    style={{ height: 40, border: "1px solid var(--line-2)", borderRadius: 8, padding: "0 10px", outline: 0, fontSize: 14, background: "#fff" }}
                  >
                    <option>Unisex salon</option>
                    <option>Ladies salon</option>
                    <option>{"Men's salon"}</option>
                    <option>Barbershop</option>
                    <option>Beauty parlour</option>
                    <option>Spa</option>
                  </select>
                </FormField>
              </div>
              <FormField label="Accept bookings for next" style={{ marginTop: 14 }}>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={MIN_BOOKING_WINDOW_DAYS}
                    max={MAX_BOOKING_WINDOW_DAYS}
                    step="1"
                    value={data.salon.bookingWindowDays}
                    onChange={e => update({
                      ...data,
                      salon: {
                        ...data.salon,
                        bookingWindowDays: normalizeBookingWindowDays(e.target.value),
                      },
                    })}
                    style={{ width: 110, padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                  />
                  <span className="text-sm text-ink-2">days</span>
                  <span className="text-xs text-ink-3">Customers and staff can book today through this many selectable dates.</span>
                </div>
              </FormField>
            </div>

            <SectionHead title="Photos" desc="At least one photo helps customers trust the salon. 3:2 aspect, < 5 MB each." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="grid grid-cols-4 gap-2.5 max-[720px]:grid-cols-2">
                {(data.salon.photos || []).map((url, i) => (
                  <div key={url || i} className="relative aspect-[3/2] rounded-lg overflow-hidden border border-line group">
                    <Image src={url} alt={`Salon photo ${i + 1}`} fill sizes="(max-width: 720px) 50vw, 25vw" unoptimized className="object-cover" />
                    <button
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-rose text-white flex items-center justify-center border-0 cursor-pointer transition-colors duration-150"
                      onClick={() => deletePhoto(url)}
                      title="Remove photo"
                      style={{ border: 0, padding: 0 }}
                    >
                      <I.trash style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                ))}
                {(data.salon.photos || []).length === 0 && [1, 2, 3].map(i => (
                  <div key={i} className="relative aspect-[3/2] rounded-lg overflow-hidden border border-line opacity-60">
                    <svg viewBox="0 0 100 70" width="100%" height="100%">
                      <defs>
                        <pattern id={`stripes-${i}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(15,110,86,0.15)" strokeWidth="3" />
                        </pattern>
                      </defs>
                      <rect width="100" height="70" fill="var(--teal-soft)" />
                      <rect width="100" height="70" fill={`url(#stripes-${i})`} />
                    </svg>
                    <div className="absolute bottom-1.5 left-2 font-mono text-[10px] text-teal-ink bg-white/80 py-0.5 px-1.5 rounded">example {i}</div>
                  </div>
                ))}
                <label className="aspect-[3/2] rounded-lg bg-bg-2 border border-dashed border-line-2 flex flex-col items-center justify-center gap-1.5 font-inherit text-xs text-ink-3 cursor-pointer transition-colors duration-150 hover:bg-bg hover:border-ink-3 hover:text-ink">
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handlePhotoUpload}
                  />
                  <span className="w-7 h-7 rounded-full bg-white grid place-items-center text-lg font-light border border-line">+</span>
                  Add photo
                </label>
              </div>
            </div>

            <SectionHead title="Working hours" desc="Customers will only see slots inside these hours." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="flex flex-col gap-1">
                {DAYS.map(d => {
                  const h = data.hours[d.id] || { open: false, from: "10:00", to: "20:00" };
                  return (
                    <div key={d.id} className={`grid grid-cols-[200px_1fr] gap-4 py-2.5 border-b border-line items-center last:border-b-0 max-[720px]:grid-cols-1 max-[720px]:gap-2 ${h.open ? "" : "opacity-60"}`}>
                      <label className="flex items-center gap-3 text-sm font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-teal w-4 h-4"
                          checked={h.open}
                          onChange={e => update({ ...data, hours: { ...data.hours, [d.id]: { ...h, open: e.target.checked } } })}
                        />
                        <span>{d.name}</span>
                      </label>
                      {h.open ? (
                        <div className="flex items-center gap-2.5 justify-end max-[720px]:justify-start max-[720px]:pl-7">
                          <input
                            className="ob-time"
                            value={h.from}
                            onChange={e => update({ ...data, hours: { ...data.hours, [d.id]: { ...h, from: e.target.value } } })}
                          />
                          <span className="ob-time-sep">to</span>
                          <input
                            className="ob-time"
                            value={h.to}
                            onChange={e => update({ ...data, hours: { ...data.hours, [d.id]: { ...h, to: e.target.value } } })}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 justify-end max-[720px]:justify-start max-[720px]:pl-7 text-[13px] text-ink-3 italic">Closed</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

}
