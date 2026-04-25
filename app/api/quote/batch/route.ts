import { NextResponse, type NextRequest } from "next/server";
import { fetchQuotesBatch } from "@/lib/yahoo";
import type { Market } from "@/types";

export const revalidate = 30;

/**
 * GET /api/quote/batch?items=2330:TW,AAPL:US,7011:JP
 *   逗號分隔，每項 symbol:market（market 為 TW / JP / US）
 */
export async function GET(req: NextRequest) {
  const itemsParam = req.nextUrl.searchParams.get("items") ?? "";
  const items = itemsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [symbol, market] = pair.split(":");
      return { symbol, market: market as Market };
    })
    .filter(
      (it) => it.symbol && (it.market === "TW" || it.market === "JP" || it.market === "US")
    );

  if (items.length === 0) {
    return NextResponse.json({ quotes: [], updatedAt: new Date().toISOString() });
  }

  try {
    const quotes = await fetchQuotesBatch(items);
    return NextResponse.json(
      { quotes, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    console.error("fetchQuotesBatch failed", error);
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 502 });
  }
}
