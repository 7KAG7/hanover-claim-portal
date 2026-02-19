import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "./app.js";

type StoredEvent = {
  id: string;
  claimId: string;
  type: string;
  message: string;
  createdAt: Date;
};

type StoredClaim = {
  id: string;
  claimNumber: string;
  lob: string;
  policyNumber: string;
  insuredName: string;
  lossDate: Date;
  lossType: string;
  description: string;
  contactEmail: string;
  priority: string;
  status: string;
  assignedTo?: string | null;
  createdAt: Date;
  updatedAt: Date;
  events: StoredEvent[];
};

function createFakePrisma() {
  const claims: StoredClaim[] = [];
  let claimId = 1;
  let eventId = 1;

  function matchesWhere(claim: StoredClaim, where: any): boolean {
    if (!where) return true;
    if (where.status && claim.status !== where.status) return false;
    if (where.lob && claim.lob !== where.lob) return false;
    if (where.assignedTo && claim.assignedTo !== where.assignedTo) return false;

    if (Array.isArray(where.OR) && where.OR.length > 0) {
      const query = String(where.OR[0]?.claimNumber?.contains ?? "").toLowerCase();
      if (!query) return true;
      return (
        claim.claimNumber.toLowerCase().includes(query) ||
        claim.insuredName.toLowerCase().includes(query) ||
        claim.policyNumber.toLowerCase().includes(query)
      );
    }

    return true;
  }

  return {
    claim: {
      create: async ({ data }: any) => {
        const now = new Date();
        const id = `claim_${claimId++}`;
        const event: StoredEvent = {
          id: `evt_${eventId++}`,
          claimId: id,
          type: data.events.create.type,
          message: data.events.create.message,
          createdAt: now,
        };
        const claim: StoredClaim = {
          id,
          claimNumber: data.claimNumber,
          lob: data.lob,
          policyNumber: data.policyNumber,
          insuredName: data.insuredName,
          lossDate: data.lossDate,
          lossType: data.lossType,
          description: data.description,
          contactEmail: data.contactEmail,
          priority: data.priority,
          status: data.status,
          assignedTo: null,
          createdAt: now,
          updatedAt: now,
          events: [event],
        };
        claims.push(claim);
        return claim;
      },
      findMany: async ({ where, skip = 0, take = 20 }: any) => {
        return claims
          .filter((claim) => matchesWhere(claim, where))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(skip, skip + take)
          .map(({ events, ...rest }) => rest);
      },
      count: async ({ where }: any) => claims.filter((claim) => matchesWhere(claim, where)).length,
      findUnique: async ({ where }: any) => {
        const claim = claims.find((item) => item.id === where.id);
        return claim ?? null;
      },
    },
  };
}

test("GET /health returns ok", async () => {
  const app = buildApp(createFakePrisma());
  await app.ready();
  const response = await app.inject({ method: "GET", url: "/health" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { ok: true });

  await app.close();
});

test("POST /claims rejects future loss dates", async () => {
  const app = buildApp(createFakePrisma());
  await app.ready();

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);

  const response = await app.inject({
    method: "POST",
    url: "/claims",
    payload: {
      lob: "Personal Auto",
      policyNumber: "PA-123456",
      insuredName: "Jordan Smith",
      lossDate: tomorrowIso,
      lossType: "Collision",
      description: "Rear-ended at a stoplight. Minor bumper damage.",
      contactEmail: "jordan.smith@example.com",
      priority: "MEDIUM",
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "VALIDATION_ERROR");

  await app.close();
});

test("POST /claims then GET /claims returns created claim", async () => {
  const app = buildApp(createFakePrisma());
  await app.ready();

  const createResponse = await app.inject({
    method: "POST",
    url: "/claims",
    payload: {
      lob: "Homeowners",
      policyNumber: "HO-0001",
      insuredName: "Alex Rivers",
      lossDate: "2026-02-14",
      lossType: "Water Damage",
      description: "Kitchen leak caused cabinet and floor damage.",
      contactEmail: "alex@example.com",
      priority: "HIGH",
    },
  });

  assert.equal(createResponse.statusCode, 201);
  const created = createResponse.json();
  assert.match(created.claimNumber, /^CLM-\d{4}-\d{6}$/);
  assert.equal(created.events.length, 1);

  const listResponse = await app.inject({
    method: "GET",
    url: "/claims?search=alex&page=1&pageSize=20",
  });

  assert.equal(listResponse.statusCode, 200);
  const list = listResponse.json();
  assert.equal(list.total, 1);
  assert.equal(list.items[0].insuredName, "Alex Rivers");

  await app.close();
});
