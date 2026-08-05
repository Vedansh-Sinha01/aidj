"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Contact = { id: string; name: string; email: string | null };

export function ComposeEmailButton({
  companyId,
  contacts,
}: {
  companyId: string;
  contacts: Contact[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function pickContact(id: string) {
    setContactId(id);
    const c = contacts.find((c) => c.id === id);
    if (c?.email) setTo(c.email);
  }

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body, contactId: contactId || undefined, companyId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Could not send email.");
        return;
      }
      setSent(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setContactId("");
    setTo("");
    setSubject("");
    setBody("");
    setError(null);
    setSent(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-300 text-slate-700 text-sm font-medium px-3 py-1.5 hover:bg-slate-50"
      >
        Compose email
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Compose email</h2>
            <p className="text-xs text-slate-400 mt-1">
              Sent from your connected Outlook account. Nothing is ever sent automatically — you review and click Send.
            </p>

            {sent ? (
              <div className="mt-4">
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-3">
                  Sent.
                </p>
                <button
                  onClick={close}
                  className="w-full mt-4 rounded-md bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {contacts.length > 0 && (
                  <select
                    value={contactId}
                    onChange={(e) => pickContact(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Choose a contact…</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id} disabled={!c.email}>
                        {c.name} {!c.email && "(no email on file)"}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="To"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  placeholder="Write your message…"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2 pt-2">
                  <button
                    disabled={busy || !to || !subject || !body}
                    onClick={send}
                    className="flex-1 rounded-md bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800 disabled:opacity-60"
                  >
                    {busy ? "Sending…" : "Send"}
                  </button>
                  <button
                    onClick={close}
                    className="flex-1 rounded-md border border-slate-300 text-sm font-medium py-2 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
