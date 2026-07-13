import { NextRequest, NextResponse } from "next/server";
import { generateSteerResponse } from "@/lib/claude";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { instruction, pool, remainingSetlist, playedHistory, bannedUris } = await req.json();
    if (!instruction || !Array.isArray(pool)) {
      return NextResponse.json({ error: "instruction and pool[] are required" }, { status: 400 });
    }
    const result = await generateSteerResponse({
      instruction,
      pool,
      remainingSetlist: remainingSetlist ?? [],
      playedHistory: playedHistory ?? [],
      bannedUris: bannedUris ?? [],
    });
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}
