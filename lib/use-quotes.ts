"use client";

import useSWR from "swr";
import type { Quote, WatchlistItem } from "@/types";
import { fetcher, SWR_OPTS } from "./swr";

interface BatchResponse {
  quotes: Quote[];
  updatedAt: string;
}

export function useBatchQuotes(items: WatchlistItem[]): {
  byKey: Map<string, Quote>;
  isLoading: boolean;
  error: unknown;
  updatedAt: string | undefined;
} {
  const itemsParam = items
    .map((it) => `${it.symbol}:${it.market}`)
    .sort()
    .join(",");
  const url = items.length > 0 ? `/api/quote/batch?items=${encodeURIComponent(itemsParam)}` : null;

  const { data, error, isLoading } = useSWR<BatchResponse>(url, fetcher, SWR_OPTS);

  const byKey = new Map<string, Quote>();
  for (const q of data?.quotes ?? []) {
    byKey.set(`${q.market}:${q.symbol}`, q);
  }

  return { byKey, isLoading, error, updatedAt: data?.updatedAt };
}

export function quoteKey(symbol: string, market: WatchlistItem["market"]): string {
  return `${market}:${symbol}`;
}
