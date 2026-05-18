"use client";

import useSWR from "swr";
import type { Earnings, WatchlistItem } from "@/types";
import { fetcher } from "@/lib/swr";
import { changeColorClass, formatPercent } from "@/lib/format";

interface Props {
  item: WatchlistItem | null;
}

function fmtEps(v: number | undefined, market: WatchlistItem["market"]): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  if (market === "JP") return `¥${v.toFixed(0)}`;
  if (market === "TW") return v.toFixed(2);
  return v.toFixed(2);
}

function fmtSurprise(v: number | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return formatPercent(v * 100);
}

function daysUntil(dateStr: string | undefined): number | undefined {
  if (!dateStr) return undefined;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function EarningsCard({ item }: Props) {
  const url = item ? `/api/earnings/${item.market}/${encodeURIComponent(item.symbol)}` : null;
  const { data, error, isLoading } = useSWR<{ earnings: Earnings }>(url, fetcher, {
    refreshInterval: 24 * 60 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 60 * 60 * 1000,
  });
  const e = data?.earnings;
  if (!item) return null;

  const days = daysUntil(e?.nextEarningsDate);
  const market = item.market;

  return (
    <div className="flex flex-col gap-2 border-t border-border p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">財報</h3>
        <span className="text-xs text-muted-foreground">
          {item.symbol} · {market}
        </span>
      </div>

      <div className="rounded border border-border bg-muted/30 p-2 text-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">下次預計</span>
          <span className="font-mono">
            {e?.nextEarningsDate ?? "—"}
            {e?.isNextEstimate === false && (
              <span className="ml-1 rounded bg-green-500/20 px-1 text-[10px] text-green-700">已公告</span>
            )}
            {e?.isNextEstimate === true && (
              <span className="ml-1 rounded bg-muted px-1 text-[10px] text-muted-foreground">估計</span>
            )}
            {typeof days === "number" && days >= 0 && (
              <span className="ml-2 text-xs text-muted-foreground">還有 {days} 天</span>
            )}
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">分析師預估 EPS</span>
          <span className="font-mono">
            {fmtEps(e?.nextEpsEstimate, market)}
            {typeof e?.nextEpsLow === "number" && typeof e?.nextEpsHigh === "number" && (
              <span className="ml-1 text-muted-foreground">
                ({fmtEps(e.nextEpsLow, market)} ~ {fmtEps(e.nextEpsHigh, market)})
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="mt-1 text-xs text-muted-foreground">過去 4 季</div>
      {e && e.history.length > 0 ? (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left font-normal">季度</th>
              <th className="text-right font-normal">實際 EPS</th>
              <th className="text-right font-normal">預估</th>
              <th className="text-right font-normal">Surprise</th>
            </tr>
          </thead>
          <tbody>
            {e.history.slice(-4).map((row) => (
              <tr key={row.quarter} className="border-t border-border/60">
                <td className="py-1 pr-2 font-mono">{row.quarter}</td>
                <td className="py-1 text-right font-mono tabular-nums">
                  {fmtEps(row.epsActual, market)}
                </td>
                <td className="py-1 text-right font-mono tabular-nums text-muted-foreground">
                  {fmtEps(row.epsEstimate, market)}
                </td>
                <td
                  className={`py-1 text-right font-mono tabular-nums ${changeColorClass(row.surprisePercent)}`}
                >
                  {fmtSurprise(row.surprisePercent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        !isLoading && <p className="text-xs text-muted-foreground">Yahoo 沒回財報歷史</p>
      )}

      {!e?.nextEarningsDate && !isLoading && (
        <p className="text-xs text-muted-foreground">下次發布日 Yahoo 未提供（櫃買股常見）</p>
      )}
      {isLoading && !data && <p className="text-xs text-muted-foreground">載入中…</p>}
      {error && <p className="text-xs text-red-500">財報讀取失敗</p>}
    </div>
  );
}
