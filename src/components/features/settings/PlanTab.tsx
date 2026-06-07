"use client";

import dynamic from "next/dynamic";
import { Badge } from "@/components/ui";
import SectionHead from "@/components/features/settings/SectionHead";
import { PLANS } from "@/constants/settings";
import { WHATSAPP_CREDIT_PACKS } from "@/lib/whatsapp/credit-packs";
import { buildWalletSummary, type MessageCreditWalletRow } from "@/lib/whatsapp/wallet-view";
import type { InvoiceListHook } from "@/hooks/useInvoiceSearch";
import type { BillingInvoiceListFilters, BillingInvoiceListRow } from "@/types/invoice";
import type { MessageCreditLedgerView, MessageCreditTopupView, SettingsData } from "@/types";

const BillingInvoiceHistory = dynamic(
  () => import("@/components/features/invoices/InvoiceHistory").then(m => ({ default: m.BillingInvoiceHistory })),
  { loading: () => <div className="animate-pulse bg-bg-2 rounded-xl h-[200px]" /> }
);

type PlanTabProps = {
  data: SettingsData;
  update: (next: SettingsData) => void;
  messageWallet: MessageCreditWalletRow | null;
  creditRefilling: string | null;
  startCreditRefill: (packId: string) => Promise<void>;
  creditLedger: MessageCreditLedgerView[];
  creditTopups: MessageCreditTopupView[];
  billingInvoiceList: InvoiceListHook<BillingInvoiceListRow, BillingInvoiceListFilters>;
  showFlash: (message: string, ms?: number) => void;
};

export default function PlanTab({ data, update, messageWallet, creditRefilling, startCreditRefill, creditLedger, creditTopups, billingInvoiceList, showFlash }: PlanTabProps) {
  const current = PLANS.find(p => p.id === data.plan) || PLANS[1];
        const walletSummary = buildWalletSummary(messageWallet);
        const planAvailableCredits = walletSummary.availableCredits;
        return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead title="Current plan" />
            <div className="bg-teal-soft border border-teal-soft-2 rounded-xl p-[20px_22px] flex justify-between items-center gap-6 max-[720px]:flex-col max-[720px]:items-start">
              <div className="flex-1 min-w-0">
                <Badge tone="confirmed" showDot={false} style={{ marginBottom: 8, padding: "4px 10px" }}>
                  {current.name.toUpperCase()} PLAN · ACTIVE
                </Badge>
                <div className="text-[32px] font-semibold tracking-[-0.025em] text-teal-ink">
                  ₹{current.price.toLocaleString("en-IN")}<span className="text-sm font-normal text-ink-3"> / month</span>
                </div>
                <div className="text-[13px] text-ink-2 mt-1">{current.desc} · Next charge on 1 June 2026</div>
              </div>
              <div className="flex flex-col gap-2 items-end max-[720px]:flex-row max-[720px]:self-stretch">
                <button className="btn btn-outline btn-sm" onClick={() => showFlash("Plan management is a mockup")}>Manage payment</button>
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--rose)" }} onClick={() => showFlash("Plan cancellation is a mockup")}>Cancel plan</button>
              </div>
            </div>

            <SectionHead title="WhatsApp credits" desc="ChairBook pays Meta; salons use prepaid ChairBook credits." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Included monthly</div>
                  <div className="text-xl font-semibold font-mono mt-1">{current.whatsappCredits.toLocaleString("en-IN")}</div>
                  <div className="text-xs text-ink-3 mt-1">Resets every billing period.</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Available now</div>
                  <div className="text-xl font-semibold font-mono mt-1">{planAvailableCredits.toLocaleString("en-IN")}</div>
                  <div className="text-xs text-ink-3 mt-1">Plan plus refill credits.</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Reserved</div>
                  <div className="text-xl font-semibold font-mono mt-1">{walletSummary.reservedCredits.toLocaleString("en-IN")}</div>
                  <div className="text-xs text-ink-3 mt-1">Held while sends are in progress.</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Refill rollover</div>
                  <div className="text-xl font-semibold font-mono mt-1">{walletSummary.refillCredits.toLocaleString("en-IN")}</div>
                  <div className="text-xs text-ink-3 mt-1">Unused refill credits stay available.</div>
                </div>
              </div>
            </div>

            <SectionHead title="Refill packs" desc="Razorpay payment credits the wallet after webhook confirmation." />
            <div className="grid grid-cols-3 gap-3 max-[720px]:grid-cols-1">
              {Object.values(WHATSAPP_CREDIT_PACKS).map((pack) => (
                <div key={pack.id} className="bg-white border border-line rounded-xl p-4">
                  <div className="text-sm font-semibold">{pack.label}</div>
                  <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
                    ₹{(pack.amountPaise / 100).toLocaleString("en-IN")}<span className="text-xs font-normal text-ink-3"> / {pack.credits.toLocaleString("en-IN")} credits</span>
                  </div>
                  <button className="btn btn-outline btn-sm w-full mt-3" onClick={() => startCreditRefill(pack.id)} disabled={creditRefilling === pack.id}>
                    {creditRefilling === pack.id ? "Opening Razorpay" : "Refill credits"}
                  </button>
                </div>
              ))}
            </div>

            <SectionHead title="Credit usage" />
            <div className="bg-white border border-line rounded-xl p-0">
              {creditLedger.length > 0 ? (
                creditLedger.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-[1fr_auto_auto] gap-3.5 p-[14px_20px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-[1fr_auto]">
                    <div>
                      <div className="text-[13px] font-semibold capitalize">{entry.action.replace("_", " ")}</div>
                      <div className="text-xs text-ink-3 mt-0.5">{entry.created_at ? new Date(entry.created_at).toLocaleString("en-IN") : "Pending"}</div>
                    </div>
                    <div className="text-xs text-ink-3">Plan {entry.plan_credits}</div>
                    <div className="text-xs text-ink-3">Refill {entry.refill_credits}</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: 13, fontStyle: "italic" }}>
                  No WhatsApp credit activity yet.
                </div>
              )}
            </div>

            {creditTopups.length > 0 && (
              <>
                <SectionHead title="Recent refills" />
                <div className="bg-white border border-line rounded-xl p-0">
                  {creditTopups.map((topup) => (
                    <div key={topup.id} className="grid grid-cols-[1fr_auto_auto] gap-3.5 p-[14px_20px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-[1fr_auto]">
                      <div>
                        <div className="text-[13px] font-semibold">{topup.credits.toLocaleString("en-IN")} credits</div>
                        <div className="text-xs text-ink-3 mt-0.5">{topup.razorpay_order_id || "Razorpay order pending"}</div>
                      </div>
                      <Badge tone={topup.status === "paid" ? "green" : topup.status === "failed" ? "rose" : "amber"}>{topup.status}</Badge>
                      <div className="text-sm font-semibold font-mono">₹{(topup.amount_paise / 100).toLocaleString("en-IN")}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <SectionHead title="Change plan" desc="Upgrade or downgrade anytime. Pro-rated to your next bill." />
            <div className="grid grid-cols-3 gap-3 max-[720px]:grid-cols-1">
              {PLANS.map(p => {
                const isCurrent = p.id === data.plan;
                return (
                  <div key={p.id} className={`bg-white border rounded-xl p-4.5 transition-colors duration-150 ${isCurrent ? "border-teal" : "border-line"}`}>
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
                      ₹{p.price.toLocaleString("en-IN")}<span className="text-xs font-normal text-ink-3">/mo</span>
                    </div>
                    <div className="text-xs mt-1 text-ink-2">{p.desc}</div>
                    <button
                      className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ marginTop: 14, width: "100%" }}
                      onClick={() => update({ ...data, plan: p.id })}
                      disabled={isCurrent}
                    >
                      {isCurrent ? "Current plan" : "Switch to " + p.name}
                    </button>
                  </div>
                );
              })}
            </div>

            <SectionHead title="Billing history" />
            <BillingInvoiceHistory list={billingInvoiceList} onReceipt={() => showFlash("Downloading receipt...")} />
          </div>
        );

}
