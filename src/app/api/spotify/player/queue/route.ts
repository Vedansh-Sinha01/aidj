import { NextRequest, NextResponse } from "next/server";
import { addToQueue, getQueue } from "@/lib/spotifyClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const queue = await getQueue();
    return NextResponse.json(queue);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { uri } = await req.json();
    if (!uri) return NextResponse.json({ error: "uri is required" }, { status: 400 });
    await addToQueue(uri);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}
