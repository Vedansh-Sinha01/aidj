"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkInvoicePaidButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function markPaid() {
    setBusy(true);
    try {
      await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={markPaid}
      disabled={busy}
      className="text-xs text-slate-500 hover:text-slate-900 underline disabled:opacity-60"
    >
      Mark paid
    </button>
  );
}
