import fs from "fs";
import path from "path";
import type { SpotifyTokens } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const TOKEN_PATH = path.join(DATA_DIR, "tokens.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function saveTokens(tokens: SpotifyTokens): void {
  ensureDataDir();
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), "utf-8");
}

export function loadTokens(): SpotifyTokens | null {
  try {
    const raw = fs.readFileSync(TOKEN_PATH, "utf-8");
    return JSON.parse(raw) as SpotifyTokens;
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  try {
    fs.unlinkSync(TOKEN_PATH);
  } catch {
    // already gone
  }
}

// In-memory store for the PKCE code_verifier between /login and /callback.
// A single-user local app; no need for cookie-based session juggling.
let pendingVerifier: string | null = null;

export function setPendingVerifier(v: string) {
  pendingVerifier = v;
}

export function takePendingVerifier(): string | null {
  const v = pendingVerifier;
  pendingVerifier = null;
  return v;
}
