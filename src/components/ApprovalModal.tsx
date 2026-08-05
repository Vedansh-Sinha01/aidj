"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type PendingApproval = {
  id: string;
  createdAt: string;
  requestedBy: { id: string; name: string };
  candidate: {
    id: string;
    name: string;
    role: { title: string; company: { name: string } };
  };
};

/**
 * Polls for pending candidate-submission approvals (§3) and pops a blocking
 * modal for whoever is actively using the app — the only popup in the whole
 * system, per spec. There's no websocket/push channel in this environment,
 * so "real-time" here means a short poll interval.
 */
export function ApprovalModal() {
  const { data: session } = useSession();
  const [queue, setQueue] = useState<PendingApproval[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/approvals/pending");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setQueue(data.pending);
      } catch {
        // ignore transient failures
      }
    }
    poll();
    const interval = setInterval(poll, 5_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const current = queue.find(
    (a) => a.requestedBy.id !== session?.user?.id && !dismissed.has(a.id)
  );

  async function resolve(action: "approve" | "decline") {
    if (!current) return;
    setBusy(true);
    try {
      await fetch(`/api/approvals/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setQueue((q) => q.filter((a) => a.id !== current.id));
    } finally {
      setBusy(false);
    }
  }

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6">
        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
          Candidate submission approval
        </p>
        <h2 className="text-lg font-semibold text-slate-900 mt-1">
          {current.candidate.name}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {current.candidate.role.title} at {current.candidate.role.company.name}
        </p>
        <p className="text-sm text-slate-600 mt-3">
          {current.requestedBy.name} is submitting this candidate to the client and needs
          someone to approve the submission.
        </p>
        <div className="flex gap-2 mt-6">
          <button
            disabled={busy}
            onClick={() => resolve("approve")}
            className="flex-1 rounded-md bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800 disabled:opacity-60"
          >
            Approve
          </button>
          <button
            disabled={busy}
            onClick={() => resolve("decline")}
            className="flex-1 rounded-md border border-slate-300 text-slate-700 text-sm font-medium py-2 hover:bg-slate-50 disabled:opacity-60"
          >
            Decline
          </button>
        </div>
        <button
          disabled={busy}
          onClick={() => setDismissed((d) => new Set(d).add(current.id))}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-3"
        >
          Remind me later
        </button>
      </div>
    </div>
  );
}
