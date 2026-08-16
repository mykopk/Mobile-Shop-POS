# Fig Mobile POS — Backend

Node.js + Express (REST API) + TypeScript + Prisma + SQLite.

## Quick start

```bash
npm install
cp .env.example .env        # or reuse the existing backend/.env
npx prisma migrate deploy   # apply schema migrations
npm run dev                 # tsx watch — live reload
```

Endpoints are served under `/api` (see `app.ts`). The dev server normally runs on `http://127.0.0.1:4100` (set `PORT` in `.env`). On a fresh database (no admin user yet) the server seeds catalog defaults and the onboarding flow (`/api/setup`) creates the store + first admin.

## Commands

| Script              | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Start dev server (tsx watch, live reload)       |
| `npm start`         | Start server without watch                      |
| `npm run typecheck` | `tsc --noEmit` (safe while dev server runs)     |
| `npm test`          | Run integration tests (vitest + supertest)      |
| `npm run test:watch`| Run tests in watch mode                         |
| `npm run prisma:generate` | Regenerate the Prisma client             |
| `npm run prisma:migrate`  | `prisma migrate dev` (create + apply)     |
| `npm run prisma:deploy`   | `prisma migrate deploy` (apply pending)   |
| `npm run prisma:studio`   | Prisma Studio                         |

Tests run against a throwaway `data/test.db` (created by `prisma db push` in `tests/global-setup.ts`) — they never touch `data/fig.db`.

## Structure — one folder per endpoint

```
backend/
├── app.ts                    # createApp(): mounts every endpoint router
├── server.ts                 # listens on PORT/HOST + graceful shutdown
├── endpoints/                # one folder per API endpoint (mirrors the URL)
│   ├── auth/                 #   /api/auth  (login, JWT, PIN)
│   ├── brand/ category/ color/ contact/ product/ unit/
│   ├── transaction/          #   /api/transaction  (sales, purchases, returns)
│   ├── payment/              #   /api/payment   (credit collections)
│   ├── bank-account/ voucher/ expense/ print-layout/ reservation/ inventory/
│   ├── report/               #   /api/report   (summary, sales, profit, stock…)
│   ├── dashboard/            #   /api/dashboard
│   ├── settings/             #   /api/settings  (company profile, sound prefs)
│   └── user/ log/            #   users, audit log
├── core/                     # shared infra (not per-endpoint)
│   ├── config/               # env validation (zod)
│   ├── middleware/           # auth (JWT + permissions), error handler, zod validate
│   └── lib/                  # prisma client, jwt, permissions, audit, time, numbering
├── prisma/
│   ├── schema.prisma         # data model (see ../docs/data-model.md)
│   ├── migrations/           # versioned schema migrations
│   └── seed.ts               # preregistered users + demo data
└── tests/                    # vitest integration suite
```

Each endpoint folder owns its code:

```
endpoints/<name>/
├── routes.ts        # Express Router (URL paths)
├── handlers.ts      # request → response logic
├── service.ts       # business logic + DB access
└── schemas.ts       # Zod validation
```

## Permissions

Roles (ADMIN / MANAGER / CASHIER) map to a full granular per-action matrix in
one place — `core/lib/permissions.ts`. Every resource has `<resource>.view`,
`<resource>.create`, `<resource>.update`, `<resource>.delete` plus action keys
(`product.import`, `unit.adjust`, `voucher.reverse`, `bank.setDefault`,
`print.setDefault`). **Reads are gated too**: every GET route carries its
`<resource>.view` permission; every write route its specific create/update/delete
key. Routes enforce via `requirePermission(...)` middleware. The login response
includes the granted permission strings so the frontend mirrors the same matrix.

**Permissions are stored per user** (`User.permissions` JSON, migration
`20260813000000_user_permissions` backfills each role's defaults). `requireAuth`
reads the stored list from the DB on every request (`effectivePermissions`), so
admin edits apply immediately. An empty stored list falls back to the role's
defaults. Admin user management (`endpoints/user/`: `GET/POST /api/user`,
`PUT /api/user/:id`) is gated by `user.manage` and can edit role, active flag,
PIN and the full permission list.

- ADMIN: every permission.
- MANAGER: every permission except `user.manage` and `audit.view` (admin-only).
- CASHIER: explicit read set (products, units, contacts, banks, vouchers,
  expenses, reservations, reports, settings, print) plus `sale.create`,
  `payment.collect`, `credit.view`, `reservation.create` — no other writes.

Cost/profit visibility (`report.profit`) is also permission-derived.

## Timezone

`CompanyProfile.timezone` (default `Asia/Karachi`) controls how reports and the
dashboard bucket daily totals (`core/lib/time.ts`). A sale at 00:30 PKR belongs
to the PKR day, not the UTC day.

## Env

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `PORT` | `4000` | API port |
| `DATABASE_URL` | — | SQLite file URL (e.g. `file:./data/fig.db`) |
| `JWT_SECRET` | — | Min 16 chars |
| `JWT_EXPIRES_IN` | `7d` | |
| `CORS_ORIGIN` | empty (all origins) | Comma-separated allowlist |
| `LOGIN_RATE_LIMIT_WINDOW_MS` / `LOGIN_RATE_LIMIT_MAX` | `60000` / `5` | Login brute-force protection |
| `BCRYPT_ROUNDS` | `10` | |

Seed refuses to run in production unless invoked with `--force`.

See [`docs/architecture.md`](../docs/architecture.md) and [`endpoints/README.md`](endpoints/README.md).
