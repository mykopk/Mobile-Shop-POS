# Feature Audit — Frontend + POS

Audit of the Next.js frontend and POS against `docs/PRD.md` and `docs/roadmap.md`. Date: 2026-08-13.

## Missing features (confirmed)

### POS — `app/(app)/pos/page.tsx`
- **No change / tender calculation** — no "amount given → change due" after payment.

### Credit & payments
- **No installments / due dates.** `CreditPayment.dueDate` exists in the Prisma schema but no service writes or filters it; the only credit endpoint is `POST /api/payment/collect` (roadmap Phase 2). Credit aging exists but is based on invoice age, not due dates.
- **No credit statement print layout.** Print Studio has SALE/PURCHASE/returns/VOUCHER/EXPENSE + inventory/expense/contacts lists, but no dedicated credit statement format.

### Settings
- **No backup / restore** (Settings has shop/preferences/financial/bank/sounds/users/audit tabs only).
- **No per-user settings** (timezone, theme, receipt footer are global).
- **No printer configuration** — Print Studio exists, but there is no printer/paper-size setup tab.

## Recently implemented

- **Duplicate-contact detection/warning** — `GET /api/contact/duplicates?phone=&name=&excludeId=`; contact form warns when a contact with the same name or phone already exists.
- **`/report/payments` grouping by bank account** — `byBankAccount` aggregates bank-transfer payments + vouchers per account; shown on the Payments report.
- **Credit aging report** — `GET /api/report/aging` with 0–30 / 31–60 / 61–90 / 90+ day buckets for receivables and payables, plus an overdue total. New page: `/reports/aging`.
- **Price history UI** — backend already logged `ProductPriceHistory` on create/update/import; products page now has a per-row history button that shows every sell/cost price change with deltas (cost gated by `reportProfit`).
- **Valuation + by-condition grouping in `GET /inventory`** — now returns `valuation` (cost/retail/potential profit, cost gated) and `byCondition` (NEW/USED units + values); inventory page shows New/Used/Total (cost), Potential profit, and Retail value chips from the server.
- **POS line + invoice discounts and price override** — each cart line has an editable price (override) and a per-line discount (clamped to the unit price, total = (price − discount) × qty); an invoice-level discount sits in the totals bar; all three are sent to `createSale` and shown on the receipt.
- **Dashboard date filter** — a `PeriodPicker` (Today/7d/30d/1y/All + custom dates) drives the overview; the sales trend, top products, payment split, new-vs-used, phones-vs-accessories, profit trend and top sellers all follow the selected period. Default stays "last 14 days"; "All time" buckets from the earliest sale.
- **Customizable dashboard layout** — `DashboardWidget` is now used: `GET/PUT /dashboard/widgets` persists each user's widget set/order; a "Customize" sheet on the dashboard lets users show, hide and reorder 12 widgets (metrics strips, charts, lists).

## Already present (not missing)

- POS: Cash/Card/Bank/Partial-split payments, tax + card fee, reservation/hold + consignment load, walk-in creation.
- Returns: sale returns + purchase returns pages.
- Stock: stock movements report, low-stock badges + thresholds.
- Contacts: credit used/limit, notes, print list, profile window, ledger, receivables/payables.
- Reports: all 15 pages.
- Print: Print Studio with PDF export, saved layouts, deep links.
- Auth: login + JWT, protected routes, granular role permissions.
