import { prisma } from "@/lib/prisma";

const SUFFIXES = /\b(inc|llc|corp|corporation|co|ltd|company|group|global|holdings)\.?\b/g;

export function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(SUFFIXES, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function emailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  return at === -1 ? null : email.slice(at + 1).toLowerCase();
}

// Levenshtein distance -> similarity ratio in [0, 1].
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array(b.length + 1).fill(i === 0 ? 0 : 0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const distance = dp[a.length][b.length];
  return 1 - distance / Math.max(a.length, b.length);
}

const NAME_SIMILARITY_THRESHOLD = 0.8;

export type DuplicateMatch = {
  id: string;
  name: string;
  kind: "company" | "lead";
  reason: "name" | "domain";
};

/**
 * Warn-before-create duplicate check (§1) — compares against existing
 * Companies and Leads by fuzzy name match and, if an email is supplied, by
 * shared email domain (via each company's contacts).
 */
export async function findPotentialDuplicates(
  name: string,
  contactEmail?: string | null
): Promise<DuplicateMatch[]> {
  const normalized = normalizeName(name);
  const domain = emailDomain(contactEmail);

  const [companies, leads] = await Promise.all([
    prisma.company.findMany({ include: { contacts: { select: { email: true } } } }),
    prisma.lead.findMany(),
  ]);

  const matches: DuplicateMatch[] = [];

  for (const c of companies) {
    const nameMatch = similarity(normalized, normalizeName(c.name)) >= NAME_SIMILARITY_THRESHOLD;
    const domainMatch =
      domain != null && c.contacts.some((ct) => emailDomain(ct.email) === domain);
    if (nameMatch || domainMatch) {
      matches.push({
        id: c.id,
        name: c.name,
        kind: "company",
        reason: domainMatch && !nameMatch ? "domain" : "name",
      });
    }
  }

  for (const l of leads) {
    const nameMatch = similarity(normalized, normalizeName(l.companyName)) >= NAME_SIMILARITY_THRESHOLD;
    const domainMatch = domain != null && emailDomain(l.contactEmail) === domain;
    if (nameMatch || domainMatch) {
      matches.push({
        id: l.id,
        name: l.companyName,
        kind: "lead",
        reason: domainMatch && !nameMatch ? "domain" : "name",
      });
    }
  }

  return matches;
}
