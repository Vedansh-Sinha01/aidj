"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { BenchedTrack, SetlistEntry, Track } from "@/lib/types";
import ConnectScreen from "@/components/ConnectScreen";
import PlaylistPicker from "@/components/PlaylistPicker";
import BriefForm from "@/components/BriefForm";
import EnergyArc from "@/components/EnergyArc";
import SetlistEditor from "@/components/SetlistEditor";
import NowPlaying from "@/components/NowPlaying";
import SteeringBar from "@/components/SteeringBar";
import DeviceModal from "@/components/DeviceModal";

type Stage = "loading" | "connect" | "pick" | "design" | "live";

interface Snapshot {
  remaining: SetlistEntry[];
  playedHistory: SetlistEntry[];
  bannedUris: string[];
}

function cloneSnapshot(s: Snapshot): Snapshot {
  return JSON.parse(JSON.stringify(s));
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("loading");
  const [authError, setAuthError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");

  const [playlists, setPlaylists] = useState<any[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);

  const [selectedPlaylist, setSelectedPlaylist] = useState<{ id: string; name: string } | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);

  const [designing, setDesigning] = useState(false);
  const [brief, setBrief] = useState("");
  const [cutMode, setCutMode] = useState(false);
  const [remaining, setRemaining] = useState<SetlistEntry[]>([]);
  const [playedHistory, setPlayedHistory] = useState<SetlistEntry[]>([]);
  const [benched, setBenched] = useState<BenchedTrack[]>([]);
  const [bannedUris, setBannedUris] = useState<string[]>([]);
  const [summary, setSummary] = useState("");

  const [devices, setDevices] = useState<any[]>([]);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [starting, setStarting] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const [playerState, setPlayerState] = useState<any | null>(null);
  const [showCrossfadeTip, setShowCrossfadeTip] = useState(true);

  const [steerBusy, setSteerBusy] = useState(false);
  const [lastConfirmation, setLastConfirmation] = useState<string | null>(null);
  const [ambiguous, setAmbiguous] = useState<{
    candidates: { spotify_uri: string; title: string; artist: string }[];
    pendingActionType: string;
    message: string;
  } | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<Snapshot | null>(null);

  const [saveBusy, setSaveBusy] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);

  // Refs mirror state so the polling interval always reads fresh values
  // without needing to be torn down and rebuilt on every state change.
  const remainingRef = useRef<SetlistEntry[]>([]);
  const playedHistoryRef = useRef<SetlistEntry[]>([]);
  const bannedUrisRef = useRef<string[]>([]);
  const queuedCountRef = useRef(0);
  const tracksRef = useRef<Track[]>([]);
  const cutModeRef = useRef(false);
  const selectedDeviceIdRef = useRef<string | null>(null);
  // Cooldown after we ourselves force a cut, so the next poll or two doesn't
  // misread Spotify's still-settling playback state as an unplanned skip.
  const lastCutAtRef = useRef(0);
  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);
  useEffect(() => {
    playedHistoryRef.current = playedHistory;
  }, [playedHistory]);
  useEffect(() => {
    bannedUrisRef.current = bannedUris;
  }, [bannedUris]);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);
  useEffect(() => {
    cutModeRef.current = cutMode;
  }, [cutMode]);
  useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId;
  }, [selectedDeviceId]);

  // ---------- boot: check auth ----------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("auth_error");
    if (err) {
      setAuthError(err);
      window.history.replaceState({}, "", "/");
    }
    api
      .authStatus()
      .then((s) => {
        if (s.connected) {
          setDisplayName(s.displayName ?? "");
          setStage("pick");
        } else {
          setStage("connect");
        }
      })
      .catch(() => setStage("connect"));
  }, []);

  // ---------- load playlists once connected ----------
  const loadPlaylists = useCallback(() => {
    setPlaylistsLoading(true);
    api
      .playlists()
      .then((r) => setPlaylists(r.playlists))
      .catch(() => setPlaylists([]))
      .finally(() => setPlaylistsLoading(false));
  }, []);

  useEffect(() => {
    if (stage === "pick") loadPlaylists();
  }, [stage, loadPlaylists]);

  // ---------- select playlist ----------
  async function selectPlaylist(id: string, name?: string) {
    setTracksLoading(true);
    setSelectedPlaylist({ id, name: name ?? "" });
    try {
      const r = await api.tracks(id);
      setTracks(r.tracks);
      setStage("design");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to load tracks");
    } finally {
      setTracksLoading(false);
    }
  }

  async function resolveLink(input: string) {
    try {
      const meta = await api.resolvePlaylist(input);
      await selectPlaylist(meta.id, meta.name);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not resolve that link.");
    }
  }

  // ---------- design the set ----------
  async function handleDesign(
    briefText: string,
    targetLengthMinutes: number | undefined,
    mcMode: boolean,
    cutModeArg: boolean
  ) {
    setDesigning(true);
    setBrief(briefText);
    setCutMode(cutModeArg);
    try {
      const r = await api.plan(briefText, tracks, targetLengthMinutes, mcMode, cutModeArg);
      setRemaining(r.plan.setlist);
      setBenched(r.plan.benched);
      setSummary(r.plan.summary);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Claude couldn't design a set. Try again.");
    } finally {
      setDesigning(false);
    }
  }

  // ---------- editing the setlist ----------
  function toggleLock(uri: string) {
    setRemaining((prev) => prev.map((e) => (e.spotify_uri === uri ? { ...e, locked: !e.locked } : e)));
  }
  function removeTrack(uri: string) {
    setRemaining((prev) => {
      const entry = prev.find((e) => e.spotify_uri === uri);
      if (entry) {
        setBenched((b) => [...b, { spotify_uri: uri, title: entry.title, artist: entry.artist, reason: "Removed by you" }]);
      }
      return prev.filter((e) => e.spotify_uri !== uri);
    });
  }

  // ---------- starting the set ----------
  async function handleStartClick() {
    if (remaining.length === 0) return;
    setStarting(true);
    try {
      const r = await api.devices();
      const active = r.devices.filter((d) => d.is_active);
      if (r.devices.length === 0) {
        setDevices([]);
        setShowDeviceModal(true);
      } else if (active.length === 1 || r.devices.length === 1) {
        await beginPlayback((active[0] ?? r.devices[0]).id);
      } else {
        setDevices(r.devices);
        setShowDeviceModal(true);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Couldn't fetch devices");
    } finally {
      setStarting(false);
    }
  }

  async function beginPlayback(deviceId: string) {
    setShowDeviceModal(false);
    setSelectedDeviceId(deviceId);
    const first = remaining[0];
    try {
      if (cutMode) {
        // Cut Mode drives every subsequent transition itself (see the cut-engine
        // effect below) — it never relies on Spotify's own queue, so there's
        // nothing to pre-queue here beyond seeking track 1 to its start_ms.
        await api.startSet(deviceId, [first.spotify_uri], first.start_ms ?? 0);
      } else {
        const lookahead = remaining.slice(1, 3);
        await api.startSet(deviceId, [first.spotify_uri]);
        for (const t of lookahead) {
          await api.queueTrack(t.spotify_uri);
        }
        queuedCountRef.current = 1 + lookahead.length;
      }
      lastCutAtRef.current = Date.now();
      setStage("live");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Couldn't start playback. Is Spotify open on that device?");
    }
  }

  /** Cut Mode: immediately switch playback to the next planned track at its start_ms. */
  async function cutToNext() {
    const list = remainingRef.current;
    const current = list[0];
    const next = list[1];
    const deviceId = selectedDeviceIdRef.current;
    if (!current || !next || !deviceId) return;
    lastCutAtRef.current = Date.now();
    const rest = list.slice(1);
    setPlayedHistory((h) => [...h, current]);
    setRemaining(rest);
    remainingRef.current = rest;
    try {
      await api.cutTo(deviceId, next.spotify_uri, next.start_ms ?? 0);
    } catch {
      // transient hiccup — the next poll tick will resync against whatever Spotify reports
    }
  }

  // ---------- rolling queue top-up polling (Cut Mode OFF) ----------
  useEffect(() => {
    if (stage !== "live" || cutMode) return;
    let cancelled = false;

    async function tick() {
      try {
        const r = await api.playerState();
        if (cancelled) return;
        setPlayerState(r.state);
        const nowUri: string | undefined = r.state?.item?.uri;
        if (nowUri) {
          const list = remainingRef.current;
          const k = list.findIndex((e) => e.spotify_uri === nowUri);
          if (k > 0) {
            const finished = list.slice(0, k);
            const rest = list.slice(k);
            setPlayedHistory((h) => [...h, ...finished]);
            setRemaining(rest);
            remainingRef.current = rest;
            queuedCountRef.current = Math.max(queuedCountRef.current - k, 0);
          }
          // top up the rolling queue to keep 2-3 tracks ahead
          const current = remainingRef.current;
          while (queuedCountRef.current < 3 && queuedCountRef.current < current.length) {
            await api.queueTrack(current[queuedCountRef.current].spotify_uri);
            queuedCountRef.current++;
          }
        }
      } catch {
        // transient network/API hiccup — try again next tick
      }
    }

    tick();
    const interval = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [stage, cutMode]);

  // ---------- cut execution engine (Cut Mode ON) ----------
  useEffect(() => {
    if (stage !== "live" || !cutMode) return;
    let cancelled = false;

    async function tick() {
      try {
        const r = await api.playerState();
        if (cancelled) return;
        setPlayerState(r.state);
        const state = r.state;
        if (!state || !state.item) return;

        // Right after we force a cut, give Spotify a moment to reflect the new
        // track/position before we reason about progress again.
        if (Date.now() - lastCutAtRef.current < 1200) return;

        const nowUri: string = state.item.uri;
        const list = remainingRef.current;
        const k = list.findIndex((e) => e.spotify_uri === nowUri);

        if (k === -1) {
          // Currently playing something outside the plan (user changed tracks
          // manually in Spotify itself) — leave it alone; we resync as soon as
          // playback returns to a track we recognize.
          return;
        }
        if (k > 0) {
          // Spotify (or the user) advanced past what we expected — resync by
          // treating the skipped tracks as played, without forcing a re-seek.
          const finished = list.slice(0, k);
          const rest = list.slice(k);
          setPlayedHistory((h) => [...h, ...finished]);
          setRemaining(rest);
          remainingRef.current = rest;
        }

        if (!state.is_playing) return; // don't cut while paused
        const current = remainingRef.current[0];
        if (!current || typeof current.end_ms !== "number") return;
        const progress: number = state.progress_ms ?? 0;
        // Fire a poll-tick early so a ~700ms polling cadence never lets the
        // track visibly run past its planned exit.
        if (progress >= current.end_ms - 300) {
          await cutToNext();
        }
      } catch {
        // transient network/API hiccup — try again next tick
      }
    }

    tick();
    const interval = setInterval(tick, 700);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [stage, cutMode]);

  // ---------- transport controls ----------
  async function handlePlayPause() {
    if (playerState?.is_playing) await api.pause();
    else await api.play();
  }
  async function handleSkip() {
    if (cutModeRef.current) {
      // Cut Mode never populates Spotify's own queue, so Spotify's native
      // "next" wouldn't know what to play — cut straight to our own next track.
      await cutToNext();
    } else {
      await api.next();
    }
    void steer(
      "The DJ pressed skip on the current track — treat this as feedback and adjust the upcoming energy arc if it makes sense.",
      true
    );
  }

  // ---------- steering ----------
  function applyDirectAction(actionType: string, uri: string, position: number | null | undefined) {
    if (actionType === "ban_track") {
      setBannedUris((b) => Array.from(new Set([...b, uri])));
      setRemaining((prev) => prev.filter((e) => e.spotify_uri !== uri));
      return;
    }
    setRemaining((prev) => {
      const existing = prev.find((e) => e.spotify_uri === uri);
      const list = prev.filter((e) => e.spotify_uri !== uri);
      const meta = tracksRef.current.find((t) => t.uri === uri);
      const entry: SetlistEntry = existing
        ? { ...existing, locked: true }
        : {
            spotify_uri: uri,
            title: meta?.title ?? "Unknown title",
            artist: meta?.artists.join(", ") ?? "",
            estimated_bpm: 120,
            energy_1_to_10: 5,
            phase: "build",
            transition_note: "",
            locked: true,
            // Placeholder segment until the auto-reflow steer call regenerates real cut points.
            ...(cutModeRef.current && meta
              ? { start_ms: 0, end_ms: Math.min(180000, meta.durationMs || 180000) }
              : {}),
          };
      if (actionType === "pin_to_position" && position != null) {
        const idx = Math.max(0, Math.min(position, list.length));
        list.splice(idx, 0, entry);
      } else {
        // play_next / insert_after_current
        list.splice(0, 0, entry);
      }
      return list;
    });
  }

  async function steer(instruction: string, isAutoFeedback = false) {
    setSteerBusy(true);
    if (!isAutoFeedback) {
      setUndoSnapshot(
        cloneSnapshot({
          remaining: remainingRef.current,
          playedHistory: playedHistoryRef.current,
          bannedUris: bannedUrisRef.current,
        })
      );
    }
    try {
      // The track at index 0 is whatever is currently loaded/playing — always
      // treat it as locked for the purposes of a replan so Claude never
      // reorders it out from under the engine (critical in Cut Mode, where the
      // cut timer is keyed off remaining[0]).
      const remainingForSteer = remainingRef.current.map((e, i) => (i === 0 ? { ...e, locked: true } : e));
      const res = await api.steer({
        instruction,
        pool: tracksRef.current,
        remainingSetlist: remainingForSteer,
        playedHistory: playedHistoryRef.current,
        bannedUris: bannedUrisRef.current,
        cutMode: cutModeRef.current,
      });
      const result = res.result;
      if (result.type === "action") {
        applyDirectAction(result.action, result.spotify_uri, result.position);
        setLastConfirmation(result.confirmation);
        setAmbiguous(null);
        // Let Claude reflow the surrounding transitions around the locked/banned track.
        void steer(
          "Reflow the transitions for the remaining set now that a track was just pinned or banned by direct command. Keep every locked track exactly where it is; adjust the unlocked tracks around it.",
          true
        );
      } else if (result.type === "replan") {
        const lockedUris = new Set(remainingRef.current.filter((e) => e.locked).map((e) => e.spotify_uri));
        setRemaining(result.plan.setlist.map((e: SetlistEntry) => ({ ...e, locked: lockedUris.has(e.spotify_uri) })));
        setBenched(result.plan.benched);
        if (!isAutoFeedback) setLastConfirmation(result.plan.summary || "Set replanned.");
        setAmbiguous(null);
      } else if (result.type === "ambiguous") {
        setAmbiguous({ candidates: result.candidates, pendingActionType: result.pendingActionType, message: result.message });
      } else {
        setLastConfirmation(result.message);
        setAmbiguous(null);
      }
    } catch (e) {
      setLastConfirmation(e instanceof Error ? e.message : "Steering request failed.");
    } finally {
      setSteerBusy(false);
    }
  }

  function confirmAmbiguous(uri: string) {
    if (!ambiguous) return;
    setUndoSnapshot(
      cloneSnapshot({
        remaining: remainingRef.current,
        playedHistory: playedHistoryRef.current,
        bannedUris: bannedUrisRef.current,
      })
    );
    applyDirectAction(ambiguous.pendingActionType, uri, null);
    setAmbiguous(null);
    setLastConfirmation("Applied.");
    void steer(
      "Reflow the transitions for the remaining set now that a track was just pinned or banned by direct command. Keep every locked track exactly where it is; adjust the unlocked tracks around it.",
      true
    );
  }

  function handleUndo() {
    if (!undoSnapshot) return;
    setRemaining(undoSnapshot.remaining);
    setPlayedHistory(undoSnapshot.playedHistory);
    setBannedUris(undoSnapshot.bannedUris);
    setUndoSnapshot(null);
    setLastConfirmation("Undid last command.");
  }

  // ---------- keyboard shortcuts ----------
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "s" && stage === "live") handleSkip();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, playerState]);

  // ---------- save as playlist ----------
  async function handleSave() {
    setSaveBusy(true);
    try {
      const uris = [...playedHistory, ...remaining].map((e) => e.spotify_uri);
      const name = brief ? `Set Architect — ${brief.slice(0, 80)}` : `Set Architect — ${new Date().toLocaleDateString()}`;
      const r = await api.createPlaylist(name, summary || "Designed by Set Architect.", uris);
      setSavedUrl(r.url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Couldn't save the playlist.");
    } finally {
      setSaveBusy(false);
    }
  }

  async function handleLogout() {
    await api.logout();
    window.location.href = "/";
  }

  // ---------- render ----------
  if (stage === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-booth-dim">Loading…</div>;
  }
  if (stage === "connect") {
    return <ConnectScreen error={authError} />;
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-bold">
          Set <span className="text-booth-accent">Architect</span>
        </h1>
        <div className="flex items-center gap-3 text-sm text-booth-dim">
          {displayName && <span>{displayName}</span>}
          <button onClick={handleLogout} className="hover:text-booth-text">
            disconnect
          </button>
        </div>
      </header>

      {stage === "pick" && (
        <PlaylistPicker
          playlists={playlists}
          loading={playlistsLoading}
          onSelect={(id) => selectPlaylist(id)}
          onResolveLink={resolveLink}
          onRefresh={loadPlaylists}
        />
      )}

      {(stage === "design" || stage === "live") && tracksLoading && (
        <div className="py-10 text-center text-booth-dim">Loading tracks…</div>
      )}

      {stage === "design" && !tracksLoading && (
        <div className="space-y-6">
          {remaining.length === 0 ? (
            <BriefForm trackCount={tracks.length} designing={designing} onDesign={handleDesign} />
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    The set
                    {cutMode && (
                      <span className="rounded-full bg-booth-warn/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-booth-warn">
                        ✂ Cut Mode
                      </span>
                    )}
                  </h2>
                  {summary && <p className="mt-1 max-w-xl text-sm text-booth-dim">{summary}</p>}
                </div>
                <button
                  disabled={starting}
                  onClick={handleStartClick}
                  className="shrink-0 rounded-full bg-booth-accent px-5 py-2.5 font-semibold text-black hover:brightness-110 disabled:opacity-50"
                >
                  {starting ? "…" : "▶ Start the set"}
                </button>
              </div>
              <EnergyArc entries={remaining} />
              <SetlistEditor entries={remaining} onReorder={setRemaining} onToggleLock={toggleLock} onRemove={removeTrack} />
              {benched.length > 0 && (
                <details className="rounded-lg border border-booth-border bg-booth-panel p-3 text-sm">
                  <summary className="cursor-pointer text-booth-dim">{benched.length} benched tracks</summary>
                  <ul className="mt-2 space-y-1 text-xs text-booth-dim">
                    {benched.map((b) => (
                      <li key={b.spotify_uri}>
                        {b.title} — {b.artist}: <span className="italic">{b.reason}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <button
                onClick={() => setRemaining([])}
                className="text-xs text-booth-dim underline hover:text-booth-text"
              >
                start over with a new brief
              </button>
            </>
          )}
        </div>
      )}

      {stage === "live" && (
        <div className="space-y-5">
          {showCrossfadeTip && (
            <div className="flex items-center justify-between rounded-lg border border-booth-accent2/30 bg-booth-accent2/10 px-3 py-2 text-xs text-booth-accent2">
              <span>
                {cutMode
                  ? "Tip: turn on Spotify's built-in crossfade (Settings → Playback → Crossfade, 8-12s) so these hard cuts blend instead of hitting abruptly."
                  : "Tip: enable Spotify's built-in crossfade (Settings → Playback) for smoother transitions — this app controls order and queue, not the audio itself."}
              </span>
              <button onClick={() => setShowCrossfadeTip(false)} className="ml-3 shrink-0">
                ✕
              </button>
            </div>
          )}
          <NowPlaying
            state={playerState}
            transitionNote={remaining[0]?.transition_note}
            mcLine={remaining[0]?.mcLine}
            cutMode={cutMode}
            plannedEndMs={remaining[0]?.end_ms}
            onPlayPause={handlePlayPause}
            onSkip={handleSkip}
          />
          <SteeringBar
            busy={steerBusy}
            lastConfirmation={lastConfirmation}
            ambiguous={ambiguous}
            canUndo={!!undoSnapshot}
            onSubmit={(instr) => steer(instr)}
            onConfirmCandidate={confirmAmbiguous}
            onUndo={handleUndo}
          />
          <EnergyArc entries={[...playedHistory, ...remaining]} playingIndex={playedHistory.length} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-booth-dim">Up next</h3>
              <SetlistEditor
                entries={remaining}
                playingUri={remaining[0]?.spotify_uri}
                onReorder={(next) => setRemaining(next)}
                onToggleLock={toggleLock}
                onRemove={removeTrack}
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-booth-dim">Played</h3>
              <div className="max-h-96 space-y-1 overflow-y-auto rounded-lg border border-booth-border bg-booth-panel p-2 text-sm text-booth-dim">
                {playedHistory.length === 0 && <p className="p-2">Nothing yet.</p>}
                {[...playedHistory].reverse().map((e) => (
                  <div key={e.spotify_uri} className="rounded px-2 py-1">
                    {e.title} — {e.artist}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              disabled={saveBusy}
              onClick={handleSave}
              className="rounded-lg bg-booth-panel2 px-4 py-2 text-sm font-medium hover:bg-booth-border disabled:opacity-50"
            >
              {saveBusy ? "Saving…" : "Save as playlist"}
            </button>
            {savedUrl && (
              <a href={savedUrl} target="_blank" rel="noreferrer" className="text-sm text-booth-accent underline">
                Open saved playlist ↗
              </a>
            )}
          </div>
        </div>
      )}

      {showDeviceModal && (
        <DeviceModal devices={devices} onChoose={beginPlayback} onClose={() => setShowDeviceModal(false)} />
      )}
    </div>
  );
}
