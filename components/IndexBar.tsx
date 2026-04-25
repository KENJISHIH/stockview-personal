"use client";

import type { IndexQuote } from "@/types";
import { formatPrice, formatPercent } from "@/lib/format";

const PLACEHOLDER: IndexQuote[] = [
  { symbol: "TAIEX", name: "加權指數", price: 38932.4, change: 1218.25, changePct: 3.23 },
  { symbol: "OTC", name: "櫃買指數", price: 247.38, change: -0.01, changePct: -0.0 },
  { symbol: "^GSPC", name: "S&P 500", price: 6344, change: -25.13, changePct: -0.39 },
  { symbol: "^IXIC", name: "納斯達克", price: 20795, change: -153.72, changePct: -0.73 },
  { symbol: "^DJI", name: "道瓊", price: 45216, change: 49.5, changePct: 0.11 },
  { symbol: "^SOX", name: "費城半導體", price: 7142, change: -315.34, changePct: -4.23 },
  { symbol: "^VIX", name: "VIX 恐慌", price: 28.14, change: -2.47, changePct: -8.07 },
  { symbol: "DX-Y.NYB", name: "美元指數", price: 104.32, change: -0.1, changePct: -0.1 },
];

function colorClass(value: number, isIndex: boolean): string {
  if (value === 0) return "text-muted-foreground";
  // 指數依美股慣例：綠漲紅跌；台股指數紅漲綠跌
  const isTwIndex = isIndex;
  const isUp = value > 0;
  if (isTwIndex) return isUp ? "text-red-500" : "text-green-500";
  return isUp ? "text-green-500" : "text-red-500";
}

export function IndexBar() {
  return (
    <div className="flex h-14 items-center gap-1 overflow-x-auto border-b border-border bg-card px-4 text-xs">
      {PLACEHOLDER.map((idx) => {
        const isTwIndex = idx.symbol === "TAIEX" || idx.symbol === "OTC";
        return (
          <div
            key={idx.symbol}
            className="flex shrink-0 items-baseline gap-2 rounded px-3 py-2 hover:bg-muted/50"
          >
            <span className="text-muted-foreground">{idx.name}</span>
            <span className="font-mono font-medium">{formatPrice(idx.price, "US")}</span>
            <span className={`font-mono ${colorClass(idx.change, isTwIndex)}`}>
              {formatPercent(idx.changePct)}
            </span>
          </div>
        );
      })}
      <div className="ml-auto shrink-0 text-muted-foreground">
        <span className="rounded bg-muted px-2 py-1">模擬資料 · Phase 0</span>
      </div>
    </div>
  );
}
