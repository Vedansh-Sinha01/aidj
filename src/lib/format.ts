export function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** e.g. "1:05 → 3:40" for a cut segment, or null if either bound is missing. */
export function formatSegment(startMs?: number, endMs?: number): string | null {
  if (typeof startMs !== "number" || typeof endMs !== "number") return null;
  return `${formatMs(startMs)} → ${formatMs(endMs)}`;
}
