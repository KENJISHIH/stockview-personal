"use client";

import { useSyncExternalStore } from "react";
import type { WatchlistItem } from "@/types";
import { loadWatchlist } from "./storage";
import { WATCHLIST_SEED } from "./watchlist-seed";

/**
 * useSyncExternalStore 規定 getSnapshot 必須在資料未變時回相同 reference，
 * 否則會造成無限重新渲染（React error #185）。
 * 這裡在 module scope 維護快取，只在被 notify 時才重新讀。
 */
let cachedSnapshot: WatchlistItem[] | null = null;
const subscribers = new Set<() => void>();

function readAndCache(): WatchlistItem[] {
  cachedSnapshot = loadWatchlist();
  return cachedSnapshot;
}

function getSnapshot(): WatchlistItem[] {
  if (cachedSnapshot === null) cachedSnapshot = loadWatchlist();
  return cachedSnapshot;
}

function getServerSnapshot(): WatchlistItem[] {
  return WATCHLIST_SEED;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  subscribers.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith("stockview.watchlist")) {
      readAndCache();
      subscribers.forEach((cb) => cb());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    subscribers.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

/** 同分頁內手動觸發更新（add/remove/reset 後呼叫） */
export function notifyWatchlistChanged() {
  readAndCache();
  subscribers.forEach((cb) => cb());
}

export function useWatchlist(): WatchlistItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
