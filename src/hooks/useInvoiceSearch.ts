"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_BILLING_INVOICE_FILTERS,
  DEFAULT_GST_INVOICE_FILTERS,
  buildInvoiceSearchParams,
  normalizeInvoiceSearchInput,
} from "@/lib/invoices";
import type {
  BillingInvoiceListFilters,
  BillingInvoiceListRow,
  GstInvoiceListFilters,
  GstInvoiceListRow,
  InvoiceListFilters,
  PaginatedInvoiceResponse,
} from "@/types/invoice";

export type InvoiceListHook<T, F extends InvoiceListFilters> = {
  rows: T[];
  filters: F;
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  loading: boolean;
  error: string | null;
  hasActiveFilters: boolean;
  updateFilters: (patch: Partial<F>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  refresh: () => void;
};

export function useBillingInvoices(enabled: boolean): InvoiceListHook<BillingInvoiceListRow, BillingInvoiceListFilters> {
  return useInvoiceList("/api/invoices/billing", DEFAULT_BILLING_INVOICE_FILTERS, enabled);
}

export function useGstInvoices(enabled: boolean): InvoiceListHook<GstInvoiceListRow, GstInvoiceListFilters> {
  return useInvoiceList("/api/invoices/gst", DEFAULT_GST_INVOICE_FILTERS, enabled);
}

function useInvoiceList<T, F extends InvoiceListFilters>(
  endpoint: string,
  initialFilters: F,
  enabled: boolean,
): InvoiceListHook<T, F> {
  const [rows, setRows] = useState<T[]>([]);
  const [filters, setFilters] = useState<F>(initialFilters);
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const debouncedQ = useDebouncedValue(filters.q, 300);

  const requestFilters = useMemo(() => ({
    ...filters,
    q: debouncedQ,
  }), [debouncedQ, filters]);

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      filters.q.trim()
      || filters.from
      || filters.to
      || filters.paymentMethod !== initialFilters.paymentMethod
      || filters.sort !== initialFilters.sort
      || ("whatsappStatus" in filters && "whatsappStatus" in initialFilters && filters.whatsappStatus !== initialFilters.whatsappStatus)
    );
  }, [filters, initialFilters]);

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => {
        setRows([]);
        setTotal(0);
        setPageCount(1);
        setLoading(false);
        setError(null);
      });
      return;
    }

    const controller = new AbortController();

    async function loadInvoices() {
      setLoading(true);
      setError(null);

      try {
        const params = buildInvoiceSearchParams(requestFilters, page);
        const response = await fetch(`${endpoint}?${params.toString()}`, {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });

        const body = await response.json().catch(() => null) as PaginatedInvoiceResponse<T> & { error?: string } | null;
        if (!response.ok) {
          throw new Error(body?.error || "Could not load invoices.");
        }

        setRows(Array.isArray(body?.rows) ? body.rows : []);
        setTotal(Number(body?.total || 0));
        setPageSize(Number(body?.pageSize || 10));
        setPageCount(Math.max(1, Number(body?.pageCount || 1)));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setRows([]);
        setTotal(0);
        setPageCount(1);
        setError(err instanceof Error ? err.message : "Could not load invoices.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadInvoices();

    return () => controller.abort();
  }, [enabled, endpoint, page, refreshKey, requestFilters]);

  const updateFilters = useCallback((patch: Partial<F>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      q: patch.q !== undefined ? normalizeInvoiceSearchInput(String(patch.q)) : current.q,
    }));
    setPageState(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setPageState(1);
  }, [initialFilters]);

  const setPage = useCallback((nextPage: number) => {
    setPageState(Math.max(1, Math.min(pageCount, Math.floor(nextPage) || 1)));
  }, [pageCount]);

  const nextPage = useCallback(() => {
    setPageState((current) => Math.min(pageCount, current + 1));
  }, [pageCount]);

  const prevPage = useCallback(() => {
    setPageState((current) => Math.max(1, current - 1));
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  return {
    rows,
    filters,
    page,
    pageSize,
    total,
    pageCount,
    loading,
    error,
    hasActiveFilters,
    updateFilters,
    resetFilters,
    setPage,
    nextPage,
    prevPage,
    refresh,
  };
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}
