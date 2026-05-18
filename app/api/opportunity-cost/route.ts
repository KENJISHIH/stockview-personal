import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const revalidate = 3600; // 1 hour

interface RawChartQuote {
  date: Date | string;
  close: number | null;
}

interface AssetReturn {
  symbol: string;
  name: string;
  market: "TW";
  price: number;
  cagr10y?: number;
  cagr5y?: number;
  asOf: string;
}

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const ASSETS = [
  { symbol: "0050", ySymbol: "0050.TW", name: "元大台灣50" },
  { symbol: "2330", ySymbol: "2330.TW", name: "台積電" },
] as const;

async function fetchCagrSeries(ySymbol: string) {
  // 拉 11 年的資料保留邊界裕度
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 11);

  const result = (await yahooFinance.chart(
    ySymbol,
    { period1, interval: "1mo" },
    { validateResult: false }
  )) as { quotes?: RawChartQuote[] } | null;

  const bars = (result?.quotes ?? [])
    .filter((q): q is RawChartQuote & { close: number } =>
      typeof q.close === "number" && Number.isFinite(q.close)
    )
    .map((q) => ({
      date: q.date instanceof Date ? q.date : new Date(q.date),
      close: q.close,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (bars.length === 0) throw new Error(`No bars for ${ySymbol}`);

  const latest = bars[bars.length - 1];
  const findOldest = (yearsAgo: number) => {
    const cutoff = new Date(latest.date);
    cutoff.setFullYear(cutoff.getFullYear() - yearsAgo);
    // 找第一個 >= cutoff 的點，作為「N 年前」的起點
    const idx = bars.findIndex((b) => b.date.getTime() >= cutoff.getTime());
    return idx >= 0 ? bars[idx] : bars[0];
  };

  const cagr = (start: { date: Date; close: number }, end: { date: Date; close: number }) => {
    const years = (end.date.getTime() - start.date.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (years <= 0 || start.close <= 0) return undefined;
    return (Math.pow(end.close / start.close, 1 / years) - 1) * 100;
  };

  const start10 = findOldest(10);
  const start5 = findOldest(5);

  return {
    price: latest.close,
    cagr10y: cagr(start10, latest),
    cagr5y: cagr(start5, latest),
    asOf: latest.date.toISOString(),
  };
}

export async function GET() {
  try {
    const settled = await Promise.allSettled(
      ASSETS.map(async (a) => {
        const r = await fetchCagrSeries(a.ySymbol);
        return {
          symbol: a.symbol,
          name: a.name,
          market: "TW" as const,
          price: r.price,
          cagr10y: r.cagr10y,
          cagr5y: r.cagr5y,
          asOf: r.asOf,
        } satisfies AssetReturn;
      })
    );

    const assets: AssetReturn[] = [];
    for (let i = 0; i < settled.length; i++) {
      const s = settled[i];
      if (s.status === "fulfilled") assets.push(s.value);
      else console.warn(`opportunity-cost fetch failed for ${ASSETS[i].symbol}`, s.reason);
    }

    if (assets.length === 0) {
      return NextResponse.json({ error: "All asset fetches failed" }, { status: 502 });
    }

    return NextResponse.json(
      { assets },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch (error) {
    console.error("opportunity-cost route failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
