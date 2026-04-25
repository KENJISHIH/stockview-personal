import type { WatchlistItem } from "@/types";
import { WATCHLIST_SEED } from "./watchlist-seed";

const KEY = "stockview.watchlist.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadWatchlist(): WatchlistItem[] {
  if (!isBrowser()) return WATCHLIST_SEED;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      window.localStorage.setItem(KEY, JSON.stringify(WATCHLIST_SEED));
      return WATCHLIST_SEED;
    }
    const parsed = JSON.parse(raw) as WatchlistItem[];

    // Seed merge：把 seed 內存在但 localStorage 缺少的項目補進來（順序接在後）
    const existing = new Set(parsed.map((x) => `${x.market}:${x.symbol}`));
    const missing = WATCHLIST_SEED.filter((s) => !existing.has(`${s.market}:${s.symbol}`));
    if (missing.length > 0) {
      const maxOrder = parsed.reduce((m, x) => Math.max(m, x.order), 0);
      const merged = [
        ...parsed,
        ...missing.map((item, i) => ({ ...item, order: maxOrder + i + 1 })),
      ];
      window.localStorage.setItem(KEY, JSON.stringify(merged));
      return merged.sort((a, b) => a.order - b.order);
    }

    return parsed.sort((a, b) => a.order - b.order);
  } catch {
    return WATCHLIST_SEED;
  }
}

export function saveWatchlist(items: WatchlistItem[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export function addToWatchlist(item: Omit<WatchlistItem, "order" | "addedAt">): WatchlistItem[] {
  const list = loadWatchlist();
  if (list.some((x) => x.symbol === item.symbol && x.market === item.market)) {
    return list;
  }
  const next: WatchlistItem = {
    ...item,
    order: list.length + 1,
    addedAt: new Date().toISOString(),
  };
  const updated = [...list, next];
  saveWatchlist(updated);
  return updated;
}

export function removeFromWatchlist(symbol: string, market: WatchlistItem["market"]): WatchlistItem[] {
  const list = loadWatchlist().filter((x) => !(x.symbol === symbol && x.market === market));
  const reindexed = list.map((x, i) => ({ ...x, order: i + 1 }));
  saveWatchlist(reindexed);
  return reindexed;
}

export function moveItem(
  symbol: string,
  market: WatchlistItem["market"],
  direction: "up" | "down"
): WatchlistItem[] {
  const list = loadWatchlist();
  // 只在同市場內排序
  const sameMarket = list.filter((x) => x.market === market);
  const others = list.filter((x) => x.market !== market);
  const idx = sameMarket.findIndex((x) => x.symbol === symbol);
  if (idx === -1) return list;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= sameMarket.length) return list;
  [sameMarket[idx], sameMarket[swapWith]] = [sameMarket[swapWith], sameMarket[idx]];
  // 整體重新編號（保持 TW → JP → US 順序）
  const tw = [...sameMarket, ...others].filter((x) => x.market === "TW");
  const jp = [...sameMarket, ...others].filter((x) => x.market === "JP");
  const us = [...sameMarket, ...others].filter((x) => x.market === "US");
  const merged = [...tw, ...jp, ...us].map((x, i) => ({ ...x, order: i + 1 }));
  saveWatchlist(merged);
  return merged;
}

export function resetWatchlist(): WatchlistItem[] {
  if (!isBrowser()) return WATCHLIST_SEED;
  window.localStorage.setItem(KEY, JSON.stringify(WATCHLIST_SEED));
  return WATCHLIST_SEED;
}
