import { NextRequest, NextResponse } from "next/server";
import { getPlaylistMeta, parsePlaylistId } from "@/lib/spotifyClient";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    const id = parsePlaylistId(input);
    const meta = await getPlaylistMeta(id);
    return NextResponse.json({ id, ...meta });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 400 });
  }
}
