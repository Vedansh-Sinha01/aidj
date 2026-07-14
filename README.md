# Set Architect — an AI DJ for Spotify

Set Architect takes **one Spotify playlist**, uses Claude as its "music brain" to
design and shuffle it into a set with a deliberate energy arc, pushes it to your
Spotify queue, and lets you steer the set live from the couch. Spotify handles
playback; this app is the DJ's booth and brain — every track comes from your
playlist, but the *order* is designed, not random.

## Requirements

- Spotify **Premium** (required for playback control via the Web API)
- Node.js 18.17+
- A Spotify Developer app (free)
- An Anthropic API key

## 1. Spotify Developer Dashboard setup

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and log in.
2. Click **Create app**.
   - App name / description: anything (e.g. "Set Architect").
   - **Redirect URI**: enter exactly

     ```
     http://127.0.0.1:3000/callback
     ```

     Spotify no longer accepts `localhost` — it must be the loopback IP `127.0.0.1`. If you run
     the dev server on a different port, set `PORT` in `.env` and use that port here instead.
   - APIs used: check "Web API".
3. Save, then open **Settings** on the app and copy the **Client ID**. You do not need the
   Client Secret — this app uses Authorization Code with PKCE, which never needs it.

## 2. Anthropic API key

Get a key from the [Anthropic Console](https://console.anthropic.com/settings/keys).

## 3. Configure and run

```bash
cp .env.example .env
# edit .env and paste in SPOTIFY_CLIENT_ID and ANTHROPIC_API_KEY

npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Click **Connect Spotify**, approve
access, and you're in.

Spotify tokens are cached in `data/tokens.json` (gitignored) so you don't have to
re-auth on every restart; refresh happens automatically.

## How it works

1. **Pick a playlist** — from your library, or by pasting a playlist link/URI. All of
   its tracks (up to Spotify's pagination limits) become the entire universe of tracks
   for the session — the DJ never plays anything outside it.
2. **Describe the vibe** — a free-text brief ("2-hour house party, start mellow, peak
   around 90 min, end warm") or leave it blank for a sensible warmup → build → peak →
   cooldown arc. Optionally cap the set length; Claude will pick which tracks make the
   cut and show you what got benched and why.
3. **Review the energy arc** — a chart of energy over the set, with the full tracklist
   below it. Drag to reorder, lock tracks in place, or remove any you don't want, before
   you start playback.
4. **Start the set** — pick a device (or it's picked automatically if only one is
   active), and the app starts playback and keeps the next 2–3 tracks queued on Spotify,
   topping up as the set progresses. It never dumps the whole set into the queue at
   once, so it stays steerable throughout.
5. **Steer it live** — type into the command bar (press `/` to focus) for either vibe
   steering ("take it darker", "more 90s hip-hop") or direct commands ("play Bohemian
   Rhapsody next", "don't play that one tonight"). Ambiguous references show tap-to-confirm
   candidates. There's a one-level undo for the last command, and the skip button also
   counts as feedback the DJ brain considers when re-planning.
6. **Save the set** — once you're happy (any time, mid-set or after), save the played +
   remaining order as a new Spotify playlist.

### Cut Mode

Toggle **Cut Mode** next to MC mode before designing the set, and Claude also chooses a
`start_ms`/`end_ms` for every track — skipping long intros, dropping in near the hook, and
exiting right after the best chorus instead of letting the track ring out. While the set
plays, the app polls Spotify's playback position every ~700ms and hard-cuts to the next
track's `start_ms` the instant the current one crosses its planned `end_ms` — no
front-to-back playback. The setlist shows each track's planned segment (e.g. `1:05 → 3:40`)
and Now Playing shows a countdown to the next cut. Live steering and re-plans keep working
in Cut Mode: every re-plan (a vibe steer, a pin/ban, or a skip) regenerates fresh cut points
for the tracks it touches. Since Spotify can't crossfade for us, turn on Spotify's own
crossfade (Settings → Playback → Crossfade, 8–12s) so the cuts blend instead of hitting
abruptly — the app reminds you once the set starts.

## Known limitations

- **No BPM/key data from Spotify.** The `/v1/audio-features` and `/v1/audio-analysis`
  endpoints were deprecated by Spotify on Nov 27, 2024 and return 403 for all new apps.
  Every `estimated_bpm`, `energy_1_to_10`, and Cut Mode `start_ms`/`end_ms` value in this
  app is Claude's best estimate from its general knowledge of the track/artist — treat them
  as musically sensible guidance, not measured data.
- **No true crossfading or beatmatching.** The Spotify Web API controls track order, queue,
  seeking, and skips — not audio. Cut Mode is a hard cut (a `play` call with a `position_ms`
  offset), not a blend; Spotify's own crossfade (Settings → Playback) is the closest this
  can get to smoothing it, and the app reminds you of this once the set starts.
- **Playlist track visibility.** Since Spotify's February 2026 Web API changes, playlist
  contents are only returned for playlists you own or collaborate on — for other people's
  public playlists you'll get metadata but no track list. Save a copy to your own library
  first if you hit this.
- **Single local user.** Tokens are stored in a plain file on disk for simplicity; this is
  meant to run on your own machine, not be deployed as a shared multi-user service.
- **Dev Mode limits.** Your Spotify app runs in Dev Mode by default (5 users max, and the
  app owner needs an active Premium subscription) unless you request Extended Quota Mode
  from Spotify.

## Project structure

```
src/
  app/
    page.tsx                 the whole UI (client component)
    callback/route.ts         OAuth redirect handler (matches the registered redirect URI)
    api/
      auth/                   login, logout, status
      spotify/                playlists, tracks, devices, player, queue, playlist creation
      claude/                 plan (set design) and steer (live steering)
  components/                 dashboard UI pieces
  lib/
    spotifyAuth.ts             PKCE flow + token refresh
    spotifyClient.ts           Spotify Web API wrapper (pagination, 429 backoff)
    claude.ts                  Claude prompts, strict-JSON schemas, URI validation
    tokenStore.ts               file-backed token storage
```
