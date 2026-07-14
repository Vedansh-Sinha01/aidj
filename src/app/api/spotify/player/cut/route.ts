import { NextRequest, NextResponse } from "next/server";
import { startPlayback } from "@/lib/spotifyClient";

export const dynamic = "force-dynamic";

/**
 * Cut Mode's core move: immediately switch playback to a specific track at a
 * specific position. This is a normal PUT /me/player/play call with a single
 * URI and a position_ms offset — Spotify has no "jump to queue item N at
 * position X" primitive, so cutting to the next track means directly
 * commanding "play this uri, starting here" rather than relying on the
 * device's own queue to advance naturally.
 */
export async function POST(req: NextRequest) {
  try {
    const { deviceId, uri, positionMs } = await req.json();
    if (!deviceId || !uri) {
      return NextResponse.json({ error: "deviceId and uri are required" }, { status: 400 });
    }
    await startPlayback(deviceId, [uri], typeof positionMs === "number" ? positionMs : 0);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}
