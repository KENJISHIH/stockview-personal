"use client";

import { useSyncExternalStore } from "react";
import type { SectorGroup } from "@/types";
import { loadSectors } from "./sector-storage";

let cachedSnapshot: SectorGroup[] | null = null;
const subscribers = new Set<() => void>();

function readAndCache(): SectorGroup[] {
  cachedSnapshot = loadSectors();
  return cachedSnapshot;
}

function getSnapshot(): SectorGroup[] {
  if (cachedSnapshot === null) cachedSnapshot = loadSectors();
  return cachedSnapshot;
}

function getServerSnapshot(): SectorGroup[] {
  return [];
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  subscribers.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith("stockview.sectors")) {
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

export function notifySectorsChanged() {
  readAndCache();
  subscribers.forEach((cb) => cb());
}

export function useSectors(): SectorGroup[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
