"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MANUAL_TICKET_TYPES } from "@/lib/ticket-defaults";

type Company = { id: string; name: string };
type User = { id: string; name: string };

export function NewTicketForm({
  companies,
  users,
  currentUserId,
  defaultCompanyId,
  defaultCandidateId,
  defaultSubject,
}: {
  companies: Company[];
  users: User[];
  currentUserId: string;
  defaultCompanyId?: string;
  defaultCandidateId?: string;
  defaultSubject?: string;
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const [description, setDescription] = useState("");
  const [type, setType] = useState(MANUAL_TICKET_TYPES[0].value);
  const [priority, setPriority] = useState(MANUAL_TICKET_TYPES[0].defaultPriority);
  const [assignedToId, setAssignedToId] = useState(currentUserId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectType(newType: (typeof MANUAL_TICKET_TYPES)[number]["value"]) {
    setType(newType);
    const def = MANUAL_TICKET_TYPES.find((t) => t.value === newType);
    if (def) setPriority(def.defaultPriority);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          candidateId: defaultCandidateId,
          subject,
          description: description || undefined,
          type,
          priority,
          assignedToId,
        }),
      });
      if (!res.ok) {
        setError("Could not create ticket.");
        return;
      }
      const data = await res.json();
      router.push(`/tickets/${data.ticket.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Choose a client…</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
        <select
          value={type}
          onChange={(e) => selectType(e.target.value as typeof type)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {MANUAL_TICKET_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Details (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Assign to</label>
          <select
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={busy || !companyId || !subject}
        onClick={submit}
        className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800 disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create ticket"}
      </button>
    </div>
  );
}
