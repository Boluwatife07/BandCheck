import { NextRequest, NextResponse } from "next/server";
import { searchFeeders } from "@/lib/search";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const disco = searchParams.get("disco") ?? undefined;

  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  const results = searchFeeders(q, disco);
  return NextResponse.json({ results });
}
