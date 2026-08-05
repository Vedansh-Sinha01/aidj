"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RoleStatusSelect({ roleId, status }: { roleId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function updateStatus(newStatus: string) {
    setBusy(true);
    try {
      await fetch(`/api/roles/${roleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={status}
      disabled={busy}
      onChange={(e) => updateStatus(e.target.value)}
      className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
    >
      <option value="OPEN">Open</option>
      <option value="FILLED">Filled</option>
      <option value="CLOSED">Closed</option>
    </select>
  );
}
