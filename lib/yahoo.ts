import YahooFinance from "yahoo-finance2";
import type { DailyRow, DailySeries, IndexQuote, Market, Quote } from "@/types";

// v3 預設 export 是 class，不再是 singleton
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface RawQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  marketCap?: number;
}

const twSymbolCache = new Map<string, string>();

async function rawQuoteOne(ySymbol: string): Promise<RawQuote | null> {
  // 用 validateResult:false 讓回傳型別為 any，避開 v3 嚴格 union 推論
  const r = (await yahooFinance.quote(ySymbol, undefined, {
    validateResult: false,
  })) as RawQuote | null;
  return r ?? null;
}

async function rawQuoteMany(ySymbols: string[]): Promise<RawQuote[]> {
  const r = (await yahooFinance.quote(ySymbols, undefined, {
    validateResult: false,
  })) as unknown as RawQuote[] | RawQuote;
  if (Array.isArray(r)) return r;
  return r ? [r] : [];
}

/**
 * 台股代號解析：先試 .TW（上市），失敗再試 .TWO（上櫃）。結果存記憶體快取。
 */
async function resolveTwSymbol(symbol: string): Promise<string> {
  const cached = twSymbolCache.get(symbol);
  if (cached) return cached;
  for (const suffix of [".TW", ".TWO"]) {
    const candidate = `${symbol}${suffix}`;
    try {
      const r = await rawQuoteOne(candidate);
      if (r && typeof r.regularMarketPrice === "number") {
        twSymbolCache.set(symbol, candidate);
        return candidate;
      }
    } catch {
      // try next suffix
    }
  }
  const fallback = `${symbol}.TW`;
  twSymbolCache.set(symbol, fallback);
  return fallback;
}

async function toYahooSymbol(symbol: string, market: Market): Promise<string> {
  if (market === "US") return symbol;
  if (market === "JP") return `${symbol}.T`;
  return resolveTwSymbol(symbol);
}

export async function fetchQuote(
  symbol: string,
  market: Market,
  displayName?: string
): Promise<Quote> {
  const ySymbol = await toYahooSymbol(symbol, market);
  const r = await rawQuoteOne(ySymbol);
  if (!r || typeof r.regularMarketPrice !== "number") {
    throw new Error(`No quote data for ${symbol} (${market})`);
  }
  return {
    symbol,
    market,
    name: displayName ?? r.shortName ?? r.longName ?? symbol,
    price: r.regularMarketPrice,
    change: r.regularMarketChange ?? 0,
    changePct: r.regularMarketChangePercent ?? 0,
    open: r.regularMarketOpen,
    high: r.regularMarketDayHigh,
    low: r.regularMarketDayLow,
    volume: r.regularMarketVolume,
    marketCap: r.marketCap,
    updatedAt: new Date().toISOString(),
  };
}

const INDEXES: { symbol: string; ySymbol: string; name: string }[] = [
  { symbol: "TAIEX", ySymbol: "^TWII", name: "加權指數" },
  { symbol: "OTC", ySymbol: "^TWOII", name: "櫃買指數" },
  { symbol: "^N225", ySymbol: "^N225", name: "日經 225" },
  // TOPIX 指數本身不在 Yahoo Finance（^TOPX/^TPX 都拉不到資料）
  // 暫時不放，未來可考慮：(a) 用 1306.T TOPIX ETF 當代理 (b) 接 stooq/Investing.com
  { symbol: "^GSPC", ySymbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", ySymbol: "^IXIC", name: "納斯達克" },
  { symbol: "^DJI", ySymbol: "^DJI", name: "道瓊" },
  { symbol: "^SOX", ySymbol: "^SOX", name: "費城半導體" },
  { symbol: "^VIX", ySymbol: "^VIX", name: "VIX 恐慌" },
  { symbol: "DX-Y.NYB", ySymbol: "DX-Y.NYB", name: "美元指數" },
];

export async function fetchIndexes(): Promise<IndexQuote[]> {
  const ySymbols = INDEXES.map((x) => x.ySymbol);
  const list = await rawQuoteMany(ySymbols);
  return INDEXES.map((meta) => {
    const r = list.find((x) => x.symbol === meta.ySymbol);
    return {
      symbol: meta.symbol,
      name: meta.name,
      price: r?.regularMarketPrice ?? 0,
      change: r?.regularMarketChange ?? 0,
      changePct: r?.regularMarketChangePercent ?? 0,
    };
  });
}

/**
 * 拉 OHLCV 給 K 線圖用，預設 120 個交易日（≈ 半年）
 */
export async function fetchOhlcv(
  symbol: string,
  market: Market,
  days: number
): Promise<OhlcvBar[]> {
  const ySymbol = await toYahooSymbol(symbol, market);

  // 抓 ~1.6 倍日曆日，扣掉週末和假日仍夠 days 個交易日
  const period1 = new Date();
  period1.setDate(period1.getDate() - Math.ceil(days * 1.6));

  const result = (await yahooFinance.chart(
    ySymbol,
    { period1, interval: "1d" },
    { validateResult: false }
  )) as { quotes?: RawChartQuote[] } | null;

  const bars = (result?.quotes ?? [])
    .filter(
      (q): q is RawChartQuote & {
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      } =>
        typeof q.open === "number" &&
        typeof q.high === "number" &&
        typeof q.low === "number" &&
        typeof q.close === "number" &&
        typeof q.volume === "number"
    )
    .map<OhlcvBar>((q) => ({
      date:
        q.date instanceof Date
          ? q.date.toISOString().slice(0, 10)
          : String(q.date).slice(0, 10),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
    }));

  // 取最後 days 筆
  return bars.slice(-days);
}

export async function fetchQuotesBatch(
  items: { symbol: string; market: Market; name?: string }[]
): Promise<Quote[]> {
  const settled = await Promise.allSettled(
    items.map((it) => fetchQuote(it.symbol, it.market, it.name))
  );
  const out: Quote[] = [];
  for (let i = 0; i < settled.length; i++) {
    const s = settled[i];
    if (s.status === "fulfilled") out.push(s.value);
    else {
      console.warn(`Quote failed for ${items[i].symbol} (${items[i].market}):`, s.reason);
    }
  }
  return out;
}

interface RawChartQuote {
  date: Date | string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  adjclose?: number | null;
}

export interface OhlcvBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * 拉日線歷史，計算最近 N 個工作天的每日漲幅 + 累積漲幅。
 *
 * 算法：
 *   - 多抓 N+1 筆，最舊一筆當 baseClose（不顯示，用來算 row[0] 的當日漲幅）
 *   - rows[0] 為最舊（10 天前），rows[N-1] 為最新
 *   - day_pct[i] = (rows[i].close - prev.close) / prev.close,  prev = rows[i-1] or base
 *   - cum_pct[i] = (rows[i].close - base.close) / base.close
 *   - 回傳前反轉，使 rows[0] 為「今天」、rows[N-1] 為 N 天前
 */
export async function fetchDailySeries(
  symbol: string,
  market: Market,
  days: number,
  displayName?: string
): Promise<DailySeries> {
  const ySymbol = await toYahooSymbol(symbol, market);

  // 抓 ~40 個日曆日 ≈ 28 個交易日，足夠包含 N+1 個工作天並避開假日
  const period1 = new Date();
  period1.setDate(period1.getDate() - 40);

  const result = (await yahooFinance.chart(
    ySymbol,
    { period1, interval: "1d" },
    { validateResult: false }
  )) as { quotes?: RawChartQuote[] } | null;

  const rawQuotes = (result?.quotes ?? []).filter(
    (q): q is RawChartQuote & { close: number } =>
      typeof q.close === "number" && Number.isFinite(q.close)
  );

  if (rawQuotes.length < days + 1) {
    throw new Error(`Not enough daily bars for ${symbol} (got ${rawQuotes.length}, need ${days + 1})`);
  }

  // 取最後 days+1 筆（chart 預設由舊到新）
  const window = rawQuotes.slice(-(days + 1));
  const base = window[0];
  const display = window.slice(1);

  const oldestFirst: DailyRow[] = display.map((q, i) => {
    const prevClose = i === 0 ? base.close : (display[i - 1].close as number);
    const change = q.close - prevClose;
    const changePct = prevClose === 0 ? 0 : (change / prevClose) * 100;
    const cumPct = base.close === 0 ? 0 : ((q.close - base.close) / base.close) * 100;
    const dateStr = q.date instanceof Date ? q.date.toISOString().slice(0, 10) : String(q.date).slice(0, 10);
    return {
      date: dateStr,
      close: q.close,
      change,
      changePct,
      cumPct,
    };
  });

  // 反轉：rows[0] = 最新
  const rows = [...oldestFirst].reverse();
  const cumulativePct = rows[0]?.cumPct ?? 0;

  return {
    symbol,
    market,
    name: displayName ?? symbol,
    rows,
    baseClose: base.close,
    cumulativePct,
  };
}
