import { NextResponse } from "next/server";
import { listMyPlaylists } from "@/lib/spotifyClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const playlists = await listMyPlaylists();
    return NextResponse.json({ playlists });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    if (msg === "NOT_CONNECTED") return NextResponse.json({ error: "not_connected" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
