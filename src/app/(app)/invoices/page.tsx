import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewInvoiceModal } from "@/components/NewInvoiceModal";
import { MarkInvoicePaidButton } from "@/components/MarkInvoicePaidButton";
import { StatusBadge } from "@/components/AmountOwedPanel";

export default async function InvoicesPage() {
  const [invoices, placements] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: { dateInvoiced: "desc" },
      include: { company: true, placement: { include: { candidate: true } } },
    }),
    prisma.placement.findMany({ include: { candidate: true, company: true } }),
  ]);

  const totalAR = invoices
    .filter((i) => i.status !== "PAID")
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">
            ${totalAR.toLocaleString()} outstanding · ${totalRevenue.toLocaleString()} total placement fee revenue
          </p>
        </div>
        <NewInvoiceModal
          placements={placements.map((p) => ({
            id: p.id,
            candidateName: p.candidate.name,
            companyName: p.company.name,
          }))}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Client</th>
              <th className="text-left px-4 py-2 font-medium">Placement</th>
              <th className="text-left px-4 py-2 font-medium">Invoiced</th>
              <th className="text-left px-4 py-2 font-medium">Due</th>
              <th className="text-left px-4 py-2 font-medium">Amount</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/companies/${inv.companyId}`} className="text-slate-900 font-medium hover:underline">
                    {inv.company.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{inv.placement.candidate.name}</td>
                <td className="px-4 py-2.5 text-slate-500">{new Date(inv.dateInvoiced).toLocaleDateString()}</td>
                <td className="px-4 py-2.5 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                <td className="px-4 py-2.5 text-slate-800">${Number(inv.amount).toLocaleString()}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-4 py-2.5">{inv.status !== "PAID" && <MarkInvoicePaidButton invoiceId={inv.id} />}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
