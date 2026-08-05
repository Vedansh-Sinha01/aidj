import type { TicketPriority, TicketType } from "@prisma/client";

// §6 — each manually-creatable ticket type has a sensible default priority;
// the user creating it can always override before submitting.
export const MANUAL_TICKET_TYPES: { value: TicketType; label: string; defaultPriority: TicketPriority }[] = [
  { value: "CLIENT_SWAP_REQUEST", label: "Client swap / replace request", defaultPriority: "HIGH" },
  { value: "CANDIDATE_QUALITY_COMPLAINT", label: "Candidate quality complaint", defaultPriority: "HIGH" },
  { value: "INVOICE_BILLING_DISPUTE", label: "Invoice / billing dispute", defaultPriority: "MEDIUM" },
  { value: "URGENT_ADHOC_REQUEST", label: "Urgent / ad-hoc request", defaultPriority: "HIGH" },
  { value: "CONTRACT_TERMS_QUESTION", label: "Contract / terms question", defaultPriority: "LOW" },
  { value: "CANDIDATE_CONSENT_DATA_ISSUE", label: "Candidate consent / data issue", defaultPriority: "HIGH" },
  { value: "OTHER", label: "Other", defaultPriority: "MEDIUM" },
];

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  CLIENT_SWAP_REQUEST: "Client swap / replace request",
  CANDIDATE_QUALITY_COMPLAINT: "Candidate quality complaint",
  INVOICE_BILLING_DISPUTE: "Invoice / billing dispute",
  URGENT_ADHOC_REQUEST: "Urgent / ad-hoc request",
  CONTRACT_TERMS_QUESTION: "Contract / terms question",
  CANDIDATE_CONSENT_DATA_ISSUE: "Candidate consent / data issue",
  FEEDBACK_OVERDUE: "Feedback overdue (auto)",
  GUARANTEE_REPLACEMENT: "Guarantee replacement (auto)",
  OTHER: "Other",
};
