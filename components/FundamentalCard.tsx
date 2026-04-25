"use client";

import useSWR from "swr";
import type { Fundamental, WatchlistItem } from "@/types";
import { fetcher } from "@/lib/swr";

interface Props {
  item: WatchlistItem | null;
}

function fmtNumber(v: number | undefined, suffix = "x", decimals = 2): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return `${v.toFixed(decimals)}${suffix}`;
}

function fmtPct(v: number | undefined, decimals = 2): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return `${v.toFixed(decimals)}%`;
}

function fmtEps(v: number | undefined, market: WatchlistItem["market"]): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  if (market === "TW") return `${v.toFixed(2)} 元`;
  if (market === "JP") return `¥${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}

function fmtMarketCap(v: number | undefined, market: WatchlistItem["market"]): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  if (market === "TW") {
    if (v >= 1e12) return `${(v / 1e12).toFixed(2)}兆`;
    if (v >= 1e8) return `${(v / 1e8).toFixed(1)}億`;
    return v.toLocaleString("zh-TW");
  }
  if (market === "JP") {
    if (v >= 1e12) return `¥${(v / 1e12).toFixed(2)}兆`;
    if (v >= 1e8) return `¥${(v / 1e8).toFixed(1)}億`;
    return `¥${v.toLocaleString("ja-JP")}`;
  }
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString("en-US")}`;
}

export function FundamentalCard({ item }: Props) {
  const url = item ? `/api/fundamental/${item.market}/${encodeURIComponent(item.symbol)}` : null;
  const { data, error, isLoading } = useSWR<{ fundamental: Fundamental }>(url, fetcher, {
    refreshInterval: 24 * 60 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 60 * 60 * 1000,
  });
  const f = data?.fundamental;

  const fields: { label: string; value: string }[] = [
    { label: "本益比 PE", value: fmtNumber(f?.pe) },
    { label: "預估 PE", value: fmtNumber(f?.forwardPe) },
    { label: "市淨率 PB", value: fmtNumber(f?.pb) },
    { label: "ROE", value: fmtPct(f?.roe) },
    { label: "EPS", value: fmtEps(f?.eps, item?.market ?? "US") },
    { label: "殖利率", value: fmtPct(f?.dividendYield) },
    { label: "毛利率", value: fmtPct(f?.grossMargin) },
    { label: "營收年增", value: fmtPct(f?.revenueYoy) },
    { label: "Beta", value: fmtNumber(f?.beta, "", 2) },
    { label: "市值", value: fmtMarketCap(f?.marketCap, item?.market ?? "US") },
  ];

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
        {fields.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <span className="font-mono text-sm">{f.value}</span>
          </div>
        ))}
      </div>
      {item && isLoading && !data && (
        <p className="text-xs text-muted-foreground">載入中…</p>
      )}
      {item && error && <p className="text-xs text-red-500">基本面讀取失敗</p>}
      {!item && <p className="text-xs text-muted-foreground">從左側選股</p>}
    </div>
  );
}
