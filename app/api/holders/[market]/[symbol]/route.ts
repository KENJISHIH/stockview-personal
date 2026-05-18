import { NextResponse } from "next/server";
import { fetchHolders } from "@/lib/yahoo";
import type { Market } from "@/types";

export const revalidate = 86400;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ market: string; symbol: string }> }
) {
  const { market, symbol } = await ctx.params;
  if (market !== "TW" && market !== "JP" && market !== "US") {
    return NextResponse.json({ error: "Invalid market" }, { status: 400 });
  }
  try {
    const data = await fetchHolders(symbol, market as Market);
    return NextResponse.json(
      { holders: data },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" } }
    );
  } catch (error) {
    console.error(`fetchHolders(${symbol}, ${market}) failed`, error);
    return NextResponse.json({ error: "Failed to fetch holders" }, { status: 502 });
  }
}
