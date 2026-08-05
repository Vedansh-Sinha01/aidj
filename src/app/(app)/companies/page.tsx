import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewCompanyModal } from "@/components/NewCompanyModal";
import { daysSince } from "@/lib/dates";

const DORMANT_THRESHOLD_DAYS = 60;

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;

  const companies = await prisma.company.findMany({
    where: {
      AND: [
        q ? { name: { contains: q, mode: "insensitive" } } : {},
        tag ? { tags: { has: tag } } : {},
      ],
    },
    include: {
      _count: { select: { roles: true, contacts: true } },
      activityLogs: { orderBy: { occurredAt: "desc" }, take: 1 },
      roles: { select: { status: true } },
    },
    orderBy: { name: "asc" },
  });

  const allTags = Array.from(new Set(companies.flatMap((c) => c.tags))).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Companies</h1>
          <p className="text-sm text-slate-500">{companies.length} clients</p>
        </div>
        <NewCompanyModal />
      </div>

      <form className="flex gap-2" action="/companies">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm w-64"
        />
        <select name="tag" defaultValue={tag ?? ""} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">All segments</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          Filter
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Segments</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Open roles</th>
              <th className="text-left px-4 py-2 font-medium">Contacts</th>
              <th className="text-left px-4 py-2 font-medium">Last contact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((c) => {
              const lastContact = c.activityLogs[0]?.occurredAt ?? c.createdAt;
              const lastContactDays = daysSince(lastContact);
              const openRoles = c.roles.filter((r) => r.status !== "FILLED" && r.status !== "CLOSED").length;
              const status = openRoles > 0 || lastContactDays <= DORMANT_THRESHOLD_DAYS ? "Active" : "Dormant";
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/companies/${c.id}`} className="font-medium text-slate-900 hover:underline">
                      {c.name}
                    </Link>
                    {c.industry && <p className="text-xs text-slate-400">{c.industry}</p>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span key={t} className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        status === "Active"
                          ? "text-xs font-medium text-emerald-700 bg-emerald-50 rounded px-2 py-0.5"
                          : "text-xs font-medium text-slate-500 bg-slate-100 rounded px-2 py-0.5"
                      }
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{openRoles}</td>
                  <td className="px-4 py-2.5 text-slate-600">{c._count.contacts}</td>
                  <td className="px-4 py-2.5 text-slate-500">{lastContactDays}d ago</td>
                </tr>
              );
            })}
            {companies.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No companies yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
