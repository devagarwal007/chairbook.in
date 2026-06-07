"use client";

import { Avatar, Icons as I } from "@/components/ui";
import SectionHead from "@/components/features/settings/SectionHead";
import type { SettingsData, Stylist } from "@/types";

type TeamTabProps = {
  data: SettingsData;
  update: (next: SettingsData) => void;
  openAddStylist: () => void;
  openEditStylist: (stylist: Stylist) => void;
  inviteStylistAccount: (stylist: Stylist) => Promise<void>;
  invitingStylistId: string | number | null;
};

export default function TeamTab({ data, update, openAddStylist, openEditStylist, inviteStylistAccount, invitingStylistId }: TeamTabProps) {
  return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead
              title="Team"
              desc={`${data.team.length} stylists${data.plan === "salon" ? " · Up to 5 on your plan" : ""}`}
              action={
                <button className="btn btn-primary btn-sm" onClick={openAddStylist}>
                  <I.plus style={{ width: 14, height: 14 }} /> Add stylist
                </button>
              }
            />
            <div className="bg-white border border-line rounded-xl p-0">
              {data.team.map(s => (
                <div key={s.id} className="grid grid-cols-[40px_1fr_auto_auto] gap-3.5 p-[14px_20px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-[40px_1fr]">
                  <Avatar initials={s.name[0]} tone={s.tone} size="md" src={s.photo_url} alt={s.name} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{s.name}</div>
                    <div className="text-xs text-ink-3 mt-0.5">{s.role}</div>
                    <div className="text-[11px] text-ink-3 mt-1">
                      {s.account_accepted_at ? "Account active" : s.user_id ? "Invite pending" : s.email ? "Email added · invite optional" : "No account access"}
                    </div>
                  </div>
                  <div className="text-right px-2.5 border-l border-line max-[720px]:col-span-full max-[720px]:p-0 max-[720px]:border-0 max-[720px]:text-left max-[720px]:flex max-[720px]:items-baseline max-[720px]:gap-2">
                    <div className="text-base font-semibold tracking-[-0.015em]">{s.commission}%</div>
                    <div className="text-[10px] text-ink-3 tracking-[0.04em] uppercase max-[720px]:before:content-['·'] max-[720px]:before:mr-1">Commission</div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {!s.account_accepted_at && (
                      <button
                        className="h-8 px-2.5 rounded-lg border border-line bg-white text-xs font-medium text-ink-2 cursor-pointer hover:bg-bg-2 disabled:opacity-50"
                        onClick={() => inviteStylistAccount(s)}
                        disabled={invitingStylistId === s.id}
                        title={s.user_id ? "Resend pending invite" : s.email ? "Invite account access" : "Add email to enable invite"}
                      >
                        {invitingStylistId === s.id ? (s.user_id ? "Resending" : "Inviting") : (s.user_id ? "Resend" : "Invite")}
                      </button>
                    )}
                    <button
                      className="cust-action wa"
                      style={{ opacity: 1, background: "transparent", borderColor: "var(--line)", cursor: "pointer" }}
                      onClick={() => openEditStylist(s)}
                    >
                      <I.edit style={{ width: 14, height: 14 }} />
                    </button>
                    <button
                      className="cust-action"
                      style={{ opacity: 1, background: "transparent", borderColor: "var(--line)", color: "var(--rose)", cursor: "pointer" }}
                      onClick={() => {
                        const list = data.team.filter(item => item.id !== s.id);
                        update({ ...data, team: list });
                      }}
                    >
                      <I.trash style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

}
