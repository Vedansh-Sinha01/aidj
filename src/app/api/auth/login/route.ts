import { NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/spotifyAuth";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "@/lib/pkce";
import { setPendingVerifier } from "@/lib/tokenStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = generateState();
  setPendingVerifier(verifier);

  const url = buildAuthorizeUrl(state, challenge);
  const res = NextResponse.redirect(url);
  res.cookies.set("sa_state", state, { httpOnly: true, maxAge: 600, sameSite: "lax" });
  return res;
}
