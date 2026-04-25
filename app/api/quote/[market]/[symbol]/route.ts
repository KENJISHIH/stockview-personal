import { NextResponse } from "next/server";
import { fetchQuote } from "@/lib/yahoo";
import type { Market } from "@/types";

export const revalidate = 30;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ market: string; symbol: string }> }
) {
  const { market, symbol } = await ctx.params;
  if (market !== "TW" && market !== "US") {
    return NextResponse.json({ error: "Invalid market" }, { status: 400 });
  }
  try {
    const quote = await fetchQuote(symbol, market as Market);
    return NextResponse.json(
      { quote },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    console.error(`fetchQuote(${symbol}, ${market}) failed`, error);
    return NextResponse.json({ error: "Failed to fetch quote" }, { status: 502 });
  }
}
