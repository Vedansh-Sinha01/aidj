"use client";

import { useEffect, useRef, useState } from "react";

export default function SteeringBar({
  busy,
  lastConfirmation,
  ambiguous,
  canUndo,
  onSubmit,
  onConfirmCandidate,
  onUndo,
}: {
  busy: boolean;
  lastConfirmation?: string | null;
  ambiguous?: { candidates: { spotify_uri: string; title: string; artist: string }[]; message: string } | null;
  canUndo: boolean;
  onSubmit: (instruction: string) => void;
  onConfirmCandidate: (uri: string) => void;
  onUndo: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="rounded-xl border border-booth-border bg-booth-panel p-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim() || busy) return;
          onSubmit(value.trim());
          setValue("");
        }}
        className="flex gap-2"
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Steer the set… "take it darker", "play Bohemian Rhapsody next", "don't play Y tonight"  (press / to focus)`}
          className="flex-1 rounded-lg border border-booth-border bg-booth-panel2 px-3 py-2 text-sm outline-none focus:border-booth-accent"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-booth-accent px-4 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "…" : "Steer"}
        </button>
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          className="rounded-lg bg-booth-panel2 px-3 py-2 text-sm text-booth-dim hover:text-booth-text disabled:opacity-30"
          title="Undo last command"
        >
          ↺ undo
        </button>
      </form>

      {ambiguous && (
        <div className="mt-3 rounded-lg border border-booth-warn/30 bg-booth-warn/10 p-3">
          <p className="mb-2 text-sm text-booth-warn">{ambiguous.message}</p>
          <div className="flex flex-wrap gap-2">
            {ambiguous.candidates.map((c) => (
              <button
                key={c.spotify_uri}
                onClick={() => onConfirmCandidate(c.spotify_uri)}
                className="rounded-full border border-booth-warn/50 px-3 py-1 text-xs hover:bg-booth-warn/20"
              >
                {c.title} — {c.artist}
              </button>
            ))}
          </div>
        </div>
      )}

      {lastConfirmation && !ambiguous && (
        <p className="mt-2 text-xs text-booth-dim">✓ {lastConfirmation}</p>
      )}
    </div>
  );
}
