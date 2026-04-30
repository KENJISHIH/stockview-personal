"use client";

import useSWR from "swr";
import type { Quote, WatchlistItem } from "@/types";
import { fetcher, SWR_OPTS } from "@/lib/swr";
import { changeColorClass, formatChange, formatPercent, formatPrice } from "@/lib/format";
import { LightweightChart } from "@/components/LightweightChart";
import { Button } from "@/components/ui/button";
import { useSectors } from "@/lib/use-sectors";

interface Props {
  item: WatchlistItem | null;
  onOpenPeerCompare: (args?: { groupId?: string; stock?: WatchlistItem }) => void;
}

export function StockDetail({ item, onOpenPeerCompare }: Props) {
  const sectors = useSectors();
  const url = item ? `/api/quote/${item.market}/${encodeURIComponent(item.symbol)}` : null;
  const { data } = useSWR<{ quote: Quote }>(url, fetcher, SWR_OPTS);
  const quote = data?.quote;

  if (!item) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        從左側觀察名單選擇一檔股票
      </div>
    );
  }

  const colorCls = changeColorClass(quote?.change);
  const exchangeLabel =
    item.market === "TW" ? "TWSE/TPEX" : item.market === "JP" ? "TSE 東京證交所" : "US";

  const memberGroups = sectors.filter((g) =>
    g.members.some((m) => m.symbol === item.symbol && m.market === item.market)
  );

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">
            {item.symbol} · {exchangeLabel}
          </div>
          <div className="text-3xl font-semibold">{item.name}</div>
          {memberGroups.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1 text-xs">
              {memberGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onOpenPeerCompare({ groupId: g.id })}
                  className="rounded bg-muted px-1.5 py-0.5 hover:bg-muted/70"
                >
                  📊 {g.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenPeerCompare({ stock: item })}
        >
          📊 同業比價
        </Button>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-5xl font-semibold tabular-nums">
          {quote ? formatPrice(quote.price, item.market) : "—"}
        </span>
        <span className={`font-mono text-xl ${colorCls}`}>
          {quote ? formatChange(quote.change) : "—"}
        </span>
        <span className={`font-mono text-xl ${colorCls}`}>
          {quote ? `(${formatPercent(quote.changePct)})` : ""}
        </span>
      </div>
      {quote && (
        <div className="grid grid-cols-3 gap-4 rounded border border-border p-3 text-sm sm:grid-cols-6">
          <Field label="開盤" value={formatPrice(quote.open, item.market)} />
          <Field label="最高" value={formatPrice(quote.high, item.market)} />
          <Field label="最低" value={formatPrice(quote.low, item.market)} />
          <Field
            label="成交量"
            value={quote.volume ? quote.volume.toLocaleString("en-US") : "—"}
          />
          <Field
            label="市值"
            value={quote.marketCap ? formatMarketCap(quote.marketCap, item.market) : "—"}
          />
          <Field
            label="更新"
            value={new Date(quote.updatedAt).toLocaleTimeString("zh-TW", { hour12: false })}
          />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
        <LightweightChart
          key={`${item.market}:${item.symbol}`}
          symbol={item.symbol}
          market={item.market}
        />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}

function formatMarketCap(value: number, market: WatchlistItem["market"]): string {
  if (market === "TW") {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}兆`;
    if (value >= 1e8) return `${(value / 1e8).toFixed(2)}億`;
    return value.toLocaleString("zh-TW");
  }
  if (market === "JP") {
    if (value >= 1e12) return `¥${(value / 1e12).toFixed(2)}兆`;
    if (value >= 1e8) return `¥${(value / 1e8).toFixed(2)}億`;
    return `¥${value.toLocaleString("ja-JP")}`;
  }
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString("en-US")}`;
}
