"use client";

import { useState } from "react";
import Link from "next/link";

type Match = { candidateId: string; name: string; stage: string; score: number; reasons: string[] };

export function FindMatchesButton({ roleId }: { roleId: string }) {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function findMatches() {
    setBusy(true);
    try {
      const res = await fetch(`/api/roles/${roleId}/match`, { method: "POST" });
      const data = await res.json();
      setMatches(data.matches);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={findMatches}
        disabled={busy}
        className="rounded-md border border-slate-300 text-slate-700 text-xs font-medium px-3 py-1.5 hover:bg-slate-50 disabled:opacity-60"
      >
        {busy ? "Matching…" : "Find matches"}
      </button>
      {matches && (
        <div className="mt-3 border border-slate-200 rounded-lg divide-y divide-slate-100">
          {matches.length === 0 && <p className="p-3 text-sm text-slate-400">No candidates in this role&apos;s pipeline yet.</p>}
          {matches.map((m) => (
            <div key={m.candidateId} className="p-3 flex items-start justify-between gap-3">
              <div>
                <Link href={`/candidates/${m.candidateId}`} className="text-sm font-medium text-slate-900 hover:underline">
                  {m.name}
                </Link>
                <p className="text-xs text-slate-400">{m.stage}</p>
                {m.reasons.length > 0 && (
                  <ul className="text-xs text-slate-500 mt-1 list-disc list-inside">
                    {m.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
              <span className="text-sm font-semibold text-slate-900 shrink-0">{m.score}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
