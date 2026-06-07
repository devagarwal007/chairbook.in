"use client";

import { Badge, Icons as I } from "@/components/ui";
import SectionHead from "@/components/features/settings/SectionHead";
import { buildWalletSummary, type MessageCreditWalletRow } from "@/lib/whatsapp/wallet-view";
import { normalizeWhatsAppSenderPreference } from "@/lib/settings-helpers";
import type { SettingsData, WhatsAppChannelView, WhatsAppConnectConfig, WhatsAppSenderPreference, WhatsAppTemplateView, WhatsAppTemplates } from "@/types";

type WhatsAppTabProps = {
  data: SettingsData;
  update: (next: SettingsData) => void;
  whatsappChannels: WhatsAppChannelView[];
  whatsappTemplates: WhatsAppTemplateView[];
  messageWallet: MessageCreditWalletRow | null;
  waConnectConfig: WhatsAppConnectConfig;
  waConnectBusy: boolean;
  waConnectStatus: string | null;
  waSenderSaving: boolean;
  waTestPhone: string;
  setWaTestPhone: (value: string) => void;
  waTestSending: boolean;
  startWhatsAppConnect: () => Promise<void>;
  openWaChange: () => void;
  saveWhatsAppSenderPreference: (preference: WhatsAppSenderPreference) => Promise<void>;
  sendWhatsAppTestMessage: () => Promise<void>;
  openEditTemplate: (key: keyof WhatsAppTemplates) => void;
};

export default function WhatsAppTab({
  data,
  update,
  whatsappChannels,
  whatsappTemplates,
  messageWallet,
  waConnectConfig,
  waConnectBusy,
  waConnectStatus,
  waSenderSaving,
  waTestPhone,
  setWaTestPhone,
  waTestSending,
  startWhatsAppConnect,
  openWaChange,
  saveWhatsAppSenderPreference,
  sendWhatsAppTestMessage,
  openEditTemplate,
}: WhatsAppTabProps) {
  const ownedChannel = whatsappChannels.find((channel) => channel.mode === "salon_owned");
        const senderPreference = normalizeWhatsAppSenderPreference(data.wa.senderPreference);
        const ownedChannelUsable = Boolean(
          ownedChannel?.status === "active"
          && ownedChannel.credit_line_status === "active"
          && ownedChannel.phone_number_id
        );
        const usingSalonOwnedSender = senderPreference === "salon_owned" && ownedChannelUsable;
        const activeChannel = usingSalonOwnedSender ? ownedChannel : null;
        const walletSummary = buildWalletSummary(messageWallet);
        const availableCredits = walletSummary.availableCredits;
        const templateStatus = new Map(whatsappTemplates.map((template) => [template.template_key, template.status]));
        const activeSenderLabel = usingSalonOwnedSender
          ? ownedChannel?.display_number || "Salon-owned WhatsApp"
          : "ChairBook WhatsApp";
        const activeSenderMode = usingSalonOwnedSender
          ? "Salon-owned number"
          : senderPreference === "salon_owned"
            ? "ChairBook sender while your number finishes activation"
            : "ChairBook sender";
        const channelTone = usingSalonOwnedSender
          ? "green"
          : waConnectConfig.chairbookSenderConfigured ? "green" : "amber";
        const creditTone = usingSalonOwnedSender
          ? "green"
          : waConnectConfig.chairbookSenderConfigured ? "green" : "amber";
        const webhookTone = usingSalonOwnedSender
          ? ownedChannel?.webhook_status === "subscribed" ? "green" : ownedChannel?.webhook_status === "error" ? "rose" : "gray"
          : "gray";

        return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead title="WhatsApp integration" desc="ChairBook WhatsApp is the default sender. Salons can switch to their own number after activation." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="flex justify-between items-start gap-4 max-[720px]:flex-col">
                <div className="flex items-start gap-3.5 min-w-0">
                  <I.wa style={{ color: "var(--wa)", width: 24, height: 24 }} />
                  <div>
                    <div className="text-sm font-semibold">{activeSenderLabel}</div>
                    <div className="text-xs text-ink-3 mt-1">Sender mode: {activeSenderMode}</div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge tone={channelTone}>{usingSalonOwnedSender ? `Channel ${activeChannel?.status}` : `ChairBook ${waConnectConfig.chairbookSenderConfigured ? "configured" : "missing"}`}</Badge>
                      <Badge tone={creditTone}>{usingSalonOwnedSender ? `Credit line ${activeChannel?.credit_line_status}` : "ChairBook credit line"}</Badge>
                      <Badge tone={webhookTone}>Webhook {usingSalonOwnedSender ? activeChannel?.webhook_status || "unknown" : "managed by ChairBook"}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 max-[720px]:items-start">
                  <div className="flex gap-2 max-[520px]:flex-col">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={startWhatsAppConnect}
                      disabled={waConnectBusy || waConnectConfig.loading}
                    >
                      <I.wa style={{ width: 15, height: 15 }} />
                      {waConnectBusy ? "Connecting" : ownedChannel ? "Reconnect WhatsApp" : "Connect WhatsApp"}
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={openWaChange}>Update display number</button>
                  </div>
                  {!waConnectConfig.loading && !waConnectConfig.configured && (
                    <div className="text-xs text-ink-3 max-w-[260px] text-right max-[720px]:text-left">
                      Missing: {waConnectConfig.missing.length ? waConnectConfig.missing.join(", ") : "WhatsApp setup env"}
                    </div>
                  )}
                  {!waConnectConfig.loading && !waConnectConfig.chairbookSenderConfigured && (
                    <div className="text-xs max-w-[300px] text-right max-[720px]:text-left" style={{ color: "var(--amber)" }}>
                      Add WHATSAPP_CHAIRBOOK_ACCESS_TOKEN and WHATSAPP_CHAIRBOOK_PHONE_NUMBER_ID to enable the default sender.
                    </div>
                  )}
                  {waConnectStatus && (
                    <div className="text-xs text-ink-3 max-w-[300px] text-right max-[720px]:text-left">
                      {waConnectStatus}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-5 max-[720px]:grid-cols-1">
                <button
                  type="button"
                  aria-pressed={senderPreference === "chairbook"}
                  className={`text-left rounded-lg border p-3 cursor-pointer transition ${senderPreference === "chairbook" ? "border-teal bg-teal-soft" : "border-line bg-white hover:bg-bg-2"}`}
                  onClick={() => void saveWhatsAppSenderPreference("chairbook")}
                  disabled={waSenderSaving}
                >
                  <div className="text-sm font-semibold">ChairBook sender</div>
                  <div className="text-xs text-ink-3 mt-1">Customers receive messages from ChairBook WhatsApp, branded for your salon.</div>
                </button>
                <button
                  type="button"
                  aria-pressed={senderPreference === "salon_owned"}
                  className={`text-left rounded-lg border p-3 transition ${senderPreference === "salon_owned" ? "border-teal bg-teal-soft" : "border-line bg-white hover:bg-bg-2"} ${ownedChannelUsable ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                  onClick={() => void saveWhatsAppSenderPreference("salon_owned")}
                  disabled={!ownedChannelUsable || waSenderSaving}
                >
                  <div className="text-sm font-semibold">My WhatsApp number</div>
                  <div className="text-xs text-ink-3 mt-1">
                    {ownedChannel
                      ? ownedChannelUsable
                        ? "Customers receive messages from your WhatsApp Business profile."
                        : "Connected, but waiting for active channel and credit line status."
                      : "Connect your WhatsApp Business number to enable this sender."}
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
              <div className="bg-white border border-line rounded-xl p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Available credits</div>
                <div className="text-2xl font-semibold text-ink mt-1 font-mono">{availableCredits.toLocaleString("en-IN")}</div>
                <div className="text-xs text-ink-3 mt-1">Plan and refill credits after reserved sends.</div>
              </div>
              <div className="bg-white border border-line rounded-xl p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Plan balance</div>
                <div className="text-2xl font-semibold text-ink mt-1 font-mono">{walletSummary.planCredits.toLocaleString("en-IN")}</div>
                <div className="text-xs text-ink-3 mt-1">Resets monthly. No rollover.</div>
              </div>
              <div className="bg-white border border-line rounded-xl p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Refill balance</div>
                <div className="text-2xl font-semibold text-ink mt-1 font-mono">{walletSummary.refillCredits.toLocaleString("en-IN")}</div>
                <div className="text-xs text-ink-3 mt-1">Rolls over until used.</div>
              </div>
            </div>

            {availableCredits <= 25 && (
              <div className="bg-amber-soft border border-amber-soft rounded-xl p-[14px_16px] text-sm text-ink-2">
                WhatsApp credits are low. Automated billable sends will stop when the balance reaches zero.
              </div>
            )}

            <SectionHead title="Test message" desc="Send one approved utility template to verify the active sender." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px] flex gap-3 max-[720px]:flex-col">
              <input
                value={waTestPhone}
                onChange={(event) => setWaTestPhone(event.target.value)}
                placeholder={data.wa.number ? `+91 ${data.wa.number}` : "Customer WhatsApp number"}
                className="flex-1 h-10 rounded-lg border border-line-2 px-3 text-sm outline-none focus:border-teal"
              />
              <button className="btn btn-wa btn-sm" style={{ background: "var(--wa)", color: "#fff" }} onClick={sendWhatsAppTestMessage} disabled={waTestSending || availableCredits <= 0}>
                <I.wa style={{ width: 15, height: 15 }} /> {waTestSending ? "Sending" : "Send test"}
              </button>
            </div>

            <SectionHead title="Automations" desc="Only utility messages are enabled in this release." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="flex justify-between items-center gap-4 py-3.5 border-b border-line first:pt-0 last:border-b-0 last:pb-0">
                <div>
                  <div className="text-sm font-semibold">Auto-confirm via WhatsApp</div>
                  <div className="text-xs text-ink-3 mt-0.5 max-w-[480px]">New bookings send the approved confirmation template when credits and sender are active.</div>
                </div>
                <label className="inline-flex cursor-pointer items-center relative shrink-0">
                  <input
                    type="checkbox"
                    className="absolute opacity-0 pointer-events-none peer"
                    checked={data.wa.autoConfirm}
                    onChange={e => update({ ...data, wa: { ...data.wa, autoConfirm: e.target.checked } })}
                  />
                  <span className="w-9 h-5.5 rounded-full bg-line-2 relative transition-colors duration-150 before:content-[''] before:absolute before:left-[2px] before:top-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform before:duration-[180ms] before:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-teal peer-checked:before:translate-x-[14px]"></span>
                </label>
              </div>
              <div className="flex justify-between items-center gap-4 py-3.5 border-b border-line first:pt-0 last:border-b-0 last:pb-0">
                <div>
                  <div className="text-sm font-semibold">Send reminders {data.wa.reminder} hours before</div>
                  <div className="text-xs text-ink-3 mt-0.5 max-w-[480px]">The protected cron sends each reminder once and records the WhatsApp message.</div>
                </div>
                <select
                  value={data.wa.reminder}
                  onChange={e => update({ ...data, wa: { ...data.wa, reminder: parseInt(e.target.value) } })}
                  style={{ width: 100, height: 36, padding: "0 10px", border: "1px solid var(--line-2)", borderRadius: 8, background: "#fff", outline: 0 }}
                >
                  <option value={6}>6 hrs</option>
                  <option value={12}>12 hrs</option>
                  <option value={24}>24 hrs</option>
                  <option value={48}>48 hrs</option>
                </select>
              </div>
              <div className="flex justify-between items-center gap-4 py-3.5 border-b border-line first:pt-0 last:border-b-0 last:pb-0">
                <div>
                  <div className="text-sm font-semibold">Promotional broadcasts</div>
                  <div className="text-xs text-ink-3 mt-0.5 max-w-[480px]">Locked until opt-in, unsubscribe, template approval, and cost preview are implemented.</div>
                </div>
                <Badge tone="gray">Disabled</Badge>
              </div>
            </div>

            <SectionHead title="Message templates" desc="Meta-approved template status from the server." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="flex gap-3.5 py-3 border-b border-line items-start first:pt-0 last:border-b-0 last:pb-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-semibold">Booking confirmation</div>
                    <Badge tone={templateStatus.get("booking_confirmation") === "approved" ? "green" : "amber"}>{templateStatus.get("booking_confirmation") || "pending"}</Badge>
                  </div>
                  <div className="text-xs text-ink-3 mt-1 bg-bg-2 p-[8px_10px] rounded-lg font-mono leading-[1.45]">{data.wa.templates?.confirmation}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => openEditTemplate("confirmation")}>
                  <I.edit style={{ marginRight: 4 }} /> Edit
                </button>
              </div>
              <div className="flex gap-3.5 py-3 border-b border-line items-start first:pt-0 last:border-b-0 last:pb-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-semibold">Reminder</div>
                    <Badge tone={templateStatus.get("booking_reminder") === "approved" ? "green" : "amber"}>{templateStatus.get("booking_reminder") || "pending"}</Badge>
                  </div>
                  <div className="text-xs text-ink-3 mt-1 bg-bg-2 p-[8px_10px] rounded-lg font-mono leading-[1.45]">{data.wa.templates?.reminder}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => openEditTemplate("reminder")}>
                  <I.edit style={{ marginRight: 4 }} /> Edit
                </button>
              </div>
              <div className="flex gap-3.5 py-3 border-b border-line items-start first:pt-0 last:border-b-0 last:pb-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-semibold">Re-engagement</div>
                    <Badge tone="gray">Marketing disabled</Badge>
                  </div>
                  <div className="text-xs text-ink-3 mt-1 bg-bg-2 p-[8px_10px] rounded-lg font-mono leading-[1.45]">{data.wa.templates?.reengagement}</div>
                </div>
                <button className="btn btn-ghost btn-sm" disabled style={{ opacity: 0.5 }}>
                  <I.edit style={{ marginRight: 4 }} /> Edit
                </button>
              </div>
            </div>
          </div>
        );
}
