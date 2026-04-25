import type { Market } from "@/types";

export function formatPrice(value: number | undefined, market?: Market): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  if (market === "TW") {
    return value.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(value: number | undefined, decimals = 2): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatChange(value: number | undefined, decimals = 2): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}`;
}

/**
 * 配色：全市場統一採台股慣例（紅漲綠跌）。
 */
export function changeColorClass(value: number | undefined): string {
  if (value === undefined || value === null || Number.isNaN(value) || value === 0) {
    return "text-muted-foreground";
  }
  return value > 0 ? "text-red-500" : "text-green-500";
}
