import { NextResponse } from "next/server";
import { fetchIndexes } from "@/lib/yahoo";

export const revalidate = 60;

export async function GET() {
  try {
    const indexes = await fetchIndexes();
    return NextResponse.json(
      { indexes, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (error) {
    console.error("fetchIndexes failed", error);
    return NextResponse.json({ error: "Failed to fetch indexes" }, { status: 502 });
  }
}
