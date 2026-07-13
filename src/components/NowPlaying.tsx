"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

function formatMs(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function NowPlaying({
  state,
  transitionNote,
  mcLine,
  onPlayPause,
  onSkip,
}: {
  state: any | null;
  transitionNote?: string;
  mcLine?: string;
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
          <div className="truncate text-base font-semibold">{item.name}</div>
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
            title="Skip (kbd: shift+→)"
          >
            ⏭
          </button>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-booth-panel2">
          <div className="h-full rounded-full bg-booth-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-booth-dim">
          <span>{formatMs(localProgress)}</span>
          <span>{formatMs(durationMs)}</span>
        </div>
      </div>
      {transitionNote && (
        <p className="mt-3 text-xs italic text-booth-dim">↳ next: {transitionNote}</p>
      )}
    </div>
  );
}
