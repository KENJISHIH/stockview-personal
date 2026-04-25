import YahooFinance from "yahoo-finance2";
import type { IndexQuote, Market, Quote } from "@/types";

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
