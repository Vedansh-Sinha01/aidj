"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Placement = {
  id: string;
  startDate: string;
  guaranteeDays: number;
  status: "ACTIVE" | "ENDED" | "TERMINATED";
  endDate: string | null;
};

export function PlacementPanel({ placement }: { placement: Placement }) {
  const router = useRouter();
  const [status, setStatus] = useState(placement.status);
  const [endDate, setEndDate] = useState(placement.endDate?.slice(0, 10) ?? "");
  const [guaranteeDays, setGuaranteeDays] = useState(placement.guaranteeDays.toString());
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await fetch(`/api/placements/${placement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          endDate: status === "ACTIVE" ? null : endDate || new Date().toISOString().slice(0, 10),
          guaranteeDays: Number(guaranteeDays),
        }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const daysActive = Math.floor(
    (new Date().getTime() - new Date(placement.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md p-3">
      <div className="flex items-center justify-between">
        <p>
          Placed — started {new Date(placement.startDate).toLocaleDateString()}, guarantee window{" "}
          {placement.guaranteeDays} days · <span className="font-medium">{placement.status}</span>
        </p>
        <button onClick={() => setEditing((e) => !e)} className="text-xs underline shrink-0">
          {editing ? "Close" : "Edit"}
        </button>
      </div>
      {!editing && placement.status === "ACTIVE" && daysActive <= placement.guaranteeDays && (
        <p className="text-xs text-emerald-700 mt-1">Within guarantee window ({daysActive}d in).</p>
      )}
      {editing && (
        <div className="mt-3 space-y-2 bg-white rounded-md p-3 border border-emerald-100">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Placement["status"])}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="ENDED">Ended</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
          {status !== "ACTIVE" && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">Guarantee window (days)</label>
            <input
              type="number"
              value={guaranteeDays}
              onChange={(e) => setGuaranteeDays(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          {status !== "ACTIVE" && (
            <p className="text-xs text-slate-500">
              Ending within the guarantee window automatically opens a replacement ticket.
            </p>
          )}
          <button
            disabled={busy}
            onClick={save}
            className="w-full rounded-md bg-slate-900 text-white text-sm font-medium py-1.5 hover:bg-slate-800 disabled:opacity-60"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
