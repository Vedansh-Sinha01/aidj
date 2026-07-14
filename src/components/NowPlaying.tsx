"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { formatMs } from "@/lib/format";

export default function NowPlaying({
  state,
  transitionNote,
  mcLine,
  cutMode,
  plannedEndMs,
  onPlayPause,
  onSkip,
}: {
  state: any | null;
  transitionNote?: string;
  mcLine?: string;
  cutMode?: boolean;
  plannedEndMs?: number;
  onPlayPause: () => void;
  onSkip: () => void;
}) {
  const [localProgress, setLocalProgress] = useState(state?.progress_ms ?? 0);

  useEffect(() => {
    setLocalProgress(state?.progress_ms ?? 0);
  }, [state?.item?.id, state?.progress_ms]);

  useEffect(() => {
    if (!state?.is_playing) return;
    const t = setInterval(() => setLocalProgress((p: number) => p + 1000), 1000);
    return () => clearInterval(t);
  }, [state?.is_playing]);

  if (!state || !state.item) {
    return (
      <div className="rounded-xl border border-booth-border bg-booth-panel p-6 text-center text-sm text-booth-dim">
        Nothing playing yet.
      </div>
    );
  }

  const item = state.item;
  const image = item.album?.images?.[0]?.url as string | undefined;
  const durationMs = item.duration_ms ?? 1;
  const pct = Math.min(100, (localProgress / durationMs) * 100);
  const cutMarkerPct =
    cutMode && typeof plannedEndMs === "number" ? Math.min(100, (plannedEndMs / durationMs) * 100) : null;
  const countdownSec =
    cutMode && typeof plannedEndMs === "number" ? Math.max(0, Math.round((plannedEndMs - localProgress) / 1000)) : null;

  return (
    <div className="rounded-xl border border-booth-border bg-booth-panel p-4">
      {mcLine && (
        <div className="mb-3 rounded-lg bg-booth-accent2/10 px-3 py-2 text-sm italic text-booth-accent2">
          🎙️ &ldquo;{mcLine}&rdquo;
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-booth-panel2">
          {image && <Image src={image} alt="" width={64} height={64} unoptimized />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-base font-semibold">{item.name}</div>
            {cutMode && countdownSec !== null && state.is_playing && (
              <span className="shrink-0 rounded-full bg-booth-accent2/20 px-2 py-0.5 text-[10px] font-medium text-booth-accent2 animate-pulse-glow">
                next cut in {countdownSec}s
              </span>
            )}
          </div>
          <div className="truncate text-sm text-booth-dim">
            {(item.artists ?? []).map((a: any) => a.name).join(", ")}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onPlayPause}
            className="grid h-10 w-10 place-items-center rounded-full bg-booth-panel2 text-lg hover:bg-booth-border"
            title={state.is_playing ? "Pause" : "Play"}
          >
            {state.is_playing ? "⏸" : "▶"}
          </button>
          <button
            onClick={onSkip}
            className="grid h-10 w-10 place-items-center rounded-full bg-booth-panel2 text-lg hover:bg-booth-border"
            title="Skip (kbd: s)"
          >
            ⏭
          </button>
        </div>
      </div>
      <div className="mt-3">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-booth-panel2">
          <div className="h-full rounded-full bg-booth-accent transition-all" style={{ width: `${pct}%` }} />
          {cutMarkerPct !== null && (
            <div
              className="absolute top-0 h-full w-0.5 bg-booth-warn"
              style={{ left: `${cutMarkerPct}%` }}
              title={`Planned cut at ${formatMs(plannedEndMs ?? 0)}`}
            />
          )}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-booth-dim">
          <span>{formatMs(localProgress)}</span>
          <span>{formatMs(durationMs)}</span>
        </div>
      </div>
      {transitionNote && <p className="mt-3 text-xs italic text-booth-dim">↳ next: {transitionNote}</p>}
    </div>
  );
}
