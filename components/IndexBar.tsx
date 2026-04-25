"use client";

import useSWR from "swr";
import type { IndexQuote, WatchlistItem } from "@/types";
import { fetcher, SWR_OPTS } from "@/lib/swr";
import { formatPrice, formatPercent } from "@/lib/format";
import { SearchBox } from "@/components/SearchBox";

function colorClass(value: number): string {
  if (!value) return "text-muted-foreground";
  return value > 0 ? "text-red-500" : "text-green-500";
}

interface IndexBarProps {
  onSearchPick: (item: WatchlistItem) => void;
}

export function IndexBar({ onSearchPick }: IndexBarProps) {
  const { data, error, isLoading } = useSWR<{ indexes: IndexQuote[]; updatedAt: string }>(
    "/api/index/global",
    fetcher,
    SWR_OPTS
  );

  const indexes = data?.indexes ?? [];

  return (
    <div className="flex h-14 items-center gap-2 overflow-x-auto border-b border-border bg-card px-4 text-xs">
      <SearchBox onPick={onSearchPick} />
      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
        {isLoading && indexes.length === 0 && (
          <span className="text-muted-foreground">載入指數中…</span>
        )}
        {error && <span className="text-red-500">指數讀取失敗</span>}
        {indexes.map((idx) => (
          <div
            key={idx.symbol}
            className="flex shrink-0 items-baseline gap-2 rounded px-3 py-2 hover:bg-muted/50"
          >
            <span className="text-muted-foreground">{idx.name}</span>
            <span className="font-mono font-medium">{formatPrice(idx.price, "US")}</span>
            <span className={`font-mono ${colorClass(idx.change)}`}>
              {formatPercent(idx.changePct)}
            </span>
          </div>
        ))}
      </div>
      <div className="ml-auto shrink-0 text-muted-foreground">
        {data?.updatedAt && (
          <span className="rounded bg-muted px-2 py-1">
            更新 {new Date(data.updatedAt).toLocaleTimeString("zh-TW", { hour12: false })}
          </span>
        )}
      </div>
    </div>
  );
}
