import { NextResponse } from "next/server";
import { fetchFundamental } from "@/lib/yahoo";
import type { Market } from "@/types";

export const revalidate = 86400; // 1 day

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ market: string; symbol: string }> }
) {
  const { market, symbol } = await ctx.params;
  if (market !== "TW" && market !== "JP" && market !== "US") {
    return NextResponse.json({ error: "Invalid market" }, { status: 400 });
  }
  try {
    const data = await fetchFundamental(symbol, market as Market);
    return NextResponse.json(
      { fundamental: data },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" } }
    );
  } catch (error) {
    console.error(`fetchFundamental(${symbol}, ${market}) failed`, error);
    return NextResponse.json({ error: "Failed to fetch fundamental" }, { status: 502 });
  }
}
