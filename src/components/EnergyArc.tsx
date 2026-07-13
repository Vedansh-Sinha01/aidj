"use client";

import type { SetlistEntry } from "@/lib/types";

const PHASE_COLOR: Record<string, string> = {
  warmup: "#60a5fa",
  build: "#f59e0b",
  peak: "#f43f5e",
  cooldown: "#c084fc",
};

export default function EnergyArc({
  entries,
  playingIndex,
}: {
  entries: SetlistEntry[];
  playingIndex?: number;
}) {
  if (entries.length === 0) {
    return (
      <div className="flex h-28 items-center justify-center rounded-lg border border-booth-border bg-booth-panel text-sm text-booth-dim">
        No set designed yet.
      </div>
    );
  }

  const w = Math.max(entries.length * 18, 320);
  const h = 110;
  const pad = 10;
  const usableH = h - pad * 2;

  const points = entries.map((e, i) => {
    const x = entries.length === 1 ? w / 2 : (i / (entries.length - 1)) * (w - pad * 2) + pad;
    const y = h - pad - ((e.energy_1_to_10 - 1) / 9) * usableH;
    return { x, y, e, i };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${h - pad} L${points[0].x},${h - pad} Z`;

  return (
    <div className="overflow-x-auto rounded-lg border border-booth-border bg-booth-panel p-3 no-scrollbar">
      <svg width={w} height={h} className="block">
        <defs>
          <linearGradient id="arcFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1db954" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1db954" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#arcFill)" />
        <path d={linePath} fill="none" stroke="#1db954" strokeWidth={2} />
        {points.map((p) => (
          <circle
            key={p.e.spotify_uri}
            cx={p.x}
            cy={p.y}
            r={p.i === playingIndex ? 5.5 : 3.5}
            fill={PHASE_COLOR[p.e.phase] ?? "#8b8b9a"}
            stroke={p.i === playingIndex ? "#fff" : "none"}
            strokeWidth={p.i === playingIndex ? 2 : 0}
          >
            <title>
              {p.e.title} — {p.e.artist} (energy {p.e.energy_1_to_10}, {p.e.phase}, ~{p.e.estimated_bpm} bpm)
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex gap-4 px-1 text-[11px] text-booth-dim">
        {Object.entries(PHASE_COLOR).map(([phase, color]) => (
          <div key={phase} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {phase}
          </div>
        ))}
      </div>
    </div>
  );
}
