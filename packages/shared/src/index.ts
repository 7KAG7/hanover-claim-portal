export const LOBS = ["Personal Auto", "Homeowners", "Commercial"] as const;
export type Lob = (typeof LOBS)[number];

export const CLAIM_STATUSES = ["SUBMITTED", "ASSIGNED", "IN_REVIEW", "CLOSED"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type Claim = {
  id: string;
  claimNumber: string;
  lob: Lob;
  policyNumber: string;
  insuredName: string;
  lossDate: string; // ISO date
  lossType: string;
  description: string;
  contactEmail: string;
  priority: Priority;
  status: ClaimStatus;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClaimEvent = {
  id: string;
  claimId: string;
  type: "STATUS_CHANGED" | "ASSIGNED" | "NOTE";
  message: string;
  createdAt: string;
};
