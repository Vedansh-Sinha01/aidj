import { NextRequest, NextResponse } from "next/server";
import { getPlaybackState, transferPlayback, startPlayback } from "@/lib/spotifyClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getPlaybackState();
    return NextResponse.json({ state });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Starts the set: transfers to the chosen device and plays the first URIs.
  // Optional positionMs seeks into the first track — used by Cut Mode to honor its start_ms.
  try {
    const { deviceId, uris, positionMs } = await req.json();
    if (!deviceId || !Array.isArray(uris) || uris.length === 0) {
      return NextResponse.json({ error: "deviceId and uris[] are required" }, { status: 400 });
    }
    await transferPlayback(deviceId, false);
    await new Promise((r) => setTimeout(r, 400));
    await startPlayback(deviceId, uris, typeof positionMs === "number" ? positionMs : undefined);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}
