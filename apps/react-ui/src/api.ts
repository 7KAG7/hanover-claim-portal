import type { Claim, Lob, Priority } from "@hanover/shared";

const API_BASE = "http://localhost:3000";

export type CreateClaimInput = {
  lob: Lob;
  policyNumber: string;
  insuredName: string;
  lossDate: string;
  lossType: string;
  description: string;
  contactEmail: string;
  priority: Priority;
};

export async function fetchClaims(): Promise<Claim[]> {
  const res = await fetch(`${API_BASE}/claims`);
  if (!res.ok) throw new Error(`Failed to load claims (${res.status})`);

  const data = (await res.json()) as { items: Claim[] };
  return data.items;
}

export async function createClaim(input: CreateClaimInput): Promise<Claim> {
  const res = await fetch(`${API_BASE}/claims`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error ?? `Failed to create claim (${res.status})`);
  }

  return (await res.json()) as Claim;
}
