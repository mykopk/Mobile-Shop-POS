# DOST Mobile POS — Roadmap

## Phase 0 — Foundation
- [x] Docs: PRD, data model, architecture, roadmap
- [x] **Backend**: scaffold Express + TypeScript + Prisma (SQLite), migrations
- [x] **Backend**: `schema.prisma` from `docs/data-model.md`, seed with **preregistered users** (`arslan`/`saima`/`ali`)
- [x] **Backend**: JWT auth (username + PIN), permission guard middleware, error handler
- [x] **Frontend**: scaffold Next.js + Tailwind + shadcn/ui, `apiClient` (fetch + token), login page wired to `/api/auth/login`
- [ ] **Frontend**: AppShell layout (sidebar/topbar), protected routes → redirect to `/login`

## Phase 1 — Core POS (v1 must-have)
- [ ] **Backend**: products, units, contacts, transactions, payments endpoints
- [ ] **Frontend**: Products CRUD + price history
- [ ] **Frontend**: Units + IMEI validation, condition/status badges, unit picker
- [ ] **Frontend**: **Sale flow**: search → cart → NEW/USED unit picker → contact → payment → receipt
- [ ] **Frontend**: **Purchase flow**: Buy New (vendor, multi-IMEI) + Buy Used (walk-in, grade)
- [ ] **Frontend**: Unified Contacts with dedupe warning
- [ ] Returns (sale + purchase), stock movements log

## Phase 2 — Money & Credit
- [ ] Bank accounts: register shop accounts, tap-choice in payment sheet
- [ ] Multi-payment split (cash/card/bank-account/credit) + change calculation
- [ ] Partial credit: credit portion only goes to balance; remaining-due tracking
- [ ] Credit accounts, installments, due dates, collect payments, overdue list
- [ ] Expenses
- [ ] Contact ledger with running balance

## Phase 3 — Analytics & Reports
- [ ] Report hub: sales, profit (by brand/model/condition), purchases, stock valuation, statements
- [ ] **Customizable dashboard**: widget gallery, drag/drop layout, saved per user
- [ ] Export (PDF/Excel), print

## Phase 4 — Hardening & Polish
- [ ] Audit log viewer + admin screens
- [ ] Company profile: logo upload, footer, currency, tax
- [ ] Print formats: thermal 80mm, A4 invoice, purchase slip, credit statement
- [ ] Settings: printer default per use case, backup/restore
- [ ] Search perf (indexes, debounce, pagination)
- [ ] Bulk import/export catalog
- [ ] Package as **offline desktop app (Electron)** — frontend + API + SQLite in one file
- [ ] Backups: `data/dost.db` export / restore in Settings

## Phase 5 — Later
- [ ] Offline queue for POS
- [ ] Layaway / holds / quotes
- [ ] SMS/WhatsApp reminders
- [ ] Tax report, Z-report, cash register reconciliation
- [ ] Accessory expiry tracking

---

## Milestone target
**Phase 1 + 2 + 3** = usable v1 for a real phone shop (sell, buy, track, analyze).
