"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import type { UserRole } from "@prisma/client";
import { NotificationBell } from "./NotificationBell";

const LINKS: { href: string; label: string; managerOnly?: boolean }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/companies", label: "Companies" },
  { href: "/leads", label: "Leads" },
  { href: "/tickets", label: "Tickets" },
  { href: "/invoices", label: "Invoices", managerOnly: true },
  { href: "/settings", label: "Settings" },
];

export function NavBar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: UserRole;
}) {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 flex items-center h-14 gap-6">
        <Link href="/" className="font-semibold text-slate-900 shrink-0">
          Optizm Global
        </Link>
        <nav className="flex items-center gap-1 flex-1">
          {LINKS.filter((l) => !l.managerOnly || userRole === "MANAGER").map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-sm font-medium",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <NotificationBell />
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right leading-tight">
            <div className="text-sm font-medium text-slate-900">{userName}</div>
            <div className="text-xs text-slate-400">
              {userRole === "MANAGER" ? "Manager / CEO" : "Recruiter"}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
