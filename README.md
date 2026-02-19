# Hanover Claim Portal

TypeScript monorepo that implements a claims intake workflow across:
- Fastify + Prisma API (`apps/api`)
- React frontend (`apps/react-ui`)
- Angular frontend (`apps/angular-ui`)
- Shared domain types (`packages/shared`)

The project demonstrates the same business workflow in two UI frameworks against one backend contract.

## Why This Project

This repo is designed for interview discussion around:
- Full-stack TypeScript architecture
- Cross-framework UI implementation (React + Angular)
- Shared contracts and validation strategy
- Practical backend design (input validation, pagination, filtering, audit events)

## Architecture

```text
React UI (5173)  ─┐
                  ├──> Fastify API (3000) ───> Prisma ORM ───> SQLite
Angular UI (4200)─┘
                         ^
                         |
                Shared types package
                (@hanover/shared)
```

## Monorepo Layout

```text
apps/
  api/          Fastify server, Prisma schema/migrations, SQLite db
  react-ui/     Vite + React claims intake screen
  angular-ui/   Angular claims intake screen
packages/
  shared/       Domain constants and TypeScript types
```

## Major Components

### 1. API (`apps/api`)

Core technologies:
- `fastify` for HTTP server
- `zod` for request validation
- `@prisma/client` + Prisma schema for persistence
- `@fastify/swagger` + `@fastify/swagger-ui` for API docs

Main file:
- `apps/api/src/server.ts`

Key behaviors:
- `POST /claims` validates payload, rejects future `lossDate`, generates claim number (`CLM-YYYY-XXXXXX`), and writes an initial `ClaimEvent`.
- `GET /claims` supports paging and filters (`status`, `lob`, `assignedTo`, `search`).
- `GET /claims/:id` fetches a single claim with event history.
- `GET /health` provides service health.

Database model:
- `Claim` (primary record)
- `ClaimEvent` (audit/history trail)

Schema file:
- `apps/api/prisma/schema.prisma`

### 2. Shared Types (`packages/shared`)

File:
- `packages/shared/src/index.ts`

Purpose:
- Centralizes domain enums/constants (`LOBS`, `PRIORITIES`, statuses)
- Exposes `Claim` and `ClaimEvent` TypeScript shapes
- Keeps frontend contracts aligned to backend concepts

### 3. React App (`apps/react-ui`)

Core technologies:
- React + Vite + TypeScript

Main files:
- `apps/react-ui/src/App.tsx`
- `apps/react-ui/src/api.ts`

Implemented features:
- Claims list fetch on load
- Claim creation form
- Inline client-side field validation
- Future-date check before submission

### 4. Angular App (`apps/angular-ui`)

Core technologies:
- Angular (standalone components) + TypeScript + reactive forms

Main files:
- `apps/angular-ui/src/app/app.ts`
- `apps/angular-ui/src/app/claims-api.service.ts`
- `apps/angular-ui/src/app/app.html`

Implemented features:
- Claims list fetch on load
- Claim creation form
- Inline reactive-form validation messages
- Custom future-date validator
- Shared API contract behavior with React app

## API Contract Summary

### `POST /claims`

Required payload fields:
- `lob`: `"Personal Auto" | "Homeowners" | "Commercial"`
- `policyNumber`: string (min 3)
- `insuredName`: string (min 2)
- `lossDate`: `YYYY-MM-DD` and not in future
- `lossType`: string (min 2)
- `description`: string (min 5)
- `contactEmail`: valid email
- `priority`: `"LOW" | "MEDIUM" | "HIGH"`

Validation failures return `400` with `VALIDATION_ERROR`.

### `GET /claims`

Query support:
- `status`, `lob`, `assignedTo`, `search`, `page`, `pageSize`

Response shape:
- `{ page, pageSize, total, items }`

## Local Setup: DB + Localhosts

Run everything from repo root unless noted.

### 1. Install dependencies

```bash
pnpm install
```

### 2. Setup database (API / Prisma)

Generate Prisma client:

```bash
pnpm --dir apps/api prisma generate
```

Apply migrations to local SQLite DB:

```bash
pnpm --dir apps/api prisma migrate dev --name init
```

Notes:
- Database file is local SQLite (`apps/api/dev.db` via `DATABASE_URL=file:./dev.db`).
- If migrations already exist, Prisma will report database is up to date.

### 3. Start backend localhost

Terminal A:

```bash
pnpm --dir apps/api run dev
```

Backend URLs:
- API base: `http://localhost:3000`
- Health check: `http://localhost:3000/health`
- Swagger docs: `http://localhost:3000/docs`

### 4. Start React localhost

Terminal B:

```bash
pnpm --dir apps/react-ui run dev
```

React URL:
- `http://localhost:5173`

### 5. Start Angular localhost

Terminal C:

```bash
pnpm --dir apps/angular-ui run start
```

Angular URL:
- `http://localhost:4200`

### 6. Quick verification

Health check:

```bash
curl http://localhost:3000/health
```

Sample claim submit:

```bash
curl -X POST http://localhost:3000/claims \
  -H "content-type: application/json" \
  -d '{
    "lob": "Personal Auto",
    "policyNumber": "PA-123456",
    "insuredName": "Jordan Smith",
    "lossDate": "2026-02-14",
    "lossType": "Collision",
    "description": "Rear-ended at a stoplight. Minor bumper damage.",
    "contactEmail": "jordan.smith@example.com",
    "priority": "MEDIUM"
  }'
```

### 7. Optional shortcut scripts (root)

```bash
pnpm dev:api
pnpm dev:react
pnpm dev:angular
pnpm test:api
```

## Interview Walkthrough (Suggested)

1. Show architecture and explain why one backend serves two frontend frameworks.
2. Walk through `POST /claims` validation path (frontend + backend).
3. Explain shared contracts in `packages/shared` and why this reduces drift.
4. Demo React submit + list update, then Angular submit + list update.
5. Show `/docs` and discuss API discoverability.
6. Highlight tradeoffs and next steps (below).

## Tradeoffs and Next Steps

Current tradeoffs:
- SQLite for local speed and simplicity (not production scaling target).
- Basic auth/roles omitted to keep focus on workflow and framework parity.
- Styling tuned for interview polish, not a full design system.

Planned improvements:
- Add unit/integration tests (API + UI forms + service layer).
- Add authentication and claim assignment workflows.
- Add Docker + CI pipeline.
- Add richer claim timeline actions (`ASSIGNED`, `NOTE`, status transitions).
