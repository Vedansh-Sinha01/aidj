"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// §3 — submitting a candidate to a client triggers an approval request.
// Any user can approve it later; this button just kicks it off. The
// candidate's pipeline stage does not change as a result.
export function SubmitForApprovalButton({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      if (res.ok) {
        setDone(true);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="text-sm text-emerald-700">Submitted for approval.</p>;
  }

  return (
    <button
      onClick={submit}
      disabled={busy}
      className="rounded-md bg-slate-900 text-white text-sm font-medium px-3 py-1.5 hover:bg-slate-800 disabled:opacity-60"
    >
      {busy ? "Submitting…" : "Submit to client for approval"}
    </button>
  );
}
