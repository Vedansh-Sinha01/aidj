import { auth } from "@/lib/auth";
import type { UserRole } from "@prisma/client";
import type { Session } from "next-auth";

export class UnauthorizedError extends Error {
  status: number;
  constructor(message = "Unauthorized") {
    super(message);
    this.status = 401;
  }
}

export class ForbiddenError extends Error {
  status: number;
  constructor(message = "Forbidden") {
    super(message);
    this.status = 403;
  }
}

/** Server-side guard for API routes: throws if not logged in, optionally enforcing a role. */
export async function requireUser(minRole?: UserRole): Promise<Session["user"]> {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  if (minRole === "MANAGER" && session.user.role !== "MANAGER") {
    throw new ForbiddenError("This action requires Manager/CEO access.");
  }
  return session.user;
}

export function isManager(role: UserRole | undefined) {
  return role === "MANAGER";
}

/** Central place for "who can see invoice/AR/fee data" (§2). */
export function canViewFinancials(role: UserRole | undefined) {
  return role === "MANAGER";
}
