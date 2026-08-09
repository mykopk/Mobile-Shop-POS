# DOST Mobile POS — Backend

Node.js + Express (REST API) + TypeScript + Prisma + PostgreSQL (SQLite in dev).

> Not installed yet. Scaffolding planned in [Phase 0](../docs/roadmap.md).

## Structure — one folder per endpoint

```
backend/
├── endpoints/               # one folder per API endpoint (mirrors the URL)
│   ├── auth/                #   /api/auth
│   ├── user/                #   /api/user
│   │   └── invoice/         #   /api/user/invoice   (sub-resource)
│   ├── contact/             #   /api/contact
│   ├── product/             #   /api/product
│   ├── unit/                #   /api/unit          (IMEI, inventory)
│   ├── sale/                #   /api/sale
│   ├── purchase/            #   /api/purchase      (new + used)
│   ├── payment/             #   /api/payment       (credit collections)
│   ├── bank-account/        #   /api/bank-account
│   ├── report/              #   /api/report
│   ├── dashboard/           #   /api/dashboard
│   ├── settings/            #   /api/settings      (company profile, formats)
│   └── log/                 #   /api/log           (audit)
├── core/                    # shared infra (not per-endpoint)
│   ├── config/              # env, constants
│   ├── middleware/          # auth (JWT), error handler, zod validate
│   └── lib/                 # prisma client, jwt, permissions, audit
├── prisma/
│   ├── schema.prisma        # data model (see ../docs/data-model.md)
│   └── seed.ts              # preregistered users + demo data
└── server.ts                # mounts every endpoint router
```

Each endpoint folder owns its code:

```
endpoints/user/
├── routes.ts        # Express Router (URL paths)
├── handlers.ts      # request → response logic
├── service.ts       # business logic + DB access
└── schemas.ts       # Zod validation
```

See [`docs/architecture.md`](../docs/architecture.md) and [`endpoints/README.md`](endpoints/README.md).
