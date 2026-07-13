// Thin fetch helpers for the browser side. Every call goes through our own
// Next.js API routes — the browser never talks to Spotify or Anthropic directly.

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || `Request to ${url} failed (${res.status})`);
  }
  return body as T;
}

export const api = {
  authStatus: () => j<{ connected: boolean; displayName?: string; imageUrl?: string | null; error?: string }>(
    "/api/auth/status"
  ),
  logout: () => j<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  playlists: () => j<{ playlists: any[] }>("/api/spotify/playlists"),
  resolvePlaylist: (input: string) =>
    j<{ id: string; name: string; owner: string; imageUrl: string | null; trackCount: number }>(
      "/api/spotify/playlists/resolve",
      { method: "POST", body: JSON.stringify({ input }) }
    ),
  tracks: (playlistId: string) => j<{ tracks: any[] }>(`/api/spotify/tracks?playlistId=${playlistId}`),
  devices: () => j<{ devices: any[] }>("/api/spotify/devices"),
  playerState: () => j<{ state: any | null }>("/api/spotify/player"),
  startSet: (deviceId: string, uris: string[]) =>
    j<{ ok: boolean }>("/api/spotify/player", { method: "POST", body: JSON.stringify({ deviceId, uris }) }),
  play: () => j<{ ok: boolean }>("/api/spotify/player/play", { method: "POST" }),
  pause: () => j<{ ok: boolean }>("/api/spotify/player/pause", { method: "POST" }),
  next: () => j<{ ok: boolean }>("/api/spotify/player/next", { method: "POST" }),
  queueTrack: (uri: string) =>
    j<{ ok: boolean }>("/api/spotify/player/queue", { method: "POST", body: JSON.stringify({ uri }) }),
  createPlaylist: (name: string, description: string, uris: string[]) =>
    j<{ id: string; url: string }>("/api/spotify/playlist/create", {
      method: "POST",
      body: JSON.stringify({ name, description, uris }),
    }),
  plan: (brief: string, tracks: any[], targetLengthMinutes: number | undefined, mcMode: boolean) =>
    j<{ plan: any }>("/api/claude/plan", {
      method: "POST",
      body: JSON.stringify({ brief, tracks, targetLengthMinutes, mcMode }),
    }),
  steer: (payload: {
    instruction: string;
    pool: any[];
    remainingSetlist: any[];
    playedHistory: any[];
    bannedUris: string[];
  }) => j<{ result: any }>("/api/claude/steer", { method: "POST", body: JSON.stringify(payload) }),
};
