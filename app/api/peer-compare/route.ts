import { NextResponse, type NextRequest } from "next/server";
import { fetchQuote, fetchFundamental } from "@/lib/yahoo";
import type { Market, PeerRow } from "@/types";

export const revalidate = 300;

/**
 * GET /api/peer-compare?items=2330:TW:台積電,3037:TW:欣興
 *   逗號分隔，每項 symbol:market:name（name 可省略，會用 Yahoo 名稱）
 *   回傳每檔的 quote + fundamental 合併，並計算 P/E（用 TTM EPS）
 */
export async function GET(req: NextRequest) {
  const itemsParam = req.nextUrl.searchParams.get("items") ?? "";
  const items = itemsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((triple) => {
      const [symbol, market, name] = triple.split(":");
      return { symbol, market: market as Market, name: name ?? symbol };
    })
    .filter(
      (it) => it.symbol && (it.market === "TW" || it.market === "JP" || it.market === "US")
    );

  if (items.length === 0) {
    return NextResponse.json({ rows: [], updatedAt: new Date().toISOString() });
  }

  const settled = await Promise.allSettled(
    items.map(async (it) => {
      const [quote, fundamental] = await Promise.all([
        fetchQuote(it.symbol, it.market, it.name).catch(() => null),
        fetchFundamental(it.symbol, it.market).catch(() => null),
      ]);
      const eps = fundamental?.eps;
      const price = quote?.price;
      const peFromYahoo = fundamental?.pe;
      const peComputed =
        typeof price === "number" && typeof eps === "number" && eps > 0
          ? price / eps
          : undefined;
      const row: PeerRow = {
        symbol: it.symbol,
        market: it.market,
        name: quote?.name ?? it.name,
        price,
        changePct: quote?.changePct,
        eps,
        pe: peFromYahoo ?? peComputed,
        forwardPe: fundamental?.forwardPe,
        marketCap: fundamental?.marketCap ?? quote?.marketCap,
      };
      return row;
    })
  );

  const rows: PeerRow[] = settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value;
    return {
      symbol: items[i].symbol,
      market: items[i].market,
      name: items[i].name,
      error: "fetch failed",
    };
  });

  return NextResponse.json(
    { rows, updatedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
