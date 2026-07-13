import { loadTokens, saveTokens } from "./tokenStore";
import type { SpotifyTokens } from "./types";

export const REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI ||
  `http://127.0.0.1:${process.env.PORT || 3000}/callback`;

export const SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-private",
].join(" ");

function clientId(): string {
  const id = process.env.SPOTIFY_CLIENT_ID;
  if (!id) throw new Error("SPOTIFY_CLIENT_ID is not set. See .env.example.");
  return id;
}

export function buildAuthorizeUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state,
    scope: SCOPES,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId(),
    code_verifier: codeVerifier,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token exchange failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const tokens: SpotifyTokens = {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + (json.expires_in - 30) * 1000,
    scope: json.scope,
  };
  saveTokens(tokens);
  return tokens;
}

async function refreshTokens(refreshToken: string): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId(),
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token refresh failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const existing = loadTokens();
  const tokens: SpotifyTokens = {
    access_token: json.access_token,
    // Spotify sometimes omits refresh_token on refresh — reuse the old one.
    refresh_token: json.refresh_token || refreshToken,
    expires_at: Date.now() + (json.expires_in - 30) * 1000,
    scope: json.scope || existing?.scope || SCOPES,
  };
  saveTokens(tokens);
  return tokens;
}

/** Returns a valid access token, refreshing first if it's expired or about to expire. */
export async function getValidAccessToken(): Promise<string> {
  const tokens = loadTokens();
  if (!tokens) throw new Error("NOT_CONNECTED");
  if (Date.now() < tokens.expires_at) return tokens.access_token;
  const refreshed = await refreshTokens(tokens.refresh_token);
  return refreshed.access_token;
}
