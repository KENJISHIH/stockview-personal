"use client";

import useSWR from "swr";
import type { DailySeries, WatchlistItem } from "@/types";
import { fetcher } from "@/lib/swr";
import { changeColorClass, formatPercent, formatPrice } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  item: WatchlistItem | null;
}

export function TenDayTable({ item }: Props) {
  const url = item
    ? `/api/daily/${item.market}/${encodeURIComponent(item.symbol)}?days=10`
    : null;
  const { data, error, isLoading } = useSWR<{ series: DailySeries }>(url, fetcher, {
    refreshInterval: 5 * 60 * 1000, // 5 分鐘
    revalidateOnFocus: true,
    dedupingInterval: 60_000,
  });
  const series = data?.series;

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">最近 10 個工作天</h3>
        <span className="text-xs text-muted-foreground">
          {series ? `累計 ${formatPercent(series.cumulativePct)}` : "收盤 / 日% / 累%"}
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-8">日期</TableHead>
            <TableHead className="h-8 text-right">收盤</TableHead>
            <TableHead className="h-8 text-right">日%</TableHead>
            <TableHead className="h-8 text-right">累%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!item && <EmptyRows label="從左側選股" />}
          {item && isLoading && !series && <EmptyRows label="載入中…" />}
          {item && error && <EmptyRows label="讀取失敗" />}
          {series &&
            series.rows.map((row) => (
              <TableRow key={row.date}>
                <TableCell className="py-1.5 font-mono text-xs text-muted-foreground">
                  {formatDate(row.date)}
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono">
                  {formatPrice(row.close, item?.market)}
                </TableCell>
                <TableCell
                  className={`py-1.5 text-right font-mono ${changeColorClass(row.change)}`}
                >
                  {formatPercent(row.changePct)}
                </TableCell>
                <TableCell
                  className={`py-1.5 text-right font-mono ${changeColorClass(row.cumPct)}`}
                >
                  {formatPercent(row.cumPct)}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EmptyRows({ label }: { label: string }) {
  return (
    <>
      <TableRow>
        <TableCell colSpan={4} className="py-3 text-center text-xs text-muted-foreground">
          {label}
        </TableCell>
      </TableRow>
      {Array.from({ length: 9 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell className="py-1.5 font-mono text-xs text-muted-foreground">——/——</TableCell>
          <TableCell className="py-1.5 text-right font-mono text-muted-foreground">—</TableCell>
          <TableCell className="py-1.5 text-right font-mono text-muted-foreground">—</TableCell>
          <TableCell className="py-1.5 text-right font-mono text-muted-foreground">—</TableCell>
        </TableRow>
      ))}
    </>
  );
}

function formatDate(iso: string): string {
  // "2026-04-25" → "04/25"
  const [, m, d] = iso.split("-");
  return `${m}/${d}`;
}
