import { NextResponse } from "next/server";
import { getDevices } from "@/lib/spotifyClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const devices = await getDevices();
    return NextResponse.json({ devices });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}
