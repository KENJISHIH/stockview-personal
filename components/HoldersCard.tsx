"use client";

import useSWR from "swr";
import type { Holders, WatchlistItem } from "@/types";
import { fetcher } from "@/lib/swr";
import { changeColorClass, formatPercent } from "@/lib/format";

interface Props {
  item: WatchlistItem | null;
}

function fmtRatioAsPct(v: number | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(2)}%`;
}

function fmtShares(v: number | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString("en-US");
}

function fmtPctChangeRatio(v: number | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return formatPercent(v * 100);
}

export function HoldersCard({ item }: Props) {
  const url = item ? `/api/holders/${item.market}/${encodeURIComponent(item.symbol)}` : null;
  const { data, error, isLoading } = useSWR<{ holders: Holders }>(url, fetcher, {
    refreshInterval: 24 * 60 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 60 * 60 * 1000,
  });
  const h = data?.holders;

  if (!item) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-border p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">法人持股</h3>
        <span className="text-xs text-muted-foreground">
          {item.symbol} · {item.market}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <Row label="法人持股 %" value={fmtRatioAsPct(h?.institutionsPercentHeld)} />
        <Row label="家數" value={h?.institutionsCount?.toLocaleString("en-US") ?? "—"} />
        <Row label="Float %" value={fmtRatioAsPct(h?.institutionsFloatPercentHeld)} />
        <Row label="內部人 %" value={fmtRatioAsPct(h?.insidersPercentHeld)} />
      </div>

      {item.market === "US" && (
        <>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 rounded border border-border bg-muted/30 p-2 text-sm">
            <Row
              label={`法人淨買 (${h?.period ?? "6m"})`}
              value={fmtPctChangeRatio(h?.netInstBuyingPercent)}
              colorValue={h?.netInstBuyingPercent}
            />
            <Row
              label={`內部人淨買 (${h?.period ?? "6m"})`}
              value={fmtPctChangeRatio(h?.netPercentInsiderShares)}
              colorValue={h?.netPercentInsiderShares}
            />
          </div>

          <div className="mt-2 text-xs text-muted-foreground">Top 機構（13F 季報）</div>
          {h && h.topInstitutions.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left font-normal">機構</th>
                  <th className="text-right font-normal">持股</th>
                  <th className="text-right font-normal">季變化</th>
                </tr>
              </thead>
              <tbody>
                {h.topInstitutions.slice(0, 10).map((row) => (
                  <tr key={`${row.name}-${row.reportDate}`} className="border-t border-border/60">
                    <td className="truncate py-1 pr-2" title={`${row.name} · ${row.reportDate}`}>
                      {row.name}
                    </td>
                    <td className="py-1 text-right font-mono tabular-nums">
                      {fmtShares(row.position)}
                    </td>
                    <td className={`py-1 text-right font-mono tabular-nums ${changeColorClass(row.pctChange)}`}>
                      {fmtPctChangeRatio(row.pctChange)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            !isLoading && (
              <p className="text-xs text-muted-foreground">Yahoo 沒回 Top 機構資料</p>
            )
          )}
        </>
      )}

      {item.market !== "US" && (
        <p className="text-xs text-muted-foreground">
          {item.market === "TW" ? "台股" : "日股"}僅顯示總比例；個別機構名單 Yahoo 對非美股覆蓋率不足
        </p>
      )}

      {isLoading && !data && <p className="text-xs text-muted-foreground">載入中…</p>}
      {error && <p className="text-xs text-red-500">法人持股讀取失敗</p>}
    </div>
  );
}

function Row({
  label,
  value,
  colorValue,
}: {
  label: string;
  value: string;
  colorValue?: number;
}) {
  const cls = colorValue === undefined ? "" : changeColorClass(colorValue);
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm ${cls}`}>{value}</span>
    </div>
  );
}
