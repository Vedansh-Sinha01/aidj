import { NextRequest, NextResponse } from "next/server";
import { seekToPosition } from "@/lib/spotifyClient";

export const dynamic = "force-dynamic";

/**
 * Seeks within the currently playing track — does NOT change which track is
 * loaded. Provided for completeness / drift correction; the cut engine itself
 * uses POST /api/spotify/player/cut (play-with-position) for track-to-track
 * cuts, since seek alone can't switch tracks.
 */
export async function POST(req: NextRequest) {
  try {
    const { positionMs, deviceId } = await req.json();
    if (typeof positionMs !== "number") {
      return NextResponse.json({ error: "positionMs is required" }, { status: 400 });
    }
    await seekToPosition(positionMs, deviceId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}
