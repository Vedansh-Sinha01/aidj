import { NextResponse } from "next/server";
import { skipToNext } from "@/lib/spotifyClient";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await skipToNext();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}
