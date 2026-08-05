"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Update = { id: string; body: string; createdAt: string; author: { name: string } };

export function TicketUpdates({ ticketId, updates }: { ticketId: string; updates: Update[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function addUpdate() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setBody("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="space-y-3 mb-3">
        {updates.map((u) => (
          <div key={u.id} className="text-sm border-b border-slate-100 pb-2 last:border-0">
            <p className="text-slate-700 whitespace-pre-wrap">{u.body}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {u.author.name} · {new Date(u.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
        {updates.length === 0 && <p className="text-sm text-slate-400">No updates yet.</p>}
      </div>
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Add an update…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          disabled={busy || !body.trim()}
          onClick={addUpdate}
          className="rounded-md bg-slate-900 text-white text-sm font-medium px-3 hover:bg-slate-800 disabled:opacity-60"
        >
          Add
        </button>
      </div>
    </div>
  );
}
