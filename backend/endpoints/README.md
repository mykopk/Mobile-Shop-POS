# Endpoints — One Folder Per Endpoint

Every REST endpoint of the API is its own folder under `endpoints/`. The folder path mirrors the URL:

| URL | Folder |
|---|---|
| `POST /api/auth/login` | `endpoints/auth/` |
| `GET /api/contact` | `endpoints/contact/` |
| `GET /api/product` | `endpoints/product/` |
| `GET /api/unit/imei/:imei` | `endpoints/unit/` |
| `POST /api/transaction/sale` | `endpoints/transaction/` |
| `GET /api/report/sales` | `endpoints/report/` |

Each endpoint folder owns **all** of its code:

```
endpoints/user/
├── routes.ts        # Express Router: defines the URL paths for this endpoint
├── handlers.ts      # request → response logic (parse, validate, call service)
├── service.ts       # business logic + DB access
└── schemas.ts       # Zod validation for request bodies/params
```

Rules:
- No shared business logic lives in handlers — cross-endpoint logic goes in `core/`.
- One endpoint = one router mounted in `app.ts` (e.g. `app.use('/api/user', userRouter)`).
- Shared infra (Prisma client, JWT, auth/permission middleware, audit, time) lives in `core/`.
- Every route (read and write) is gated with `requirePermission(...)` from `core/lib/permissions.ts` — each resource has `<resource>.view/create/update/delete` keys.
- Permissions are stored per user (`User.permissions` JSON) and enforced from the DB on every request via async `requireAuth`. An empty stored list falls back to `ROLE_PERMISSIONS[role]`. Admins edit them via `PUT /api/user/:id`.
