# DOST Mobile POS

A unified Point-of-Sale system for mobile phone shops — built around **one simple idea: everything is a contact, every phone is a tracked unit.**

Buy new or used phones, sell them to anyone (walk-in, customer, or vendor), track each phone by IMEI with its condition and history, and get full analytics with a customizable dashboard.

## Highlights

- **Unified Contacts** — one record for customers *and* vendors (a walk-in who sells you a used phone and buys a new one is one contact).
- **Unit-level phone tracking** — each physical phone is a `Unit` with IMEI, condition (NEW/USED), and full source → status history.
- **Convenient NEW/USED separation** — separate buy flows, inventory views, and report breakdowns for new vs used phones.
- **Purchase + Sale** in one flow — buy from vendors, buy used from walk-ins, sell new/used, handle returns on both sides.
- **Credit & installments** — buy-now-pay-later with per-contact credit accounts and due tracking.
- **Bank accounts & split payments** — pre-registered shop accounts as tap-choices; pay across cash/card/bank/credit.
- **Customizable analytics dashboard** — widgets you can add, remove, and rearrange per user.
- **Roles & permissions** — Admin / Manager / Cashier with a full audit log.

## Stack

**Separate backend + frontend:**

- **Backend**: Node.js + Express (REST API) + TypeScript + Prisma + PostgreSQL (SQLite in dev)
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Auth**: simple login with **preregistered users only** (email + password → JWT)
- **Charts**: Recharts · **Validation**: Zod

## Docs

| Doc | Contents |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Product requirements — full feature lists, user stories, priorities |
| [`docs/data-model.md`](docs/data-model.md) | Database design — Prisma schema plan |
| [`docs/architecture.md`](docs/architecture.md) | Stack, project structure, page map, component library, permissions |
| [`docs/roadmap.md`](docs/roadmap.md) | Build milestones |

## Status

Phase 1 — Documentation (in progress). See [`docs/roadmap.md`](docs/roadmap.md) for what's next.
