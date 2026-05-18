import YahooFinance from "yahoo-finance2";
import type {
  DailyRow,
  DailySeries,
  Earnings,
  EarningsHistoryRow,
  Fundamental,
  Holders,
  IndexQuote,
  InstitutionHolder,
  Market,
  Quote,
} from "@/types";

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

interface RawSummary {
  summaryDetail?: {
    trailingPE?: number;
    forwardPE?: number;
    dividendYield?: number;
    beta?: number;
    marketCap?: number;
    priceToBook?: number;
  };
  defaultKeyStatistics?: {
    forwardPE?: number;
    priceToBook?: number;
    trailingEps?: number;
    beta?: number;
  };
  financialData?: {
    returnOnEquity?: number;
    grossMargins?: number;
    revenueGrowth?: number;
    profitMargins?: number;
    targetMeanPrice?: number;
  };
}

function toPct(v: number | undefined): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return v * 100;
}

function pickNumber(...vals: (number | undefined)[]): number | undefined {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}

export async function fetchFundamental(
  symbol: string,
  market: Market
): Promise<Fundamental> {
  const ySymbol = await toYahooSymbol(symbol, market);
  const r = (await yahooFinance.quoteSummary(
    ySymbol,
    { modules: ["summaryDetail", "defaultKeyStatistics", "financialData"] },
    { validateResult: false }
  )) as RawSummary | null;

  const sd = r?.summaryDetail ?? {};
  const ks = r?.defaultKeyStatistics ?? {};
  const fd = r?.financialData ?? {};

  return {
    pe: sd.trailingPE,
    forwardPe: pickNumber(sd.forwardPE, ks.forwardPE),
    pb: pickNumber(ks.priceToBook, sd.priceToBook),
    roe: toPct(fd.returnOnEquity),
    eps: ks.trailingEps,
    dividendYield: toPct(sd.dividendYield),
    grossMargin: toPct(fd.grossMargins),
    revenueYoy: toPct(fd.revenueGrowth),
    beta: pickNumber(sd.beta, ks.beta),
    marketCap: sd.marketCap,
    targetMeanPrice: pickNumber(fd.targetMeanPrice),
  };
}

interface RawHoldersSummary {
  majorHoldersBreakdown?: {
    insidersPercentHeld?: number;
    institutionsPercentHeld?: number;
    institutionsFloatPercentHeld?: number;
    institutionsCount?: number;
  };
  institutionOwnership?: {
    ownershipList?: {
      organization?: string;
      reportDate?: Date | string;
      position?: number;
      pctChange?: number;
    }[];
  };
  netSharePurchaseActivity?: {
    period?: string;
    netInstSharesBuying?: number;
    netInstBuyingPercent?: number;
    netPercentInsiderShares?: number;
  };
}

function toDateStr(v: Date | string | undefined): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

export async function fetchHolders(symbol: string, market: Market): Promise<Holders> {
  const ySymbol = await toYahooSymbol(symbol, market);
  const modules =
    market === "US"
      ? (["majorHoldersBreakdown", "institutionOwnership", "netSharePurchaseActivity"] as const)
      : (["majorHoldersBreakdown"] as const);

  const r = (await yahooFinance.quoteSummary(
    ySymbol,
    { modules: modules as unknown as "majorHoldersBreakdown"[] },
    { validateResult: false }
  )) as RawHoldersSummary | null;

  const mh = r?.majorHoldersBreakdown ?? {};
  const list = r?.institutionOwnership?.ownershipList ?? [];
  const net = r?.netSharePurchaseActivity ?? {};

  const topInstitutions: InstitutionHolder[] = list
    .filter((x) => typeof x.position === "number" && typeof x.organization === "string")
    .map((x) => ({
      name: x.organization as string,
      reportDate: toDateStr(x.reportDate),
      position: x.position as number,
      pctChange: pickNumber(x.pctChange),
    }));

  return {
    institutionsPercentHeld: pickNumber(mh.institutionsPercentHeld),
    institutionsFloatPercentHeld: pickNumber(mh.institutionsFloatPercentHeld),
    insidersPercentHeld: pickNumber(mh.insidersPercentHeld),
    institutionsCount: pickNumber(mh.institutionsCount),
    topInstitutions,
    netInstBuyingPercent: pickNumber(net.netInstBuyingPercent),
    netPercentInsiderShares: pickNumber(net.netPercentInsiderShares),
    netInstSharesBuying: pickNumber(net.netInstSharesBuying),
    period: net.period,
  };
}

interface RawEarningsSummary {
  calendarEvents?: {
    earnings?: {
      earningsDate?: (Date | string)[];
      isEarningsDateEstimate?: boolean;
      earningsAverage?: number;
      earningsLow?: number;
      earningsHigh?: number;
      revenueAverage?: number;
    };
  };
  earningsHistory?: {
    history?: {
      quarter?: Date | string;
      epsActual?: number;
      epsEstimate?: number;
      surprisePercent?: number;
    }[];
  };
}

export async function fetchEarnings(symbol: string, market: Market): Promise<Earnings> {
  const ySymbol = await toYahooSymbol(symbol, market);
  const r = (await yahooFinance.quoteSummary(
    ySymbol,
    { modules: ["calendarEvents", "earningsHistory"] },
    { validateResult: false }
  )) as RawEarningsSummary | null;

  const ce = r?.calendarEvents?.earnings ?? {};
  const dates = ce.earningsDate ?? [];
  const history: EarningsHistoryRow[] = (r?.earningsHistory?.history ?? [])
    .filter((x) => x.quarter)
    .map((x) => ({
      quarter: toDateStr(x.quarter),
      epsActual: pickNumber(x.epsActual),
      epsEstimate: pickNumber(x.epsEstimate),
      surprisePercent: pickNumber(x.surprisePercent),
    }));

  return {
    nextEarningsDate: dates.length > 0 ? toDateStr(dates[0]) : undefined,
    isNextEstimate: ce.isEarningsDateEstimate,
    nextEpsEstimate: pickNumber(ce.earningsAverage),
    nextEpsLow: pickNumber(ce.earningsLow),
    nextEpsHigh: pickNumber(ce.earningsHigh),
    nextRevenueEstimate: pickNumber(ce.revenueAverage),
    history,
  };
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
