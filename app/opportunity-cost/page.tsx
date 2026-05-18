"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { fetcher } from "@/lib/swr";

interface Asset {
  symbol: string;
  name: string;
  market: "TW";
  price: number;
  cagr10y?: number;
  cagr5y?: number;
  asOf: string;
}

interface ApiResp {
  assets: Asset[];
}

const HORIZONS = [
  { key: "3m", label: "3 個月後", years: 0.25 },
  { key: "1y", label: "1 年後", years: 1 },
  { key: "5y", label: "5 年後", years: 5 },
  { key: "10y", label: "10 年後", years: 10 },
] as const;

function fmtTwd(v: number): string {
  return `NT$ ${Math.round(v).toLocaleString("zh-TW")}`;
}

function fmtPct(v: number | undefined, decimals = 1): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(decimals)}%`;
}

function fmtDiff(v: number): string {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}NT$ ${Math.abs(Math.round(v)).toLocaleString("zh-TW")}`;
}

function projectValue(principal: number, cagr: number | undefined, years: number): number | undefined {
  if (typeof cagr !== "number" || !Number.isFinite(cagr)) return undefined;
  return principal * Math.pow(1 + cagr / 100, years);
}

function fmtUpdateTime(iso: string): string {
  const d = new Date(iso);
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  const hh = d.getHours().toString().padStart(2, "0");
  const mi = d.getMinutes().toString().padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

/**
 * 仿原擴充功能的綠泡泡 + hover popup
 */
function PriceBadge({ asset, principal }: { asset: Asset; principal: number }) {
  const shares = asset.price > 0 ? principal / asset.price : 0;
  const v3m = projectValue(principal, asset.cagr10y, 0.25);
  const v1y = projectValue(principal, asset.cagr10y, 1);

  return (
    <div className="group relative inline-block">
      <button
        type="button"
        className="cursor-help rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-200"
      >
        ≈{shares.toFixed(2)}股 · {asset.symbol}
      </button>

      <div className="invisible absolute left-0 top-full z-20 mt-2 w-72 -translate-y-1 rounded-2xl bg-white opacity-0 shadow-2xl ring-1 ring-black/5 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="flex items-center justify-between rounded-t-2xl bg-emerald-600 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-white">{asset.name}</div>
            <div className="text-[11px] text-emerald-100">{asset.symbol}</div>
          </div>
          <div className="text-right text-sm font-semibold text-white">
            NT$ {asset.price.toFixed(0)} / 股
          </div>
        </div>

        <div className="px-4 py-3 text-sm text-gray-800">
          <div className="flex items-baseline justify-between py-1">
            <span className="text-gray-500">10 年年化報酬</span>
            <span className="font-semibold text-red-500">{fmtPct(asset.cagr10y)}</span>
          </div>
          <div className="flex items-baseline justify-between py-1">
            <span className="text-gray-500">等值股數</span>
            <span className="font-mono">{shares.toFixed(3)} 股</span>
          </div>

          <div className="my-2 border-t border-gray-200" />

          <div className="flex items-baseline justify-between py-1">
            <span className="text-gray-500">3 個月後約</span>
            <span className="font-mono font-semibold">{v3m !== undefined ? fmtTwd(v3m) : "—"}</span>
          </div>
          {v3m !== undefined && (
            <div className="flex justify-end pb-1 text-xs text-red-500">
              {fmtDiff(v3m - principal)}
            </div>
          )}

          <div className="flex items-baseline justify-between py-1">
            <span className="text-gray-500">1 年後約</span>
            <span className="font-mono font-semibold">{v1y !== undefined ? fmtTwd(v1y) : "—"}</span>
          </div>
          {v1y !== undefined && (
            <div className="flex justify-end pb-1 text-xs text-red-500">
              {fmtDiff(v1y - principal)}
            </div>
          )}
        </div>

        <div className="rounded-b-2xl border-t border-gray-200 px-4 py-2 text-right text-[11px] text-gray-400">
          更新：{fmtUpdateTime(asset.asOf)}
        </div>
      </div>
    </div>
  );
}

export default function OpportunityCostPage() {
  const [input, setInput] = useState("3899");
  const { data, error, isLoading } = useSWR<ApiResp>("/api/opportunity-cost", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60 * 60 * 1000,
  });

  const principal = useMemo(() => {
    const n = Number(input.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [input]);

  const assets = data?.assets ?? [];
  const a0050 = assets.find((a) => a.symbol === "0050");
  const a2330 = assets.find((a) => a.symbol === "2330");

  const maxGain10y = useMemo(() => {
    if (principal <= 0) return 0;
    let max = 0;
    for (const a of assets) {
      const v = projectValue(principal, a.cagr10y, 10);
      if (typeof v === "number") max = Math.max(max, v - principal);
    }
    return max;
  }, [assets, principal]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8 flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-semibold">💰 機會成本計算機</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              這筆錢如果拿去買 0050 或 2330，未來會變多少？
            </p>
          </div>
          <Link
            href="/"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            ← 回 Dashboard
          </Link>
        </header>

        <div className="mb-8 rounded-lg border border-border bg-card p-6">
          <label className="mb-1.5 block text-xs text-muted-foreground">金額（TWD）</label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              inputMode="numeric"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="3899"
              className="w-48 rounded-md border border-border bg-background px-3 py-2 text-3xl font-mono tabular-nums outline-none focus:border-foreground/40"
            />

            {principal > 0 && a0050 && <PriceBadge asset={a0050} principal={principal} />}
            {principal > 0 && a2330 && <PriceBadge asset={a2330} principal={principal} />}
          </div>

          <div className="mt-4 flex gap-2 text-xs">
            <span className="text-muted-foreground">快選：</span>
            {[1000, 10000, 50000, 100000].map((v) => (
              <button
                key={v}
                onClick={() => setInput(String(v))}
                className="rounded border border-border px-2 py-1 text-muted-foreground hover:bg-muted"
              >
                {v.toLocaleString("zh-TW")}
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            👆 滑鼠移到綠色泡泡上查看試算
          </p>
        </div>

        {isLoading && (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            載入歷史資料中…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">
            資料讀取失敗，請稍後再試。
          </div>
        )}

        {data && (
          <>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">完整版（含 5 / 10 年）</h2>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left">
                    <th className="px-5 py-3 font-medium text-muted-foreground"></th>
                    <th className="px-5 py-3 font-medium">
                      <div className="text-base">0050</div>
                      <div className="text-xs font-normal text-muted-foreground">元大台灣50</div>
                    </th>
                    <th className="px-5 py-3 font-medium">
                      <div className="text-base">2330</div>
                      <div className="text-xs font-normal text-muted-foreground">台積電</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-5 py-3 text-xs text-muted-foreground">目前股價</td>
                    <td className="px-5 py-3 font-mono">
                      {a0050 ? `NT$ ${a0050.price.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-5 py-3 font-mono">
                      {a2330 ? `NT$ ${a2330.price.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-5 py-3 text-xs text-muted-foreground">10 年年化報酬</td>
                    <td className="px-5 py-3 font-mono text-red-500">
                      {fmtPct(a0050?.cagr10y)}
                    </td>
                    <td className="px-5 py-3 font-mono text-red-500">
                      {fmtPct(a2330?.cagr10y)}
                    </td>
                  </tr>
                  <tr className="border-b border-border bg-muted/20">
                    <td className="px-5 py-3 text-xs text-muted-foreground">等值股數</td>
                    <td className="px-5 py-3 font-mono">
                      {a0050 && principal > 0
                        ? `${(principal / a0050.price).toFixed(2)} 股`
                        : "—"}
                    </td>
                    <td className="px-5 py-3 font-mono">
                      {a2330 && principal > 0
                        ? `${(principal / a2330.price).toFixed(2)} 股`
                        : "—"}
                    </td>
                  </tr>

                  {HORIZONS.map((h, idx) => {
                    const v0050 = projectValue(principal, a0050?.cagr10y, h.years);
                    const v2330 = projectValue(principal, a2330?.cagr10y, h.years);
                    const d0050 = v0050 !== undefined ? v0050 - principal : undefined;
                    const d2330 = v2330 !== undefined ? v2330 - principal : undefined;
                    const pct0050 = v0050 !== undefined && principal > 0
                      ? (v0050 / principal - 1) * 100
                      : undefined;
                    const pct2330 = v2330 !== undefined && principal > 0
                      ? (v2330 / principal - 1) * 100
                      : undefined;

                    return (
                      <tr
                        key={h.key}
                        className={idx === HORIZONS.length - 1 ? "" : "border-b border-border"}
                      >
                        <td className="px-5 py-4 text-xs text-muted-foreground">{h.label}</td>
                        <td className="px-5 py-4">
                          <div className="font-mono text-base">
                            {v0050 !== undefined ? fmtTwd(v0050) : "—"}
                          </div>
                          {pct0050 !== undefined && d0050 !== undefined && principal > 0 && (
                            <div className="mt-0.5 flex items-baseline gap-2 text-xs">
                              <span className="font-mono text-red-500">{fmtPct(pct0050)}</span>
                              <span className="font-mono text-red-500/70">{fmtDiff(d0050)}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-mono text-base">
                            {v2330 !== undefined ? fmtTwd(v2330) : "—"}
                          </div>
                          {pct2330 !== undefined && d2330 !== undefined && principal > 0 && (
                            <div className="mt-0.5 flex items-baseline gap-2 text-xs">
                              <span className="font-mono text-red-500">{fmtPct(pct2330)}</span>
                              <span className="font-mono text-red-500/70">{fmtDiff(d2330)}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {principal > 0 && maxGain10y > 0 && (
              <div className="mt-6 rounded-lg border border-border bg-muted/30 p-5">
                <p className="text-sm">
                  💡 拒買這筆 <span className="font-mono">{fmtTwd(principal)}</span> 消費，
                  10 年後最多能多賺{" "}
                  <span className="font-mono text-base font-semibold text-red-500">
                    {fmtTwd(maxGain10y)}
                  </span>
                </p>
              </div>
            )}

            <p className="mt-6 text-xs text-muted-foreground">
              資料來源：Yahoo Finance · 年化以過去 10 年月線計算 · 3 個月／1／5 年皆套用同一年化率 ·
              過去績效不代表未來，本工具不構成投資建議
            </p>
          </>
        )}
      </div>
    </div>
  );
}
