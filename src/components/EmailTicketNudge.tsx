"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Nudge = {
  id: string;
  subject: string | null;
  occurredAt: string;
  contact: { name: string } | null;
  company: { id: string; name: string };
};

/**
 * §6 — small, dismissible "Log this as a ticket?" prompt for emails synced
 * from a known client contact. Never auto-creates a ticket — dismiss or
 * click through to a pre-filled manual ticket form.
 */
export function EmailTicketNudge() {
  const router = useRouter();
  const [nudge, setNudge] = useState<Nudge | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/email-nudges");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setNudge(data.nudges[0] ?? null);
      } catch {
        // best-effort
      }
    }
    poll();
    const interval = setInterval(poll, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function dismiss() {
    if (!nudge) return;
    await fetch("/api/email-nudges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: nudge.id }),
    });
    setNudge(null);
  }

  function createTicket() {
    if (!nudge) return;
    router.push(
      `/tickets/new?companyId=${nudge.company.id}&subject=${encodeURIComponent(nudge.subject ?? "")}`
    );
  }

  if (!nudge) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-100">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4 text-sm">
        <p className="text-blue-900">
          New email from {nudge.contact?.name ?? "a contact"} at {nudge.company.name}
          {nudge.subject && <> — &ldquo;{nudge.subject}&rdquo;</>}. Log this as a ticket?
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={createTicket}
            className="rounded-md bg-blue-600 text-white text-xs font-medium px-3 py-1 hover:bg-blue-700"
          >
            Create ticket
          </button>
          <button onClick={dismiss} className="text-xs text-blue-700 hover:text-blue-900 underline">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
