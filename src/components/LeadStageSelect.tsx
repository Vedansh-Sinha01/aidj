"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "MEETING_SCHEDULED", "CONVERTED", "DISQUALIFIED"];

export function LeadStageSelect({ leadId, stage }: { leadId: string; stage: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function updateStage(newStage: string) {
    setBusy(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={stage}
      disabled={busy}
      onChange={(e) => updateStage(e.target.value)}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium"
    >
      {STAGES.map((s) => (
        <option key={s} value={s}>
          {s.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
