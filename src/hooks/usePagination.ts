"use client";

import { useCallback, useMemo, useState } from "react";

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  loading: boolean;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setTotal: (total: number) => void;
  setLoading: (loading: boolean) => void;
  resetPage: () => void;
  nextPage: () => void;
  prevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function paginationRange(page: number, pageSize: number): { from: number; to: number } {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safePageSize = Math.max(1, Math.floor(pageSize) || 1);
  const from = (safePage - 1) * safePageSize;

  return {
    from,
    to: from + safePageSize - 1,
  };
}

export function getPaginationPageCount(total: number, pageSize: number): number {
  const safeTotal = Math.max(0, Math.floor(total) || 0);
  const safePageSize = Math.max(1, Math.floor(pageSize) || 1);

  return Math.max(1, Math.ceil(safeTotal / safePageSize));
}

export function clampPaginationPage(page: number, pageCount: number): number {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safePageCount = Math.max(1, Math.floor(pageCount) || 1);

  return Math.min(safePageCount, safePage);
}

export function usePagination(initialPageSize: number): PaginationState {
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(() => Math.max(1, Math.floor(initialPageSize) || 1));
  const [total, setTotalState] = useState(0);
  const [loading, setLoading] = useState(false);

  const pageCount = useMemo(() => getPaginationPageCount(total, pageSize), [pageSize, total]);
  const safePage = clampPaginationPage(page, pageCount);
  const hasPrevPage = safePage > 1;
  const hasNextPage = safePage < pageCount;

  const setPage = useCallback((nextPage: number) => {
    setPageState(clampPaginationPage(nextPage, pageCount));
  }, [pageCount]);

  const setPageSize = useCallback((nextPageSize: number) => {
    setPageSizeState(Math.max(1, Math.floor(nextPageSize) || 1));
    setPageState(1);
  }, []);

  const setTotal = useCallback((nextTotal: number) => {
    setTotalState(Math.max(0, Math.floor(nextTotal) || 0));
  }, []);

  const resetPage = useCallback(() => {
    setPageState(1);
  }, []);

  const nextPage = useCallback(() => {
    setPageState((current) => Math.min(pageCount, clampPaginationPage(current, pageCount) + 1));
  }, [pageCount]);

  const prevPage = useCallback(() => {
    setPageState((current) => Math.max(1, current - 1));
  }, []);

  return {
    page: safePage,
    pageSize,
    total,
    pageCount,
    loading,
    setPage,
    setPageSize,
    setTotal,
    setLoading,
    resetPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  };
}
