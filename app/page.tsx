"use client";

import { useState } from "react";
import type { WatchlistItem } from "@/types";
import { IndexBar } from "@/components/IndexBar";
import { Watchlist } from "@/components/Watchlist";
import { StockDetail } from "@/components/StockDetail";
import { TenDayTable } from "@/components/TenDayTable";
import { FundamentalCard } from "@/components/FundamentalCard";

export default function Dashboard() {
  const [selected, setSelected] = useState<WatchlistItem | null>(null);

  return (
    <div className="flex h-screen min-h-screen w-full flex-col">
      <IndexBar />
      <div className="flex flex-1 overflow-hidden">
        <Watchlist
          selected={selected ? { symbol: selected.symbol, market: selected.market } : null}
          onSelect={setSelected}
        />
        <main className="flex-1 overflow-auto">
          <StockDetail item={selected} />
        </main>
        <aside className="flex w-[26rem] shrink-0 flex-col overflow-auto border-l border-border bg-card">
          <TenDayTable item={selected} />
          <FundamentalCard item={selected} />
        </aside>
      </div>
      <div className="flex h-6 items-center justify-between border-t border-border bg-card px-4 text-[10px] text-muted-foreground">
        <span>StockView Personal · Phase 0 殼</span>
        <span>1024px 以下請改用桌機</span>
      </div>
    </div>
  );
}
