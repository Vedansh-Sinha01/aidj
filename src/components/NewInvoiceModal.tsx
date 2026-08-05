"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Placement = { id: string; candidateName: string; companyName: string };

export function NewInvoiceModal({ placements }: { placements: Placement[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [placementId, setPlacementId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placementId, amount: Number(amount), dueDate }),
      });
      if (!res.ok) {
        setError("Could not create invoice.");
        return;
      }
      setOpen(false);
      setPlacementId("");
      setAmount("");
      setDueDate("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-slate-900 text-white text-sm font-medium px-3 py-1.5 hover:bg-slate-800"
      >
        + New invoice
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">New invoice</h2>
            <div className="mt-4 space-y-3">
              <select
                value={placementId}
                onChange={(e) => setPlacementId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Choose a placement…</option>
                {placements.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.candidateName} — {p.companyName}
                  </option>
                ))}
              </select>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                placeholder="Amount ($)"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Due date</label>
                <input
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  type="date"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  disabled={busy || !placementId || !amount || !dueDate}
                  onClick={submit}
                  className="flex-1 rounded-md bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800 disabled:opacity-60"
                >
                  Create
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-md border border-slate-300 text-sm font-medium py-2 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
