"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MicrosoftConnectPanel({ connected, email }: { connected: boolean; email?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  async function disconnect() {
    setBusy(true);
    try {
      await fetch("/api/integrations/microsoft/disconnect", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/integrations/microsoft/sync", { method: "POST" });
      const data = await res.json();
      if (data.synced) {
        setSyncResult(`Synced — ${data.emailsLogged} email(s), ${data.meetingsLogged} meeting(s) logged.`);
      } else {
        setSyncResult(data.reason ?? "Sync failed.");
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!connected) {
    return (
      <a
        href="/api/integrations/microsoft/connect"
        className="inline-block mt-3 rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800"
      >
        Connect Microsoft account
      </a>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm text-slate-700">
        Connected as <span className="font-medium">{email}</span>
      </p>
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={syncNow}
          className="rounded-md border border-slate-300 text-sm font-medium px-3 py-1.5 hover:bg-slate-50 disabled:opacity-60"
        >
          Sync now
        </button>
        <button
          disabled={busy}
          onClick={disconnect}
          className="rounded-md border border-red-200 text-red-600 text-sm font-medium px-3 py-1.5 hover:bg-red-50 disabled:opacity-60"
        >
          Disconnect
        </button>
      </div>
      {syncResult && <p className="text-xs text-slate-500">{syncResult}</p>}
    </div>
  );
}
