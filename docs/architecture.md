# DOST Mobile POS — Architecture

## 1. Tech Stack (Separate Backend + Frontend)

| Layer | Choice |
|---|---|
| **Backend** | **Node.js + Express** (REST API) + TypeScript |
| **Frontend** | **Next.js (App Router)** + TypeScript (SPA-style, talks to API) |
| **ORM** | **Prisma** |
| **DB** | **SQLite (embedded, `backend/data/dost.db`)** — single client, offline desktop |
| **Auth** | **Simple JWT login** — preregistered users only (**username + 4-digit PIN**). No OAuth, no signup. |
| **Validation** | Zod |
| **Styling / UI** | Tailwind CSS + shadcn/ui |
| **Charts** | Recharts |
| **Receipts** | Browser print with per-format templates (80mm / A4 / slips) |

### Why separate?
- Backend is a pure API — reusable, testable, can run independently.
- Frontend is only UI — swapable, no DB access, no business logic.
- Clear contract between the two (REST endpoints + JSON) → both can be built in parallel.

> **Deployment shape (decided):** the app runs **fully offline on one machine** — a desktop app later packaged with Electron where the embedded Express API (this `backend/`) + SQLite DB + Next.js UI all live in one app file. No server, no Postgres, no internet required. A future online/multi-terminal mode is possible by swapping SQLite → Postgres through Prisma with no schema or frontend changes.

## 2. Project Structure (monorepo)

```
dost-mobile-pos/
├── backend/                      # Express API (own package.json, own Prisma)
│   ├── endpoints/                # ONE FOLDER PER ENDPOINT (mirrors the URL)
│   │   ├── auth/                 #   /api/auth  → routes.ts, handlers.ts,
│   │   │                         #                 service.ts, schemas.ts
│   │   ├── user/                 #   /api/user
│   │   │   └── invoice/          #   /api/user/invoice   (sub-resource)
│   │   ├── contact/  product/    #   /api/contact, /api/product
│   │   ├── unit/     sale/       #   /api/unit (IMEI/inventory), /api/sale
│   │   ├── purchase/ payment/    #   /api/purchase (new+used), /api/payment
│   │   ├── bank-account/ report/ #   /api/bank-account, /api/report
│   │   ├── dashboard/ settings/  #   /api/dashboard, /api/settings
│   │   └── log/                  #   /api/log (audit)
│   ├── core/                     # shared infra (not per-endpoint)
│   │   ├── config/               # env, constants
│   │   ├── middleware/           # auth (JWT verify), error handler, zod validate
│   │   └── lib/                  # prisma client, jwt, permissions, audit
│   ├── prisma/
│   │   ├── schema.prisma         # data model (docs/data-model.md)
│   │   ├── migrations/
│   │   └── seed.ts               # preregistered users + demo store/products/units
│   └── server.ts                 # mounts every endpoint router
│
├── frontend/                     # Next.js app (no DB, no business logic)
│   ├── app/
│   │   ├── login/                # simple login page
│   │   ├── (app)/                # authed pages (layout w/ sidebar)
│   │   │   ├── dashboard/  pos/  purchases/  inventory/  products/
│   │   │   ├── contacts/  reports/  users/  bank-accounts/  settings/  logs/
│   │   ├── layout.tsx  page.tsx
│   ├── components/               # ui/, layout/, pos/, payments/, printing/,
│   │                             #   inventory/, contacts/, dashboard/, reports/,
│   │                             #   company/, shared/
│   ├── lib/                      # apiClient (fetch wrapper + token), format, auth-store
│   └── package.json
│
└── docs/                         # this documentation set
```

### Frontend ↔ Backend contract
- Frontend never touches the DB. All data via `backend` REST API.
- `frontend/lib/apiClient.ts` — thin wrapper over `fetch` that attaches the JWT (`Authorization: Bearer`) and handles 401 → redirect to `/login`.
- API responses: `{ data: ... }` on success, `{ error: { message, code } }` on failure.

## 3. Authentication (simple, preregistered users only)

- **No registration UI, no OAuth, no social login.**
- Users are created by the Admin (or seeded) in the backend. They log in with **username + 4-digit PIN**.
- `POST /api/auth/login` → validates against `User` table → returns **JWT** (contains `userId`, `username`, `role`).
- PINs hashed (bcrypt) via `BCRYPT_ROUNDS`; JWT expiry via `JWT_EXPIRES_IN`.
- Frontend stores the token + user (localStorage) and sends the token with every request.
- Middleware guards every route except `/auth/login`.
- Demo/seed users: `arslan`/1111 (ADMIN), `saima`/2222 (MANAGER), `ali`/3333 (CASHIER).

## 4. API Routes (backend)

| Method & Path | Endpoint folder | Purpose |
|---|---|---|
| `POST /api/auth/login` | `endpoints/auth/` | Login (username+PIN) → JWT |
| `GET/POST /api/contact` · `/api/contact/:id` · `/ledger` · `/credit` | `endpoints/contact/` | Unified contacts, ledger, credit, collect |
| `GET/POST/PUT /api/product` · `/api/product/:id/prices` | `endpoints/product/` | Catalog + price history |
| `GET /api/product/search?q=` | `endpoints/product/` | Debounced POS search (name/SKU/IMEI) |
| `GET/POST /api/unit` · `GET /api/unit/imei/:imei` · `POST /api/unit/adjust` | `endpoints/unit/` | Units, IMEI trace, stock adjustment |
| `GET/POST /api/purchase` · `/new` · `/used` · `/returns` | `endpoints/purchase/` | Purchases (new & used) + returns |
| `GET/POST /api/sale` · `/returns` · `/api/sale/:id` | `endpoints/sale/` | Sales + returns |
| `GET/POST /api/payment/collect` | `endpoints/payment/` | Credit collections |
| `GET/POST /api/bank-account` | `endpoints/bank-account/` | Shop bank accounts |
| `GET /api/report/*` | `endpoints/report/` | Sales, profit, stock valuation, statements, payments-by-account |
| `GET /api/dashboard` + widgets | `endpoints/dashboard/` | Analytics data + saved layouts |
| `GET/POST /api/user` · `PATCH /api/user/:id` | `endpoints/user/` | Users & roles (admin) |
| `GET /api/user/invoice` | `endpoints/user/invoice/` | Invoices for a user (sub-resource) |
| `GET/PUT /api/settings/company` · `/print-formats` | `endpoints/settings/` | Company profile, formats |
| `GET /api/log` | `endpoints/log/` | Audit log (admin) |

## 5. Page / Screen Map (frontend)

| Route | Screen | Who |
|---|---|---|
| `/login` | Simple login page | all |
| `/dashboard` | Customizable widgets dashboard | Manager, Admin |
| `/pos` | **Point of Sale** — search, cart, payment, receipt | Cashier, Manager, Admin |
| `/pos/:txnId` | View sale detail + reprint receipt | Cashier+ |
| `/purchases` | List purchases + "Buy new / Buy used" | Manager, Admin |
| `/purchases/new` | **Buy new** stock (vendor) — enter IMEIs | Manager, Admin |
| `/purchases/used` | **Buy used** phone (walk-in/vendor) — grade + price | Manager, Admin |
| `/purchases/returns` | Purchase returns | Manager, Admin |
| `/inventory/new` | **NEW phones** inventory view | Manager, Admin |
| `/inventory/used` | **USED phones** inventory view (grades) | Manager, Admin |
| `/inventory` | All units + filters (condition/status) | Manager, Admin |
| `/inventory/imei/:imei` | Full IMEI history timeline | Manager, Admin |
| `/inventory/movements` | Stock movement log | Manager, Admin |
| `/products` | Catalog list + variant editing | Manager, Admin |
| `/contacts` | Unified contacts list | All (view limited) |
| `/contacts/:id` | Ledger + credit | All (view limited) |
| `/reports` | Report hub (sales, profit, stock valuation, statements) | Manager, Admin |
| `/users` | Users & roles (preregistered users live here) | Admin |
| `/bank-accounts` | Register/manage shop bank accounts | Manager, Admin |
| `/settings` | Company profile (logo), tax, printer & formats, backup | Admin |
| `/logs` | Audit log | Admin |

## 6. NEW vs USED — Convenient Separation

The whole app treats new and used phones as **first-class, visibly separate** — never mixed in one cluttered list.

- **Nav + sidebar**: dedicated `Inventory › New` and `Inventory › Used` entries; `Purchases › Buy New` and `Purchases › Buy Used` entries.
- **POS unit picker**: shows NEW and USED as two clearly separated tabs/sections with their own prices; condition badge on every unit.
- **Buy flows**: two distinct screens (`Buy New` for vendor stock, `Buy Used` for walk-in/trade-ins with condition grading A/B/C/D and negotiated price).
- **Inventory views**: separate tables per condition, each with its own stock count and valuation in the header.
- **Reports & dashboard**: every report breaks down NEW vs USED (sales split, profit split, stock valuation split); dashboard has per-condition KPIs/widgets.
- **Data layer**: one `Unit.condition` enum (`NEW | USED`) keeps the schema unified — separation is a UI/UX convention, not duplicated tables.

## 7. Component Library

Built on **shadcn/ui** primitives:

- **POS**: `ProductSearch` (debounced, IMEI/SKU), `CartLine`, `PaymentSheet` (multi-method split + bank-account tap choices + change calc), `ContactQuickPick`, `ReceiptView` (80mm).
- **New/Used**: `ConditionTabs`, `ConditionBadge`, `NewUsedSection` (POS picker split), `UsedGradePicker` (A/B/C/D).
- **Payments**: `MethodTabs` (Cash / Card / Bank / Credit), `BankAccountPicker`, `AmountInput` (received + change), `PaymentSummary` (remaining due).
- **Printing**: `PrintDialog` + per-format templates — `ReceiptThermal` (80mm), `InvoiceA4` (letterhead + logo), `PurchaseSlip`, `CreditStatement`; own print CSS each; browser print + PDF.
- **Inventory**: `ImeiInput` (scanner-friendly, batch), `UnitTable`, `StatusBadge`, `UnitTimeline` (source → sale history of one IMEI).
- **Contacts**: `ContactForm` (dedupe warning on matching phone), `ContactLedger`, `BalanceCard`.
- **Dashboard**: `WidgetFrame` (drag/drop + resize), `WidgetGallery`, `DateRangePicker`, KPI/chart widgets.
- **Company**: `CompanyProfileForm` (name, address, **logo upload**, footer text, currency, tax).
- **Shared**: `Money`, `ConfirmDialog`, `EmptyState`, `SearchInput`, `Pagination`, `PrintButton`.

## 8. Permissions Matrix

| Capability | Cashier | Manager | Admin |
|---|:---:|:---:|:---:|
| Make a sale | ✅ | ✅ | ✅ |
| Buy new / used (purchase) | ❌ | ✅ | ✅ |
| Refund / void a sale | ❌ | ✅ | ✅ |
| Override price / discount | ❌ | ✅ | ✅ |
| View costs / profit | ❌ | ✅ | ✅ |
| Manage inventory (adjust) | ❌ | ✅ | ✅ |
| View reports & dashboard | ❌ | ✅ | ✅ |
| Manage contacts | view | ✅ | ✅ |
| Manage users / roles | ❌ | ❌ | ✅ |
| Settings & backup | ❌ | ❌ | ✅ |
| View audit log | ❌ | ❌ | ✅ |

Enforced **server-side** in backend middleware/service guards; frontend only hides UI.

## 9. Key Flows

### Sell a phone (with NEW/USED split)
1. Cashier opens `/pos`, types model or scans IMEI.
2. Unit picker shows **NEW / USED tabs** — cashier picks a specific in-stock unit by IMEI.
3. Cart shows product + condition + chosen IMEI.
4. Contact: quick-pick or "Walk-in".
5. Payment sheet: total Rs 1,000 → Rs 300 cash, Rs 200 into **Bank Account A** (tap), Rs 500 credit (links contact's credit account); received + change shown live.
6. Backend `transactionService.createSale()`: sets units `SOLD`, writes stock movements, one `Payment` row per method (credit portion bumps `CreditAccount.balance` by its amount only), writes audit log.
7. Receipt prints (80mm default; A4 selectable): items, IMEIs, payment split per method + bank account, remaining credit due.

### Buy a used phone
1. Manager opens `/purchases/used` (clearly separate from buy-new).
2. Enters IMEI, picks product, **used grade (A/B/C/D)**, agreed price.
3. Contact: existing or **new** → `Contact` type `WALK_IN` (dedupe first).
4. Backend creates `Unit` (`USED`, source `BOUGHT_WALKIN`), `Transaction` (PURCHASE), payment to seller.

### Buy new stock
1. Manager opens `/purchases/new`.
2. Picks product variant + vendor, enters quantities + IMEIs + unit costs (bulk entry).
3. Backend creates `Unit`s (`NEW`, source `VENDOR_PURCHASE`) + PURCHASE transaction.

### Trace an IMEI
1. `/inventory/imei/:imei` → unit card (condition, cost, status, grade) + timeline of movements & transactions.

## 10. Env / Config

Backend `.env`: `DATABASE_URL` (`file:./data/dost.db`), `JWT_SECRET`, `PORT` (**4100** — 4000 is used by other dev servers), `BCRYPT_ROUNDS`.
Frontend `.env.local`: `NEXT_PUBLIC_API_URL` (e.g. `http://127.0.0.1:4100/api`).

## 11. Deploy (offline desktop)

- **Single machine, fully offline.** The Express API + SQLite DB run locally (`127.0.0.1:4100`); the frontend talks to it over `NEXT_PUBLIC_API_URL`.
- Production packaging: **Electron app** bundling the Next.js frontend + the Express engine + SQLite in one file — no separate server, DB server, or internet.
- Backups: copy `backend/data/dost.db` (or on-demand export in Settings).
- Future online/multi-terminal: swap Prisma provider SQLite → Postgres; move `backend` to a host; no schema or frontend contract changes.
