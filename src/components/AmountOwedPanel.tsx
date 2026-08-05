"use client";

import { useState } from "react";
import Link from "next/link";

type Invoice = {
  id: string;
  amount: string | number;
  dateInvoiced: string;
  dueDate: string;
  status: "UNPAID" | "PAID" | "OVERDUE";
};

export function AmountOwedPanel({ invoices }: { invoices: Invoice[] }) {
  const [open, setOpen] = useState(false);
  const owed = invoices
    .filter((i) => i.status === "UNPAID" || i.status === "OVERDUE")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left">
        <p className="text-xs text-slate-500">Amount owed</p>
        <p className="text-2xl font-semibold text-slate-900 mt-1">
          ${owed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-slate-400 mt-1">{open ? "Hide" : "Show"} {invoices.length} invoice(s) →</p>
      </button>
      {open && (
        <table className="w-full text-sm mt-3">
          <thead className="text-xs text-slate-400 uppercase">
            <tr>
              <th className="text-left py-1 font-medium">Invoiced</th>
              <th className="text-left py-1 font-medium">Due</th>
              <th className="text-left py-1 font-medium">Amount</th>
              <th className="text-left py-1 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="py-1.5">{new Date(inv.dateInvoiced).toLocaleDateString()}</td>
                <td className="py-1.5">{new Date(inv.dueDate).toLocaleDateString()}</td>
                <td className="py-1.5">${Number(inv.amount).toLocaleString()}</td>
                <td className="py-1.5">
                  <StatusBadge status={inv.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Link href="/invoices" className="text-xs text-slate-400 hover:text-slate-700 mt-3 inline-block">
        Manage invoices →
      </Link>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "bg-emerald-50 text-emerald-700",
    UNPAID: "bg-amber-50 text-amber-700",
    OVERDUE: "bg-red-50 text-red-700",
  };
  return (
    <span className={`text-xs font-medium rounded px-2 py-0.5 ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}
