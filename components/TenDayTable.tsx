"use client";

import type { WatchlistItem } from "@/types";
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
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">最近 10 個工作天</h3>
        <span className="text-xs text-muted-foreground">收盤 / 日% / 累%</span>
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
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="py-1.5 font-mono text-xs text-muted-foreground">
                ——/——
              </TableCell>
              <TableCell className="py-1.5 text-right font-mono text-muted-foreground">—</TableCell>
              <TableCell className="py-1.5 text-right font-mono text-muted-foreground">—</TableCell>
              <TableCell className="py-1.5 text-right font-mono text-muted-foreground">—</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {item && (
        <p className="text-xs text-muted-foreground">
          當前選中：{item.name}（{item.symbol}）· 待 Phase 2 接資料
        </p>
      )}
    </div>
  );
}
