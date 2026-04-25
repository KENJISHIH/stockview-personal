import { NextResponse, type NextRequest } from "next/server";
import { fetchOhlcv } from "@/lib/yahoo";
import type { Market } from "@/types";

export const revalidate = 300; // 5 分鐘

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ market: string; symbol: string }> }
) {
  const { market, symbol } = await ctx.params;
  if (market !== "TW" && market !== "JP" && market !== "US") {
    return NextResponse.json({ error: "Invalid market" }, { status: 400 });
  }
  const daysParam = req.nextUrl.searchParams.get("days");
  const days = Math.min(Math.max(parseInt(daysParam ?? "120", 10) || 120, 30), 365);

  try {
    const bars = await fetchOhlcv(symbol, market as Market, days);
    return NextResponse.json(
      { symbol, market, days, bars },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (error) {
    console.error(`fetchOhlcv(${symbol}, ${market}) failed`, error);
    return NextResponse.json({ error: "Failed to fetch OHLCV" }, { status: 502 });
  }
}
