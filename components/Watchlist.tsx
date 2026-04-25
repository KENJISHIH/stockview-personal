"use client";

import type { Quote, WatchlistItem } from "@/types";
import { useWatchlist } from "@/lib/use-watchlist";
import { useBatchQuotes, quoteKey } from "@/lib/use-quotes";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { changeColorClass, formatPercent, formatPrice } from "@/lib/format";

interface Props {
  selected: { symbol: string; market: WatchlistItem["market"] } | null;
  onSelect: (item: WatchlistItem) => void;
}

export function Watchlist({ selected, onSelect }: Props) {
  const items = useWatchlist();
  const { byKey, isLoading } = useBatchQuotes(items);

  const tw = items.filter((x) => x.market === "TW");
  const us = items.filter((x) => x.market === "US");

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold">觀察名單</h2>
        <span className="text-xs text-muted-foreground">
          {items.length} 檔{isLoading && byKey.size === 0 ? " · 載入中" : ""}
        </span>
      </div>
      <Separator />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-2 py-2">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">台股</div>
          {tw.map((item) => (
            <Row
              key={`${item.market}-${item.symbol}`}
              item={item}
              quote={byKey.get(quoteKey(item.symbol, item.market))}
              selected={selected?.symbol === item.symbol && selected?.market === item.market}
              onSelect={onSelect}
            />
          ))}
          <div className="mt-3 px-2 py-1 text-xs font-medium text-muted-foreground">美股</div>
          {us.map((item) => (
            <Row
              key={`${item.market}-${item.symbol}`}
              item={item}
              quote={byKey.get(quoteKey(item.symbol, item.market))}
              selected={selected?.symbol === item.symbol && selected?.market === item.market}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
      <Separator />
      <div className="flex gap-2 p-3">
        <Button variant="outline" size="sm" className="flex-1" disabled>
          + 新增
        </Button>
        <Button variant="outline" size="sm" className="flex-1" disabled>
          ⚙ 編輯
        </Button>
      </div>
    </aside>
  );
}

function Row({
  item,
  quote,
  selected,
  onSelect,
}: {
  item: WatchlistItem;
  quote: Quote | undefined;
  selected: boolean;
  onSelect: (item: WatchlistItem) => void;
}) {
  const colorCls = changeColorClass(quote?.change);

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm transition-colors ${
        selected ? "bg-muted" : "hover:bg-muted/50"
      }`}
    >
      <div className="flex flex-col">
        <span className="font-medium">{item.name}</span>
        <span className="text-xs text-muted-foreground">{item.symbol}</span>
      </div>
      <div className="flex flex-col items-end">
        <span className={`font-mono text-sm ${colorCls}`}>
          {quote ? formatPrice(quote.price, item.market) : "—"}
        </span>
        <span className={`font-mono text-xs ${colorCls}`}>
          {quote ? formatPercent(quote.changePct) : "—"}
        </span>
      </div>
    </button>
  );
}
