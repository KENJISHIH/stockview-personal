"use client";

import { useSyncExternalStore } from "react";
import type { WatchlistItem } from "@/types";
import { loadWatchlist } from "./storage";
import { WATCHLIST_SEED } from "./watchlist-seed";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useWatchlist(): WatchlistItem[] {
  return useSyncExternalStore(subscribe, loadWatchlist, () => WATCHLIST_SEED);
}
