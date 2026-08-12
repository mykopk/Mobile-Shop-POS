# DOST Mobile POS — Product Requirements Document (PRD)

## 1. Vision

A single system for a mobile phone shop that **buys and sells** phones (new + used) from **anyone** — vendors, walk-in customers, and regular customers — while tracking every physical phone by IMEI and giving a **customizable analytics dashboard**.

**Design principles**
1. **Unified, no duplication.** One `Contact`, one `Product` catalog, one `Transaction` model. A person is never two records; a sale and a purchase never live in separate systems.
2. **Everything is traceable.** Every phone unit knows where it came from (which contact, when, at what cost) and where it went.
3. **Fast cashier UX.** The POS screen is built for speed: scan, tap, done.
4. **Analytics by default.** Every transaction feeds the dashboard automatically.

---

## 2. Terminology

| Term | Meaning |
|---|---|
| **Contact** | Any party: walk-in, customer, vendor, or both customer & vendor |
| **Product** | A catalog item / model variant (e.g. "iPhone 13 — 128GB — Blue") |
| **Unit** | One physical phone with a unique IMEI, condition, and history |
| **Transaction** | A purchase or a sale (and their returns) |
| **Condition** | NEW or USED |
| **Source** | Where a unit came from (vendor purchase, bought from walk-in, returned sale, etc.) |

---

## 3. Functional Requirements

### 3.1 Dashboard (Customizable Analytics)

**P0**
- KPI cards: today's sales, today's profit, units sold today, units in stock, low-stock count, outstanding credit.
- Charts: sales over time (line), sales by condition (bar/pie), top sellers (bar), profit by brand (bar).
- Date-range filter (Today / This week / This month / Custom).
- **Customizable layout**: user can add/remove widgets, rearrange, resize; layout is saved per user.
- Clicking a widget deep-links to the underlying report.

**P1**
- Widget presets (e.g. "Cashier view", "Owner view") and widget gallery.
- Compare period (vs last week/month).
- Export dashboard as PDF/screenshot.

### 3.2 Contacts (Unified — replaces "Customers" and "Vendors")

**P0**
- One contact record with **type**: `Walk-in` | `Customer` | `Vendor` | `Both`.
- A walk-in can become a full customer/vendor later — **same record, type upgraded, no duplication**.
- Fields: name, phone, email, address, notes, credit limit.
- Contact ledger: full history of everything bought *from* them and sold *to* them.
- Running balance (payable to them / receivable from them).
- Credit account per contact: limit, current balance, installment tracking, due dates.
- Deduplication: on save, warn if phone number already exists.

**P1**
- Purchase/sale totals and margin per contact.
- Vendor pricing notes per brand.
- Tags (e.g. "wholesale", "trade-in", "repeat").

### 3.3 Products (Catalog)

**P0**
- Phone catalog: brand, model, storage, color, category.
- Variant = combination of model + storage + color → one `Product` record.
- **New and used phones are separate categories** (seeded Category rows `New Phone` / `Used Phone`) with their own sell/cost prices; the same model+storage+color can exist once per condition. Categories are managed from the Products screen (add/rename/deactivate) — adding "Refurbished" needs no code change.
- SKU + IMEI searchable.
- Sell price, purchase (cost) price, and **price history**.
- Accessories category (covers, chargers, earbuds) — quantities only, no IMEI.
- Low-stock threshold per product.
- Image + short specs.

**P1**
- Bulk import/export (CSV/Excel).
- Default pricing rules per brand/margin %.

### 3.4 Inventory (Unit-Level, IMEI-Based)

**P0**
- Each phone = a **Unit** with:
  - Unique **IMEI** (validated)
  - **Condition**: NEW / USED
  - **Status**: In Stock / Reserved / Sold / Returned / Damaged / Written off
  - **Source**: Vendor purchase · Bought from walk-in · Sale return · Purchase return
  - Cost price (what the shop paid) and date acquired
  - Linked transaction + source contact
- **Convenient NEW/USED separation everywhere** (see §3.12):
  - Separate nav entries, buy flows, and inventory views for New vs Used
  - POS picker shows NEW / USED as separate tabs
  - Used phones carry a condition grade (A/B/C/D)
  - Reports and dashboard always break down NEW vs USED
- Stock movements log for every change (in, out, adjust, transfer).
- **Low-stock alerts** counted per product variant (separately per condition).
- Stock valuation (sum of cost price, split NEW vs USED).
- IMEI lookup: type/paste an IMEI to see full history of that exact phone.

**P1**
- Multi-unit entry with quick IMEI scanning (USB scanner / camera).
- Reserve units for an in-progress sale / layaway.
- Expiry tracking for accessories (optional).

### 3.5 Purchase (Buying)

**P0**
- Buy **new** stock from vendors: pick product → enter quantities + IMEIs + unit costs.
- Buy **used** phones from walk-ins/vendors: quick "buy used" flow, condition assessment (grade note), agreed price.
- Purchase document: number, contact (the seller), items, total, payments made.
- Payments to seller: cash, card, bank, or credit against their account.
- Purchase returns (send faulty unit back → refund).

**P1**
- Purchase orders (record order → receive later, partial delivery).
- Supplier invoice attachment/scan.

### 3.6 Sale (Selling)

**P0**
- Fast POS cart: search by name/SKU/IMEI, tap to add.
- Pick a **specific unit** by IMEI — choose which exact phone to sell (new or used).
- Accessories saleable as quantity line items.
- Sell to any contact (default: walk-in).
- **Walk-in customer quick-create**: the sale screen offers a "Walk-in (new)" option that reveals **Customer Name** and **Phone Number** fields; on checkout the contact is auto-created and reused for future sales (no need to pre-create it in Contacts).
- Discounts: line-level and order-level; **price override** gated by permission.
- **Multi-payment split**: a single total can be paid in parts — e.g. Rs 1,000 total → Rs 300 cash, Rs 200 into bank account A, Rs 500 credit.
  - Cash & card: enter amount received, change due calculated.
  - Bank transfer: pick a **pre-registered bank account** (see §3.11) — money lands in one of the shop's accounts; optionally split across two accounts.
  - Credit: amount moved onto the contact's credit account (balance increases by that portion).
- **On credit**: track balance remaining and optional installment plan. Example: total Rs 1,000, Rs 500 paid in credit → Rs 500 remains as the contact's outstanding balance, cleared via collections.
- **Receipt**: print-ready, thermal-80mm friendly, includes IMEI, brand, condition.
- Sale returns / refunds (unit returns to stock as USED unless unopened).

**P1**
- Hold/quote a cart and recall it.
- Layaway (partial payments held against a reserved unit).
- Warranty note on receipt.

### 3.7 Credit & Installments

**P0**
- Per-contact credit limit and running balance.
- Sell on credit → balance increases by exactly the credit portion paid; collect payment → balance decreases.
- **Partial-credit example**: bill Rs 1,000, buyer pays Rs 500 now (any method) + Rs 500 on credit → `CreditAccount.balance` becomes Rs 500. Every later collection reduces it. The receipt shows both parts and the remaining due.
- Installment plans: down payment + N installments with due dates.
- Overdue list with days-past-due.
- Receipts for credit collections.

**P1**
- Reminders (SMS/WhatsApp link).
- Credit limit enforcement toggle.

### 3.8 Users, Roles & Permissions

**P0**
- **Simple login page** — username + 4-digit PIN only.
- **Preregistered users only** — no signup, no OAuth, no social login. Users are created by the Admin and/or seeded (see `prisma/seed.ts`).
- Session: JWT issued on login (PIN is the password, hashed with bcrypt).
- Roles: **Admin** (everything), **Manager** (sales, purchases, inventory, reports), **Cashier** (POS only, no cost/price visibility, no reports).
- Permission flags (see architecture doc): view costs, override price, void/refund, delete, manage users, view reports, manage inventory.
- **Audit log**: every sale, purchase, void, refund, adjustment, user change.

**P1**
- 2FA for admin.

### 3.9 Reports

**P0**
- Sales report (day/week/month, by cashier, by condition).
- Profit report (revenue − cost, margin %, by brand/model/condition).
- Purchases report (what we bought, from whom, at what cost).
- Top sellers / slow movers.
- Stock valuation (NEW vs USED).
- Contact statements (per contact: all transactions + balance).
- Credit & overdue report.
- Payments summary (cash/card/bank split, grouped by bank account).

**P1**
- Tax report, Z-report (end-of-day cash register), export to PDF/Excel.

### 3.10 Bank Accounts (pre-registered payment methods)

**P0**
- Shop registers its own bank accounts once: name, bank name, account number, IBAN, holder name.
- Accounts are **pre-approved choices** in the payment sheet — cashier never types an account number, just taps.
- A payment can be **split across two bank accounts** (e.g. Rs 200 into Account A, Rs 300 into Account B).
- Cash and credit are also methods; the payment sheet shows amount received + change due.
- Payment summary reports group money by method and by bank account (e.g. "Rs 5,000 into Meezan — Business this week").

**P1**
- Default account per payment, favorite/quick-tap ordering, per-account daily totals.

### 3.11 Company Profile & Printing

**P0**
- **Company profile**: store name, address, phone, email, **logo upload**, receipt footer text, currency, tax rate — used everywhere it should appear (receipts, invoices, dashboard header).
- **Multiple print formats**, each with its own UI/layout:
  - **Thermal 58/80mm receipt** — compact, for POS quick sales.
  - **A5/A4 invoice** — full company letterhead + logo, itemized table, for printed invoices & credit sales.
  - **Purchase slip** — for buying used phones from walk-ins (what you paid, IMEI).
  - **Credit statement** — per-contact outstanding balance + payment history.
- Print via browser print dialog (print CSS per format) + PDF export.

### 3.12 NEW vs USED — Convenient Separation

The product treats new and used phones as **clearly separated experiences**:

- **Navigation**: dedicated sidebar entries — `Purchases › Buy New`, `Purchases › Buy Used`, `Inventory › New`, `Inventory › Used`.
- **Buy flows**: two distinct screens — "Buy New" (vendor stock, bulk IMEI entry) vs "Buy Used" (walk-in/trade-in with condition grade A/B/C/D + negotiated price).
- **POS**: unit picker shows NEW / USED as separate tabs with their own prices and badges.
- **Inventory**: separate views per condition, each with its own stock count and valuation header.
- **Reports & dashboard**: every report and KPI breaks down NEW vs USED (sales split, profit split, stock valuation split).
- **Data layer stays unified**: one `Unit.condition` enum — separation is UX + reports, never duplicated tables.

### 3.13 Settings

**P0**
- Company profile (name, address, phone, logo, receipt footer — see §3.11).
- Tax rate, currency, receipt footer text.
- Bank accounts management (see §3.10).
- Default margins / quick-sale defaults.
- Backup & restore (SQLite file export / Postgres dump).
- Printer setup + default print format per use case (thermal for POS, A4 for invoices).

---

## 4. User Stories (key ones)

1. As a **cashier**, I can ring up a sale in under 30 seconds: search the phone, pick the exact IMEI, charge, print receipt.
2. As a **cashier**, I can buy a used iPhone from a walk-in customer, pay them cash, and it appears in stock as USED immediately.
3. As an **owner**, I can open the dashboard and see today's sales, profit, and what's moving — without counting anything.
4. As an **owner**, I can see one contact's full history: phones they sold us *and* phones they bought from us, plus their credit balance.
5. As a **manager**, I can trace any IMEI: when it came in, from whom, at what cost, when it sold, to whom, for how much.
6. As a **cashier**, I cannot see costs or profit, or override a price without manager approval.

---

## 5. Non-Functional Requirements

- **Mobile-first UI** — usable on a tablet/phone screen, but responsive for desktop.
- **Offline resilience** (P1): POS should survive a brief network drop (local queue).
- **Performance**: POS search < 300ms on 10k+ units.
- **Security**: auth required, per-user permission-based access (seeded from role), audit logging, no cost data leaked to cashiers.
- **Data integrity**: IMEI uniqueness enforced at DB level; all money movements logged.

---

## 6. Priorities Legend

- **P0** = must have for v1 launch
- **P1** = soon after launch
