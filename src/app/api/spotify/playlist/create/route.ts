import { NextRequest, NextResponse } from "next/server";
import { createPlaylist } from "@/lib/spotifyClient";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { name, description, uris } = await req.json();
    if (!name || !Array.isArray(uris)) {
      return NextResponse.json({ error: "name and uris[] are required" }, { status: 400 });
    }
    const result = await createPlaylist(name, description ?? "", uris);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}
