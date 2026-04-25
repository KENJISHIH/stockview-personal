import type { Market } from "@/types";

/**
 * 從使用者輸入猜出代號 + 市場：
 *   "tw:2330"  → { symbol: "2330", market: "TW" }
 *   "jp:7011"  → { symbol: "7011", market: "JP" }
 *   "us:AAPL"  → { symbol: "AAPL", market: "US" }
 *   "2330"     → { symbol: "2330", market: "TW" }   // 純數字預設台股
 *   "AAPL"     → { symbol: "AAPL", market: "US" }   // 含字母 → 美股
 */
export function detectMarket(input: string): { symbol: string; market: Market } {
  const raw = input.trim();
  const prefixed = raw.match(/^(TW|JP|US|tw|jp|us)\s*[:.]\s*(.+)$/);
  if (prefixed) {
    return {
      symbol: prefixed[2].toUpperCase(),
      market: prefixed[1].toUpperCase() as Market,
    };
  }
  const upper = raw.toUpperCase();
  if (/^\d{4,6}$/.test(upper)) return { symbol: upper, market: "TW" };
  return { symbol: upper, market: "US" };
}
