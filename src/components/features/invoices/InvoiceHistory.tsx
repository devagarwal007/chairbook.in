"use client";

import { Badge, Icons as I } from "@/components/ui";
import type { InvoiceListHook } from "@/hooks/useInvoiceSearch";
import {
  GST_DELIVERY_STATUS_FILTERS,
  INVOICE_PAYMENT_FILTERS,
  INVOICE_SORT_OPTIONS,
  formatInvoiceAmount,
  formatInvoiceDate,
} from "@/lib/invoices";
import type {
  BillingInvoiceListFilters,
  BillingInvoiceListRow,
  GstInvoiceListFilters,
  GstInvoiceListRow,
  GstInvoiceStatusFilter,
  InvoiceListFilters,
  InvoicePaymentMethodFilter,
  InvoiceSort,
} from "@/types/invoice";
import type { BadgeTone } from "@/components/ui/Badge";

type BillingInvoiceHistoryProps = {
  list: InvoiceListHook<BillingInvoiceListRow, BillingInvoiceListFilters>;
  onReceipt: () => void;
};

type GstInvoiceHistoryProps = {
  list: InvoiceListHook<GstInvoiceListRow, GstInvoiceListFilters>;
};

export function BillingInvoiceHistory({ list, onReceipt }: BillingInvoiceHistoryProps) {
  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <InvoiceControls list={list} searchPlaceholder="Search plan or payment..." />
      <InvoiceResultBar list={list} label="billing invoice" />
      <div className="flex flex-col border border-line rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1.2fr_1.4fr_1fr_auto] gap-2 p-[12px_16px] bg-bg border-b border-line text-[10px] font-semibold tracking-[0.04em] uppercase text-ink-3 max-[720px]:hidden">
          <div>Date</div>
          <div>Plan</div>
          <div>Amount</div>
          <div className="text-right">Actions</div>
        </div>
        {list.loading ? (
          <InvoiceSkeleton columns="grid-cols-[1.2fr_1.4fr_1fr_auto]" />
        ) : list.rows.length > 0 ? (
          list.rows.map((invoice) => (
            <div key={invoice.id} className="grid grid-cols-[1.2fr_1.4fr_1fr_auto] gap-2 p-[14px_16px] items-center border-b border-line last:border-b-0 text-sm max-[720px]:grid-cols-2 max-[720px]:gap-y-2">
              <div>
                <div className="font-semibold font-mono text-ink">{formatInvoiceDate(invoice.date)}</div>
                <div className="hidden max-[720px]:block text-xs text-ink-3 mt-0.5">{invoice.payment_method}</div>
              </div>
              <div>
                <div className="font-medium text-ink-2">{invoice.plan_name}</div>
                <div className="text-xs text-ink-3 mt-0.5 max-[720px]:hidden">{invoice.payment_method}</div>
              </div>
              <div className="font-semibold font-mono text-ink">{formatInvoiceAmount(invoice.amount)}</div>
              <div className="flex justify-end max-[720px]:col-span-2">
                <button className="btn btn-ghost btn-xs text-teal font-medium flex items-center gap-1.5 px-2 py-1 rounded" onClick={onReceipt}>
                  <I.download width={14} height={14} /> Receipt
                </button>
              </div>
            </div>
          ))
        ) : (
          <InvoiceEmptyState
            hasActiveFilters={list.hasActiveFilters}
            emptyText="No billing history available."
            filteredText="No billing invoices match these filters."
          />
        )}
      </div>
      <InvoicePagination list={list} />
    </div>
  );
}

export function GstInvoiceHistory({ list }: GstInvoiceHistoryProps) {
  return (
    <div className="bg-white border border-line rounded-xl p-[20px_22px] mt-2">
      <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mb-3">Invoice history</div>
      <InvoiceControls list={list} searchPlaceholder="Search invoice, customer, or phone..." includeWhatsappStatus />
      <InvoiceResultBar list={list} label="GST invoice" />
      <div className="flex flex-col border border-line rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1.25fr_1.25fr_0.9fr_0.9fr_0.9fr_auto] gap-2 p-[12px_16px] bg-bg border-b border-line text-[10px] font-semibold tracking-[0.04em] uppercase text-ink-3 max-[820px]:hidden">
          <div>Invoice Number</div>
          <div>Customer</div>
          <div>Date</div>
          <div>Amount</div>
          <div>Delivery</div>
          <div className="text-right">Actions</div>
        </div>
        {list.loading ? (
          <InvoiceSkeleton columns="grid-cols-[1.25fr_1.25fr_0.9fr_0.9fr_0.9fr_auto]" />
        ) : list.rows.length > 0 ? (
          list.rows.map((invoice) => (
            <div key={invoice.id} className="grid grid-cols-[1.25fr_1.25fr_0.9fr_0.9fr_0.9fr_auto] gap-2 p-[14px_16px] items-center border-b border-line last:border-b-0 text-sm max-[820px]:grid-cols-2 max-[820px]:gap-y-2">
              <div>
                <div className="font-semibold text-ink">{invoice.invoice_number}</div>
                <div className="hidden max-[820px]:block text-xs text-ink-3 mt-0.5">{formatInvoiceDate(invoice.invoice_date)}</div>
              </div>
              <div>
                <div className="font-medium text-ink-2">{invoice.customer_name}</div>
                {invoice.customer_phone && <div className="text-xs text-ink-3">{invoice.customer_phone}</div>}
              </div>
              <div className="text-ink-2 max-[820px]:hidden">{formatInvoiceDate(invoice.invoice_date)}</div>
              <div>
                <div className="font-semibold font-mono text-ink">{formatInvoiceAmount(invoice.total_amount)}</div>
                {invoice.payment_method && <div className="hidden max-[820px]:block text-xs text-ink-3 mt-0.5">{invoice.payment_method}</div>}
              </div>
              <div className="max-[820px]:col-span-2">
                <Badge tone={statusTone(invoice.whatsapp_delivery_status)} showDot={false}>
                  {statusLabel(invoice.whatsapp_delivery_status)}
                </Badge>
              </div>
              <div className="flex gap-2 justify-end max-[820px]:col-span-2">
                <a
                  href={`/api/invoice/${invoice.share_token}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-xs text-teal font-medium flex items-center gap-1.5 px-2 py-1 rounded"
                  style={{ textDecoration: "none" }}
                >
                  <I.download width={14} height={14} /> PDF
                </a>
              </div>
            </div>
          ))
        ) : (
          <InvoiceEmptyState
            hasActiveFilters={list.hasActiveFilters}
            emptyText="No invoices generated yet. Invoices are generated automatically on payment checkout."
            filteredText="No GST invoices match these filters."
          />
        )}
      </div>
      <InvoicePagination list={list} />
    </div>
  );
}

function InvoiceControls<T, F extends InvoiceListFilters>({
  list,
  searchPlaceholder,
  includeWhatsappStatus = false,
}: {
  list: InvoiceListHook<T, F>;
  searchPlaceholder: string;
  includeWhatsappStatus?: boolean;
}) {
  const whatsappStatusValue = "whatsappStatus" in list.filters
    ? String(list.filters.whatsappStatus)
    : "all";

  return (
    <div className="flex flex-col gap-2.5 mb-3.5">
      <div className="flex items-center gap-2.5 bg-white border border-line rounded-[12px] px-3.5 h-11 transition-colors duration-150 focus-within:border-teal">
        <I.search width={16} height={16} className="text-ink-3 shrink-0" />
        <input
          value={list.filters.q}
          onChange={(event) => list.updateFilters({ q: event.target.value } as Partial<F>)}
          placeholder={searchPlaceholder}
          className="flex-1 h-full min-w-0 border-0 outline-0 text-[13px] text-ink placeholder:text-ink-4 font-sans"
        />
        {list.filters.q && (
          <button className="border-0 bg-transparent cursor-pointer grid place-items-center text-ink-3" onClick={() => list.updateFilters({ q: "" } as Partial<F>)} aria-label="Clear invoice search">
            <I.x width={14} height={14} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-[repeat(5,minmax(0,1fr))_auto] gap-2 max-[920px]:grid-cols-2 max-[520px]:grid-cols-1">
        <input
          type="date"
          value={list.filters.from}
          onChange={(event) => list.updateFilters({ from: event.target.value } as Partial<F>)}
          aria-label="Invoice start date"
          className="h-10 rounded-lg border border-line bg-white px-3 text-[13px] text-ink outline-0 focus:border-teal"
        />
        <input
          type="date"
          value={list.filters.to}
          onChange={(event) => list.updateFilters({ to: event.target.value } as Partial<F>)}
          aria-label="Invoice end date"
          className="h-10 rounded-lg border border-line bg-white px-3 text-[13px] text-ink outline-0 focus:border-teal"
        />
        <select
          value={list.filters.paymentMethod}
          onChange={(event) => list.updateFilters({ paymentMethod: event.target.value as InvoicePaymentMethodFilter } as Partial<F>)}
          aria-label="Invoice payment method"
          className="h-10 rounded-lg border border-line bg-white px-3 text-[13px] text-ink outline-0 focus:border-teal"
        >
          {INVOICE_PAYMENT_FILTERS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        {includeWhatsappStatus ? (
          <select
            value={whatsappStatusValue}
            onChange={(event) => list.updateFilters({ whatsappStatus: event.target.value as GstInvoiceStatusFilter } as unknown as Partial<F>)}
            aria-label="GST invoice WhatsApp delivery"
            className="h-10 rounded-lg border border-line bg-white px-3 text-[13px] text-ink outline-0 focus:border-teal"
          >
            {GST_DELIVERY_STATUS_FILTERS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        ) : (
          <div className="max-[920px]:hidden" />
        )}
        <select
          value={list.filters.sort}
          onChange={(event) => list.updateFilters({ sort: event.target.value as InvoiceSort } as Partial<F>)}
          aria-label="Invoice sort"
          className="h-10 rounded-lg border border-line bg-white px-3 text-[13px] text-ink outline-0 focus:border-teal"
        >
          {INVOICE_SORT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        <button
          type="button"
          className="h-10 px-3 rounded-lg border border-line bg-white text-[13px] font-medium text-ink-2 cursor-pointer hover:border-ink-3 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={list.resetFilters}
          disabled={!list.hasActiveFilters}
        >
          Reset
        </button>
      </div>
      {list.error && <div className="text-xs text-rose">{list.error}</div>}
    </div>
  );
}

function InvoiceResultBar<T, F extends InvoiceListFilters>({
  list,
  label,
}: {
  list: InvoiceListHook<T, F>;
  label: string;
}) {
  const plural = list.total === 1 ? label : `${label}s`;
  return (
    <div className="flex items-center justify-between gap-3 px-1 pb-2.5 text-[13px] text-ink font-medium max-[720px]:flex-col max-[720px]:items-start">
      <div>
        {list.total} {plural}
        {list.filters.q && <span className="text-ink-3 font-normal"> matching &quot;{list.filters.q}&quot;</span>}
      </div>
      {list.loading && <span className="text-xs text-ink-3">Loading...</span>}
    </div>
  );
}

function InvoicePagination<T, F extends InvoiceListFilters>({ list }: { list: InvoiceListHook<T, F> }) {
  const first = list.total === 0 ? 0 : (list.page - 1) * list.pageSize + 1;
  const last = list.total === 0 ? 0 : Math.min(list.total, list.page * list.pageSize);

  return (
    <div className="flex items-center justify-between gap-3 pt-3 text-xs text-ink-3 max-[520px]:flex-col max-[520px]:items-stretch">
      <div>
        {list.total > 0 ? `${first}-${last} of ${list.total}` : "0 invoices"}
      </div>
      <div className="flex items-center gap-2 max-[520px]:justify-between">
        <button
          type="button"
          className="h-8 px-2.5 rounded-lg border border-line bg-white text-ink-2 inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={list.prevPage}
          disabled={list.page <= 1 || list.loading}
        >
          <I.chevL width={14} height={14} /> Previous
        </button>
        <span className="font-mono text-ink-2">
          {list.page} / {list.pageCount}
        </span>
        <button
          type="button"
          className="h-8 px-2.5 rounded-lg border border-line bg-white text-ink-2 inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={list.nextPage}
          disabled={list.page >= list.pageCount || list.loading}
        >
          Next <I.chevR width={14} height={14} />
        </button>
      </div>
    </div>
  );
}

function InvoiceSkeleton({ columns }: { columns: string }) {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className={`grid ${columns} gap-2 p-[14px_16px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-2`}>
          {Array.from({ length: 5 }).map((__, cellIndex) => (
            <div key={cellIndex} className="h-4 rounded bg-bg-2 animate-pulse" />
          ))}
        </div>
      ))}
    </>
  );
}

function InvoiceEmptyState({
  hasActiveFilters,
  emptyText,
  filteredText,
}: {
  hasActiveFilters: boolean;
  emptyText: string;
  filteredText: string;
}) {
  return (
    <div className="p-6 text-center text-ink-3 text-[13px] italic">
      {hasActiveFilters ? filteredText : emptyText}
    </div>
  );
}

function statusTone(status: GstInvoiceListRow["whatsapp_delivery_status"]): BadgeTone {
  if (status === "delivered" || status === "sent") return "green";
  if (status === "pending") return "amber";
  if (status === "failed") return "rose";
  return "gray";
}

function statusLabel(status: GstInvoiceListRow["whatsapp_delivery_status"]): string {
  return status.replace("_", " ");
}
