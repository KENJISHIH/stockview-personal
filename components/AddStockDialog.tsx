"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addToWatchlist } from "@/lib/storage";
import { notifyWatchlistChanged } from "@/lib/use-watchlist";
import { detectMarket } from "@/lib/market-detect";
import type { Market } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface QuoteResp {
  quote: { symbol: string; name: string; price: number };
}

export function AddStockDialog({ open, onOpenChange }: Props) {
  const [input, setInput] = useState("");
  const [market, setMarket] = useState<Market>("TW");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleInputChange(v: string) {
    setInput(v);
    setError(null);
    const detected = detectMarket(v);
    if (detected.symbol) setMarket(detected.market);
  }

  async function handleSubmit() {
    setError(null);
    const detected = detectMarket(input);
    if (!detected.symbol) {
      setError("請輸入股票代號");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/quote/${market}/${encodeURIComponent(detected.symbol)}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        setError("找不到此股票，確認代號 / 市場");
        return;
      }
      const data = (await res.json()) as QuoteResp;
      const finalName = name.trim() || data.quote.name || detected.symbol;
      addToWatchlist({ symbol: detected.symbol, name: finalName, market });
      notifyWatchlistChanged();
      // reset & close
      setInput("");
      setName("");
      onOpenChange(false);
    } catch {
      setError("驗證失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新增到觀察名單</DialogTitle>
          <DialogDescription>
            輸入代號（例：2330、7011、AAPL）。前綴 <code>tw:</code> / <code>jp:</code> /{" "}
            <code>us:</code> 可指定市場。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground" htmlFor="symbol-input">
              代號
            </label>
            <Input
              id="symbol-input"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="2330 或 jp:7011 或 AAPL"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">市場</label>
            <div className="flex gap-2">
              {(["TW", "JP", "US"] as Market[]).map((m) => (
                <Button
                  key={m}
                  variant={market === m ? "secondary" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setMarket(m)}
                >
                  {m === "TW" ? "台股" : m === "JP" ? "日股" : "美股"}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground" htmlFor="name-input">
              顯示名稱（選填，留空用 Yahoo 名稱）
            </label>
            <Input
              id="name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：台積電、三菱重工"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={busy || !input.trim()}>
            {busy ? "驗證中…" : "加入"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
