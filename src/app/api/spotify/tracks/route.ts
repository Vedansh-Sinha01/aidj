import { NextRequest, NextResponse } from "next/server";
import { getPlaylistTracks } from "@/lib/spotifyClient";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const playlistId = req.nextUrl.searchParams.get("playlistId");
  if (!playlistId) return NextResponse.json({ error: "playlistId is required" }, { status: 400 });
  try {
    const tracks = await getPlaylistTracks(playlistId);
    return NextResponse.json({ tracks });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    if (msg === "NOT_CONNECTED") return NextResponse.json({ error: "not_connected" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
