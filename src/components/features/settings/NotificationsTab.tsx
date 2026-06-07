"use client";

import SectionHead from "@/components/features/settings/SectionHead";
import type { SettingsData } from "@/types";

type NotificationsTabProps = {
  data: SettingsData;
  update: (next: SettingsData) => void;
};

export default function NotificationsTab({ data, update }: NotificationsTabProps) {
  const rows = [
          { id: "newBooking", label: "New booking received",       desc: "When a customer books online or by walk-in." },
          { id: "cancel",     label: "Booking cancelled / changed", desc: "Last-minute changes you need to know about." },
          { id: "noshow",     label: "No-show flagged",             desc: "When a confirmed booking didn't arrive." },
          { id: "daily",      label: "Daily morning summary",       desc: "A WhatsApp digest of your day at 8 AM." },
        ];
        const channels = ["push", "sms", "wa"] as const;
        const channelLabel = { push: "Push", sms: "SMS", wa: "WhatsApp" };
        return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead title="Notifications" desc="Choose how you'd like to be alerted." />
            <div className="bg-white border border-line rounded-xl p-0">
              <div className="grid grid-cols-[1fr_80px_80px_100px] gap-2 p-[14px_20px] bg-bg border-b border-line text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 max-[720px]:hidden">
                <div></div>
                {channels.map(c => (
                  <div key={c} className="text-center">{channelLabel[c]}</div>
                ))}
              </div>
              {rows.map(r => {
                const notifChannels = data.notifs[r.id] || { push: false, sms: false, wa: false };
                return (
                  <div key={r.id} className="grid grid-cols-[1fr_80px_80px_100px] gap-2 p-[16px_20px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-1 max-[720px]:gap-3">
                    <div>
                      <div className="text-sm font-semibold">{r.label}</div>
                      <div className="text-xs text-ink-3 mt-0.5">{r.desc}</div>
                    </div>
                    {channels.map(c => (
                      <div key={c} className="text-center max-[720px]:flex max-[720px]:justify-between max-[720px]:items-center">
                        <span className="hidden max-[720px]:inline text-xs text-ink-2 font-medium">{channelLabel[c]}</span>
                        <label className="inline-flex cursor-pointer items-center relative shrink-0">
                          <input
                            type="checkbox"
                            className="absolute opacity-0 pointer-events-none peer"
                            checked={notifChannels[c] || false}
                            onChange={e => {
                              const updatedNotif = {
                                ...notifChannels,
                                [c]: e.target.checked
                              };
                              update({
                                ...data,
                                notifs: {
                                  ...data.notifs,
                                  [r.id]: updatedNotif
                                }
                              });
                            }}
                          />
                          <span className="w-9 h-5.5 rounded-full bg-line-2 relative transition-colors duration-150 before:content-[''] before:absolute before:left-[2px] before:top-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform before:duration-[180ms] before:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-teal peer-checked:before:translate-x-[14px]"></span>
                        </label>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );

}
