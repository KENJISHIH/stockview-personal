"use client";

import { useState } from "react";
import type { Quote, WatchlistItem } from "@/types";
import { useWatchlist, notifyWatchlistChanged } from "@/lib/use-watchlist";
import { useBatchQuotes, quoteKey } from "@/lib/use-quotes";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { changeColorClass, formatPercent, formatPrice } from "@/lib/format";
import { moveItem, removeFromWatchlist } from "@/lib/storage";
import { AddStockDialog } from "@/components/AddStockDialog";

interface Props {
  selected: { symbol: string; market: WatchlistItem["market"] } | null;
  onSelect: (item: WatchlistItem) => void;
}

export function Watchlist({ selected, onSelect }: Props) {
  const items = useWatchlist();
  const { byKey, isLoading } = useBatchQuotes(items);
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const tw = items.filter((x) => x.market === "TW");
  const jp = items.filter((x) => x.market === "JP");
  const us = items.filter((x) => x.market === "US");

  function handleRemove(item: WatchlistItem) {
    removeFromWatchlist(item.symbol, item.market);
    notifyWatchlistChanged();
  }

  function handleMove(item: WatchlistItem, direction: "up" | "down") {
    moveItem(item.symbol, item.market, direction);
    notifyWatchlistChanged();
  }

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
          {tw.map((item, i) => (
            <Row
              key={`${item.market}-${item.symbol}`}
              item={item}
              quote={byKey.get(quoteKey(item.symbol, item.market))}
              selected={selected?.symbol === item.symbol && selected?.market === item.market}
              editing={editing}
              isFirst={i === 0}
              isLast={i === tw.length - 1}
              onSelect={onSelect}
              onRemove={handleRemove}
              onMove={handleMove}
            />
          ))}
          {jp.length > 0 && (
            <>
              <div className="mt-3 px-2 py-1 text-xs font-medium text-muted-foreground">日股</div>
              {jp.map((item, i) => (
                <Row
                  key={`${item.market}-${item.symbol}`}
                  item={item}
                  quote={byKey.get(quoteKey(item.symbol, item.market))}
                  selected={selected?.symbol === item.symbol && selected?.market === item.market}
                  editing={editing}
                  isFirst={i === 0}
                  isLast={i === jp.length - 1}
                  onSelect={onSelect}
                  onRemove={handleRemove}
                  onMove={handleMove}
                />
              ))}
            </>
          )}
          <div className="mt-3 px-2 py-1 text-xs font-medium text-muted-foreground">美股</div>
          {us.map((item, i) => (
            <Row
              key={`${item.market}-${item.symbol}`}
              item={item}
              quote={byKey.get(quoteKey(item.symbol, item.market))}
              selected={selected?.symbol === item.symbol && selected?.market === item.market}
              editing={editing}
              isFirst={i === 0}
              isLast={i === us.length - 1}
              onSelect={onSelect}
              onRemove={handleRemove}
              onMove={handleMove}
            />
          ))}
        </div>
      </div>
      <Separator />
      <div className="flex gap-2 p-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => setAddOpen(true)}
        >
          + 新增
        </Button>
        <Button
          variant={editing ? "secondary" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "✓ 完成" : "⚙ 編輯"}
        </Button>
      </div>
      <AddStockDialog open={addOpen} onOpenChange={setAddOpen} />
    </aside>
  );
}

function Row({
  item,
  quote,
  selected,
  editing,
  isFirst,
  isLast,
  onSelect,
  onRemove,
  onMove,
}: {
  item: WatchlistItem;
  quote: Quote | undefined;
  selected: boolean;
  editing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: (item: WatchlistItem) => void;
  onRemove: (item: WatchlistItem) => void;
  onMove: (item: WatchlistItem, direction: "up" | "down") => void;
}) {
  const colorCls = changeColorClass(quote?.change);

  if (editing) {
    return (
      <div
        className={`flex w-full items-center gap-1 rounded px-2 py-1.5 text-sm ${
          selected ? "bg-muted" : "hover:bg-muted/30"
        }`}
      >
        <button
          type="button"
          className="rounded px-1 text-xs text-red-500 hover:bg-red-500/10 disabled:opacity-30"
          onClick={() => onRemove(item)}
          aria-label="刪除"
        >
          ✕
        </button>
        <button
          type="button"
          className="rounded px-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-30"
          onClick={() => onMove(item, "up")}
          disabled={isFirst}
          aria-label="上移"
        >
          ▲
        </button>
        <button
          type="button"
          className="rounded px-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-30"
          onClick={() => onMove(item, "down")}
          disabled={isLast}
          aria-label="下移"
        >
          ▼
        </button>
        <div className="ml-1 flex flex-1 flex-col">
          <span className="font-medium">{item.name}</span>
          <span className="text-xs text-muted-foreground">{item.symbol}</span>
        </div>
      </div>
    );
  }

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
