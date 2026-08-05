"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddSatisfactionNoteForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(4);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/satisfaction-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, note: note || undefined }),
      });
      if (res.ok) {
        setOpen(false);
        setNote("");
        setRating(4);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-slate-500 hover:text-slate-900 underline">
        + Log satisfaction note
      </button>
    );
  }

  return (
    <div className="border border-slate-200 rounded-md p-3 space-y-2 bg-slate-50">
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600">Rating</label>
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} / 5
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Notes from the check-in call (optional)"
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
      />
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={submit}
          className="rounded-md bg-slate-900 text-white text-xs font-medium px-3 py-1.5 hover:bg-slate-800 disabled:opacity-60"
        >
          Save
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-slate-500 px-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
