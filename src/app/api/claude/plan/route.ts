import { NextRequest, NextResponse } from "next/server";
import { generateSetPlan } from "@/lib/claude";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { brief, tracks, targetLengthMinutes, mcMode, cutMode } = await req.json();
    if (!Array.isArray(tracks) || tracks.length === 0) {
      return NextResponse.json({ error: "tracks[] is required" }, { status: 400 });
    }
    const plan = await generateSetPlan({
      brief: brief ?? "",
      tracks,
      targetLengthMinutes: targetLengthMinutes || undefined,
      mcMode: !!mcMode,
      cutMode: !!cutMode,
    });
    return NextResponse.json({ plan });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}
