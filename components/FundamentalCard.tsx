"use client";

import type { WatchlistItem } from "@/types";

interface Props {
  item: WatchlistItem | null;
}

const FIELDS: { label: string; key: string }[] = [
  { label: "本益比 PE", key: "pe" },
  { label: "預估 PE", key: "forwardPe" },
  { label: "市淨率 PB", key: "pb" },
  { label: "ROE", key: "roe" },
  { label: "EPS", key: "eps" },
  { label: "殖利率", key: "dividendYield" },
  { label: "毛利率", key: "grossMargin" },
  { label: "營收年增", key: "revenueYoy" },
  { label: "Beta", key: "beta" },
];

export function FundamentalCard({ item }: Props) {
  return (
    <div className="flex flex-col gap-2 border-t border-border p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">基本面</h3>
        {item && (
          <span className="text-xs text-muted-foreground">
            {item.symbol} · {item.name}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <span className="font-mono text-muted-foreground">—</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Phase 4 接 FinMind / Yahoo</p>
    </div>
  );
}
