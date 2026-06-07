"use client";

import { useRouter } from "next/navigation";
import { FormField, Icons as I, PhoneInput } from "@/components/ui";
import SectionHead from "@/components/features/settings/SectionHead";
import RowField from "@/components/features/settings/RowField";
import { signOutCurrentUser } from "@/lib/auth-session";
import type { SettingsData } from "@/types";

type AccountTabProps = {
  data: SettingsData;
  update: (next: SettingsData) => void;
  showFlash: (message: string, ms?: number) => void;
  setDeleteConfirmName: (value: string) => void;
  setShowDeleteModal: (value: boolean) => void;
};

export default function AccountTab({ data, update, showFlash, setDeleteConfirmName, setShowDeleteModal }: AccountTabProps) {
  const router = useRouter();
  return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead title="Your profile" />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="field-row">
                <FormField label="Name">
                  <input
                    value={data.account?.name || ""}
                    onChange={e => update({ ...data, account: { ...data.account, name: e.target.value } })}
                    className="p-[10px_12px] border border-line-2 rounded-lg outline-none text-sm w-full"
                  />
                </FormField>
                <FormField label="Phone (contact)">
                  <PhoneInput
                    value={data.account?.phone || ""}
                    onChange={val => update({ ...data, account: { ...data.account, phone: val } })}
                  />
                </FormField>
              </div>
              <FormField label="Email (for receipts &amp; reports)" className="mt-3.5">
                <input
                  value={data.account?.email || ""}
                  onChange={e => update({ ...data, account: { ...data.account, email: e.target.value } })}
                  className="p-[10px_12px] border border-line-2 rounded-lg outline-none text-sm w-full"
                />
              </FormField>
            </div>

            <SectionHead title="Preferences" />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <RowField label="Language" value="English" action={<span className="text-xs text-ink-3 font-semibold uppercase tracking-wider bg-bg-2 p-[3px_8px] rounded border border-line">Fixed</span>} />
              <RowField label="Timezone" value="Asia/Kolkata (IST)" hint="Used for booking times and reports." action={<span className="text-xs text-ink-3 font-semibold uppercase tracking-wider bg-bg-2 p-[3px_8px] rounded border border-line">Fixed</span>} />
              <RowField label="Currency" value="Indian Rupee · ₹" action={<span className="text-xs text-ink-3 font-semibold uppercase tracking-wider bg-bg-2 p-[3px_8px] rounded border border-line">Fixed</span>} />
            </div>

            <SectionHead title="Danger zone" desc="Be careful here." />
            <div className="bg-white border border-rose-soft rounded-xl p-[20px_22px]">
              <RowField
                label="Export all data"
                value="Get a ZIP with customers, bookings, and reports."
                action={<button className="btn btn-outline btn-sm" onClick={() => showFlash("Exporting data ZIP...")}>Request export</button>}
              />
              <RowField
                label={data.salon.is_active !== false ? "Pause salon" : "Resume salon"}
                value={data.salon.is_active !== false ? "Stops new bookings without deleting data." : "Allows customers to book appointments again."}
                action={
                  <button
                    className="btn btn-outline btn-sm"
                    style={{
                      color: data.salon.is_active !== false ? "var(--amber-ink)" : "var(--green)",
                      borderColor: data.salon.is_active !== false ? "var(--amber-soft)" : "var(--green-soft)"
                    }}
                    onClick={() => {
                      const nextActiveState = data.salon.is_active !== false ? false : true;
                      update({
                        ...data,
                        salon: {
                          ...data.salon,
                          is_active: nextActiveState
                        }
                      });
                      showFlash(nextActiveState ? "Salon paused (click Save to persist)" : "Salon resumed (click Save to persist)");
                    }}
                  >
                    {data.salon.is_active !== false ? "Pause" : "Resume"}
                  </button>
                }
              />
              <RowField
                label="Delete account"
                value="Permanent. This will cascade delete all salons, stylists, services, and bookings."
                action={
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: "var(--rose)", borderColor: "var(--rose-soft)" }}
                    onClick={() => {
                      setDeleteConfirmName("");
                      setShowDeleteModal(true);
                    }}
                  >
                    Delete
                  </button>
                }
              />
            </div>

            {/* Logout button */}
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={async () => {
                  showFlash("Signing out...");
                  await signOutCurrentUser();
                  router.replace("/signin");
                  router.refresh();
                }}
                className="btn btn-outline btn-sm"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--rose)",
                  borderColor: "var(--rose-soft)",
                  fontWeight: 600,
                }}
              >
                <I.logout style={{ width: 14, height: 14 }} /> Logout
              </button>
            </div>
          </div>
        );

}
