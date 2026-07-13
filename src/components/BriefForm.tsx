"use client";

import { useState } from "react";

export default function BriefForm({
  trackCount,
  designing,
  onDesign,
}: {
  trackCount: number;
  designing: boolean;
  onDesign: (brief: string, targetLengthMinutes: number | undefined, mcMode: boolean) => void;
}) {
  const [brief, setBrief] = useState("");
  const [lengthMinutes, setLengthMinutes] = useState<string>("");
  const [mcMode, setMcMode] = useState(false);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <h2 className="text-xl font-semibold">Design the set</h2>
      <p className="text-sm text-booth-dim">
        {trackCount} tracks in the pool. Describe the vibe, or leave it blank for a sensible
        warmup → build → peak → cooldown arc.
      </p>
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder='e.g. "2-hour house party, start mellow, peak around 90 min, end warm" or just "shuffle this but make it make sense"'
        rows={4}
        className="w-full resize-none rounded-lg border border-booth-border bg-booth-panel px-3 py-2 text-sm outline-none focus:border-booth-accent"
      />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-booth-dim">
          Target length (min, optional)
          <input
            type="number"
            min={1}
            value={lengthMinutes}
            onChange={(e) => setLengthMinutes(e.target.value)}
            placeholder="whole playlist"
            className="w-28 rounded-lg border border-booth-border bg-booth-panel px-2 py-1 text-sm text-booth-text outline-none focus:border-booth-accent"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-booth-dim">
          <input type="checkbox" checked={mcMode} onChange={(e) => setMcMode(e.target.checked)} />
          MC mode (radio-DJ intros)
        </label>
      </div>
      <button
        disabled={designing}
        onClick={() => onDesign(brief, lengthMinutes ? Number(lengthMinutes) : undefined, mcMode)}
        className="w-full rounded-lg bg-booth-accent py-2.5 font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
      >
        {designing ? "Designing the set…" : "Design the set"}
      </button>
    </div>
  );
}
