import { getValidAccessToken } from "./spotifyAuth";
import type { PlaylistSummary, Track } from "./types";

const API_BASE = "https://api.spotify.com/v1";

class SpotifyApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch wrapper that attaches auth, retries once on 401, and respects Retry-After on 429. */
async function spotifyFetch(
  pathOrUrl: string,
  init: RequestInit = {},
  attempt = 0
): Promise<Response> {
  const token = await getValidAccessToken();
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_BASE}${pathOrUrl}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 429 && attempt < 5) {
    const retryAfter = Number(res.headers.get("Retry-After") || "1");
    await sleep((retryAfter + 0.5) * 1000);
    return spotifyFetch(pathOrUrl, init, attempt + 1);
  }

  return res;
}

async function spotifyJson<T>(pathOrUrl: string, init?: RequestInit): Promise<T> {
  const res = await spotifyFetch(pathOrUrl, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new SpotifyApiError(res.status, `Spotify API ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export { SpotifyApiError, spotifyFetch, spotifyJson };

export async function getMe(): Promise<{ id: string; display_name: string; images: { url: string }[] }> {
  return spotifyJson("/me");
}

export async function listMyPlaylists(): Promise<PlaylistSummary[]> {
  const items: PlaylistSummary[] = [];
  let offset = 0;
  const limit = 50;
  // GET /me/playlists pagination via `next` is known-broken post Feb 2026 migration
  // (next URL points at a removed endpoint) — page manually via limit/offset instead.
  for (;;) {
    const page = await spotifyJson<{
      items: any[];
      total: number;
    }>(`/me/playlists?limit=${limit}&offset=${offset}`);
    for (const p of page.items) {
      if (!p) continue;
      items.push({
        id: p.id,
        name: p.name,
        imageUrl: p.images?.[0]?.url ?? null,
        trackCount: p.tracks?.total ?? 0,
        owner: p.owner?.display_name ?? p.owner?.id ?? "unknown",
        uri: p.uri,
      });
    }
    offset += limit;
    if (offset >= page.total || page.items.length === 0) break;
  }
  return items;
}

/** Accepts a raw playlist ID, a spotify:playlist:ID URI, or an open.spotify.com URL. */
export function parsePlaylistId(input: string): string {
  const trimmed = input.trim();
  const uriMatch = trimmed.match(/^spotify:playlist:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];
  const urlMatch = trimmed.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  if (/^[a-zA-Z0-9]+$/.test(trimmed)) return trimmed;
  throw new Error("Could not parse a playlist ID from that input.");
}

export async function getPlaylistMeta(playlistId: string): Promise<{
  name: string;
  owner: string;
  imageUrl: string | null;
  trackCount: number;
}> {
  const p = await spotifyJson<any>(
    `/playlists/${playlistId}?fields=name,owner(display_name,id),images,tracks(total)`
  );
  return {
    name: p.name,
    owner: p.owner?.display_name ?? p.owner?.id ?? "unknown",
    imageUrl: p.images?.[0]?.url ?? null,
    trackCount: p.tracks?.total ?? 0,
  };
}

/** Fetches every track in a playlist, paginating and deduping by URI. Skips local/unavailable tracks. */
export async function getPlaylistTracks(playlistId: string): Promise<Track[]> {
  const tracks: Track[] = [];
  const seen = new Set<string>();
  const limit = 100;
  let offset = 0;
  const fields =
    "items(added_at,track(uri,id,name,artists(name),album(name,release_date),duration_ms,is_local)),next,total";

  for (;;) {
    const page = await spotifyJson<any>(
      `/playlists/${playlistId}/items?limit=${limit}&offset=${offset}&fields=${encodeURIComponent(
        fields
      )}&additional_types=track`
    );
    for (const item of page.items ?? []) {
      const t = item.track;
      if (!t || t.is_local || !t.uri || !t.id) continue;
      if (seen.has(t.uri)) continue;
      seen.add(t.uri);
      const year = t.album?.release_date ? parseInt(t.album.release_date.slice(0, 4), 10) : null;
      tracks.push({
        uri: t.uri,
        id: t.id,
        title: t.name,
        artists: (t.artists ?? []).map((a: any) => a.name),
        album: t.album?.name ?? "",
        releaseYear: Number.isFinite(year) ? year : null,
        durationMs: t.duration_ms ?? 0,
        addedAt: item.added_at,
      });
    }
    offset += limit;
    if (offset >= (page.total ?? 0) || (page.items ?? []).length === 0) break;
  }
  return tracks;
}

export async function getDevices(): Promise<
  { id: string; name: string; type: string; is_active: boolean; volume_percent: number | null }[]
> {
  const data = await spotifyJson<{ devices: any[] }>("/me/player/devices");
  return data.devices ?? [];
}

export async function getPlaybackState(): Promise<any | null> {
  const res = await spotifyFetch("/me/player");
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new SpotifyApiError(res.status, await res.text());
  return res.json();
}

export async function startPlayback(deviceId: string, uris: string[], positionMs?: number): Promise<void> {
  const body: Record<string, unknown> = { uris };
  if (typeof positionMs === "number") body.position_ms = Math.max(0, Math.floor(positionMs));
  await spotifyFetch(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Seeks within the CURRENTLY PLAYING track — does not change which track is loaded. */
export async function seekToPosition(positionMs: number, deviceId?: string): Promise<void> {
  const qs = new URLSearchParams({ position_ms: String(Math.max(0, Math.floor(positionMs))) });
  if (deviceId) qs.set("device_id", deviceId);
  await spotifyFetch(`/me/player/seek?${qs.toString()}`, { method: "PUT" });
}

export async function transferPlayback(deviceId: string, play = true): Promise<void> {
  await spotifyFetch("/me/player", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_ids: [deviceId], play }),
  });
}

export async function pausePlayback(): Promise<void> {
  await spotifyFetch("/me/player/pause", { method: "PUT" });
}

export async function resumePlayback(): Promise<void> {
  await spotifyFetch("/me/player/play", { method: "PUT" });
}

export async function skipToNext(): Promise<void> {
  await spotifyFetch("/me/player/next", { method: "POST" });
}

export async function addToQueue(uri: string): Promise<void> {
  await spotifyFetch(`/me/player/queue?uri=${encodeURIComponent(uri)}`, { method: "POST" });
}

export async function getQueue(): Promise<{ currently_playing: any; queue: any[] }> {
  return spotifyJson("/me/player/queue");
}

export async function createPlaylist(
  name: string,
  description: string,
  uris: string[]
): Promise<{ id: string; url: string }> {
  // Feb 2026 migration: playlist creation moved to POST /me/playlists
  // (the old POST /users/{user_id}/playlists endpoint was removed).
  const playlist = await spotifyJson<any>("/me/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, public: false }),
  });

  // Adding items: POST /playlists/{id}/items (renamed from /tracks in the same migration).
  const chunkSize = 100;
  for (let i = 0; i < uris.length; i += chunkSize) {
    const chunk = uris.slice(i, i + chunkSize);
    await spotifyFetch(`/playlists/${playlist.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uris: chunk }),
    });
  }

  return { id: playlist.id, url: playlist.external_urls?.spotify ?? "" };
}
