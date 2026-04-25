"use client";

import type { WatchlistItem } from "@/types";

interface Props {
  item: WatchlistItem | null;
}

export function StockDetail({ item }: Props) {
  if (!item) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        從左側觀察名單選擇一檔股票
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <div className="text-sm text-muted-foreground">
          {item.symbol} · {item.market === "TW" ? "TWSE/TPEX" : "US"}
        </div>
        <div className="text-3xl font-semibold">{item.name}</div>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-5xl font-semibold text-muted-foreground">—</span>
        <span className="text-base text-muted-foreground">待 Phase 1 接資料</span>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        TradingView Advanced Chart Widget（Phase 3 嵌入）
      </div>
    </div>
  );
}
