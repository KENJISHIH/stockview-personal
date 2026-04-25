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

export function resetWatchlist(): WatchlistItem[] {
  if (!isBrowser()) return WATCHLIST_SEED;
  window.localStorage.setItem(KEY, JSON.stringify(WATCHLIST_SEED));
  return WATCHLIST_SEED;
}
