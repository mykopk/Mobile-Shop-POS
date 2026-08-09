# Endpoints — One Folder Per Endpoint

Every REST endpoint of the API is its own folder under `endpoints/`. The folder path mirrors the URL:

| URL | Folder |
|---|---|
| `POST /api/auth/login` | `endpoints/auth/` |
| `GET /api/user` | `endpoints/user/` |
| `GET /api/user/invoice` | `endpoints/user/invoice/` (sub-resource) |
| `GET /api/product` | `endpoints/product/` |
| `GET /api/unit/imei/:imei` | `endpoints/unit/` |

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
- One endpoint = one router mounted in `server.ts` (e.g. `app.use('/api/user', userRouter)`).
- Sub-resources are nested folders (`user/invoice/`) and are mounted under the parent (`/api/user/invoice`).
- Shared infra (Prisma client, JWT, auth/error middleware, permissions, audit) lives in `core/`.
