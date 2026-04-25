import type { WatchlistItem } from "@/types";

const NOW = "2026-04-25T00:00:00.000Z";

export const WATCHLIST_SEED: WatchlistItem[] = [
  // 台股
  { symbol: "0050", name: "元大台灣 50", market: "TW", order: 1, addedAt: NOW },
  { symbol: "00878", name: "國泰永續高股息", market: "TW", order: 2, addedAt: NOW },
  { symbol: "2330", name: "台積電", market: "TW", order: 3, addedAt: NOW },
  { symbol: "8033", name: "雷虎", market: "TW", order: 4, addedAt: NOW },
  { symbol: "3491", name: "昇達科", market: "TW", order: 5, addedAt: NOW },
  { symbol: "2368", name: "金像電", market: "TW", order: 6, addedAt: NOW },
  { symbol: "2313", name: "華通", market: "TW", order: 7, addedAt: NOW },
  { symbol: "8299", name: "群聯", market: "TW", order: 8, addedAt: NOW },
  { symbol: "3260", name: "威剛", market: "TW", order: 9, addedAt: NOW },
  { symbol: "6285", name: "啟碁", market: "TW", order: 10, addedAt: NOW },

  // 日股
  { symbol: "7011", name: "三菱重工", market: "JP", order: 11, addedAt: NOW },

  // 美股
  { symbol: "MU", name: "Micron 美光", market: "US", order: 12, addedAt: NOW },
  { symbol: "TSM", name: "TSMC ADR", market: "US", order: 13, addedAt: NOW },
  { symbol: "AAPL", name: "Apple 蘋果", market: "US", order: 14, addedAt: NOW },
  { symbol: "GOOGL", name: "Alphabet A", market: "US", order: 15, addedAt: NOW },
  { symbol: "SPY", name: "S&P 500 ETF", market: "US", order: 16, addedAt: NOW },
  { symbol: "RKLB", name: "Rocket Lab", market: "US", order: 17, addedAt: NOW },
  { symbol: "ONDS", name: "Ondas Holdings", market: "US", order: 18, addedAt: NOW },
  { symbol: "RCAT", name: "Red Cat Holdings", market: "US", order: 19, addedAt: NOW },
];
