import { NextResponse } from "next/server";
import { loadTokens } from "@/lib/tokenStore";
import { getMe } from "@/lib/spotifyClient";

export const dynamic = "force-dynamic";

export async function GET() {
  const tokens = loadTokens();
  if (!tokens) return NextResponse.json({ connected: false });

  try {
    const me = await getMe();
    return NextResponse.json({
      connected: true,
      displayName: me.display_name,
      imageUrl: me.images?.[0]?.url ?? null,
    });
  } catch (e) {
    return NextResponse.json({ connected: false, error: e instanceof Error ? e.message : "unknown error" });
  }
}
