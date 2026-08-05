import type { Candidate } from "@prisma/client";

export type MatchResult = {
  candidateId: string;
  score: number;
  reasons: string[];
};

function extractYearsRequirement(requirements: string): number | null {
  const match = requirements.match(/(\d+)\+?\s*years?/i);
  return match ? Number(match[1]) : null;
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length > 2);
}

/**
 * §10 — basic/deterministic "Find Matches". Runs structured filters (years
 * of experience, certifications, location, most recent title) against a
 * role's free-text requirements. Intentionally not semantic/LLM matching —
 * that's a deferred v2 upgrade — but every input here is a real column, so
 * swapping in an LLM ranker later doesn't require a data model change.
 */
export function scoreCandidateAgainstRole(
  candidate: Candidate,
  roleTitle: string,
  requirements: string | null
): MatchResult {
  const req = requirements ?? "";
  const reasons: string[] = [];
  let score = 0;
  let maxScore = 0;

  // Years of experience
  maxScore += 30;
  const requiredYears = extractYearsRequirement(req);
  if (requiredYears != null) {
    if (candidate.yearsOfExperience != null && candidate.yearsOfExperience >= requiredYears) {
      score += 30;
      reasons.push(`${candidate.yearsOfExperience}+ years meets the ${requiredYears}-year requirement`);
    } else if (candidate.yearsOfExperience != null) {
      const ratio = Math.max(0, candidate.yearsOfExperience / requiredYears);
      score += Math.round(30 * Math.min(1, ratio));
      reasons.push(`${candidate.yearsOfExperience} years vs. ${requiredYears} required`);
    }
  } else {
    score += 15; // no explicit requirement stated — neutral credit
  }

  // Certifications
  maxScore += 25;
  const reqWords = new Set(words(req));
  const certMatches = candidate.certifications.filter((cert) =>
    words(cert).some((w) => reqWords.has(w))
  );
  if (candidate.certifications.length > 0) {
    const pct = certMatches.length / Math.max(1, candidate.certifications.length);
    score += Math.round(25 * (certMatches.length > 0 ? Math.max(0.4, pct) : 0.1));
    if (certMatches.length > 0) reasons.push(`Certifications match: ${certMatches.join(", ")}`);
  }

  // Location / work arrangement
  maxScore += 20;
  const reqLower = req.toLowerCase();
  if (candidate.workArrangement === "REMOTE" && reqLower.includes("remote")) {
    score += 20;
    reasons.push("Remote-eligible, role allows remote");
  } else if (candidate.locationText && reqLower.includes(candidate.locationText.toLowerCase().split(",")[0])) {
    score += 20;
    reasons.push(`Location match: ${candidate.locationText}`);
  } else {
    score += 5;
  }

  // Most recent title / role fit
  maxScore += 25;
  const titleWords = new Set(words(roleTitle + " " + req));
  const candidateTitleWords = words(candidate.mostRecentTitle ?? "");
  const titleOverlap = candidateTitleWords.filter((w) => titleWords.has(w)).length;
  if (candidateTitleWords.length > 0 && titleOverlap > 0) {
    score += Math.min(25, titleOverlap * 10);
    reasons.push(`Recent title "${candidate.mostRecentTitle}" overlaps role requirements`);
  } else {
    score += 5;
  }

  return {
    candidateId: candidate.id,
    score: Math.round((score / maxScore) * 100),
    reasons,
  };
}
