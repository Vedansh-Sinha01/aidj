import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/spotifyAuth";
import { takePendingVerifier } from "@/lib/tokenStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const expectedState = req.cookies.get("sa_state")?.value;

  const origin = url.origin;

  if (error) {
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error)}`);
  }
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(`${origin}/?auth_error=state_mismatch`);
  }
  const verifier = takePendingVerifier();
  if (!verifier) {
    return NextResponse.redirect(`${origin}/?auth_error=missing_verifier`);
  }

  try {
    await exchangeCodeForTokens(code, verifier);
  } catch (e) {
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent(e instanceof Error ? e.message : "token_exchange_failed")}`
    );
  }

  const res = NextResponse.redirect(`${origin}/`);
  res.cookies.delete("sa_state");
  return res;
}
