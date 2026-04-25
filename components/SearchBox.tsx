"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { detectMarket } from "@/lib/market-detect";
import type { WatchlistItem } from "@/types";

interface QuoteResp {
  quote: { symbol: string; name: string };
}

interface Props {
  onPick: (item: WatchlistItem) => void;
}

export function SearchBox({ onPick }: Props) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setErr(null);
    const { symbol, market } = detectMarket(val);
    if (!symbol) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/quote/${market}/${encodeURIComponent(symbol)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setErr("找不到");
        return;
      }
      const data = (await res.json()) as QuoteResp;
      onPick({
        symbol,
        market,
        name: data.quote.name || symbol,
        order: 9999,
        addedAt: new Date().toISOString(),
      });
      setVal("");
    } catch {
      setErr("錯誤");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <Input
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          setErr(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") go();
        }}
        placeholder="搜尋代號（2330 / jp:7011 / AAPL）"
        className="h-8 w-72 text-xs"
        disabled={busy}
      />
      {err && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-red-500">
          {err}
        </span>
      )}
    </div>
  );
}
