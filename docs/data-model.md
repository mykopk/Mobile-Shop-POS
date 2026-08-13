# Fig Mobile POS — Data Model

Design goal: **zero duplication.** One `Contact`, one `Product`, one `Transaction`, one `Unit` per physical phone. Every money and stock movement is an audit trail.

## 1. Entity Relationship Overview

```
User ─┬─ Role(s)
      └─ created AuditLog

Contact (unified: customer + vendor + walk-in)
  ├─ CreditAccount
  ├─ as Seller ──── Transactions (PURCHASE: contact sells to shop)
  ├─ as Buyer ───── Transactions (SALE: shop sells to contact)
  └─ Payments received

Product (catalog variant: brand+model+storage+ram+screen+color)
  ├─ ProductPriceHistory
  └─ Unit (one physical phone w/ IMEI) ── StockMovement
       └─ sold/returned in TransactionItem

Transaction (unified: PURCHASE | SALE | PURCHASE_RETURN | SALE_RETURN)
  ├─ TransactionItem (productId + optional unitId)
  └─ Payment (method, amount portion)
       ├─ method BANK_TRANSFER ── BankAccount (pre-registered shop accounts)
       └─ method CREDIT ── CreditAccount.balance + CreditPayment

BankAccount (shop's registered accounts; tap-choice in payment sheet)

Voucher (non-sale cash in/out: Cash Receiving CRV / Cash Payment CPV)
  ├─ Contact (required — money came from / went to this contact, affects their credit balance)
  └─ method BANK_TRANSFER ── BankAccount

CompanyProfile (single-row company branding: logo, footer, currency, tax)

Settings, Expense, AuditLog, DashboardWidget
```

---

## 2. Prisma Schema Plan

```prisma
// ============ ENUMS ============

enum ContactType   { WALK_IN CUSTOMER VENDOR BOTH }
enum UnitCondition { NEW USED }
enum UnitStatus    { IN_STOCK RESERVED OUT SOLD RETURNED DAMAGED WRITTEN_OFF }
enum UnitSource    { VENDOR_PURCHASE BOUGHT_WALKIN SALE_RETURN PURCHASE_RETURN }
enum TransactionType { PURCHASE SALE PURCHASE_RETURN SALE_RETURN }
enum PaymentMethod   { CASH CARD BANK_TRANSFER CREDIT }
enum PaymentStatus   { PAID PARTIAL PENDING REFUNDED }
enum Role            { ADMIN MANAGER CASHIER }
enum StockMovementType { IN OUT ADJUST TRANSFER RESERVED RELEASED }

// ============ USERS & SECURITY ============

model User {
  id        String   @id @default(cuid())
  username  String   @unique          // login name, e.g. "arslan"
  name      String
  email     String   @unique
  pinHash   String                    // bcrypt hash of the 4-digit PIN
  role        Role     @default(CASHIER)   // seed default only; stored permissions win
  permissions Json     @default("[]")      // explicit per-user permission keys; empty list falls back to ROLE_PERMISSIONS[role]
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt DateTime @updatedAt

  auditLogs       AuditLog[]
  transactions    Transaction[]
  dashboardWidgets DashboardWidget[]
}

// ============ CONTACTS (unified) ============

model Contact {
  id          String      @id @default(cuid())
  type        ContactType @default(WALK_IN)  // upgradable, never duplicated
  name        String
  phone       String?
  email       String?
  address     String?
  notes       String?
  tags        String[]    // e.g. wholesale, trade-in
  createdAt   DateTime    @default(now())

  creditAccount CreditAccount?
  transactions  Transaction[]   // as buyer or seller
  expenses      Expense[]
}

model CreditAccount {
  id         String    @id @default(cuid())
  contactId  String    @unique
  contact    Contact   @relation(fields: [contactId], references: [id])
  limit      Decimal   @default(0) @db.Decimal(12,2)
  balance    Decimal   @default(0) @db.Decimal(12,2) // positive = owes us
  creditPayments CreditPayment[]
}

// ============ PRODUCTS & UNITS ============

// Managed brand table — brands are seeded + managed in the UI.
model Brand {
  id        String    @id @default(cuid())
  name      String    @unique
  sortOrder Int       @default(0)
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())
  products  Product[]
}

// Flexible category table — NEW / USED / ACCESSORY are seeded rows.
// Adding a category (e.g. "Refurbished") needs no code change.
model Category {
  id        String        @id @default(cuid())
  name      String        @unique
  type      CategoryType  @default(PHONE) // PHONE | ACCESSORY
  sortOrder Int           @default(0)
  active    Boolean       @default(true)
  createdAt DateTime      @default(now())
  products  Product[]
}

// Managed color table — seeded with the full phone color list, managed in the UI.
model Color {
  id        String    @id @default(cuid())
  name      String    @unique
  sortOrder Int       @default(0)
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())
  products  Product[]
}

model Product {
  id               String   @id @default(cuid())
  brandId          String
  brand            Brand    @relation(fields: [brandId], references: [id])
  model            String
  storage          String?  // "128GB", null for accessories
  ram              String?  // "8GB"
  screenSize       String?  // "6.1\""
  colorId          String?
  color            Color?   @relation(fields: [colorId], references: [id])
  categoryId       String
  category         Category @relation(fields: [categoryId], references: [id])
  sku              String   @unique // auto-generated, e.g. SKU-001
  barcode          String?
  image            String?
  specs            String?  // JSON of key specs
  sellPrice        Decimal  @db.Decimal(12,2)
  costPrice        Decimal  @db.Decimal(12,2)  // default purchase cost
  retailPrice      Decimal? @db.Decimal(12,2)  // optional invoice / company MRP
  lowStockThreshold Int     @default(2)
  createdAt        DateTime @default(now())

  units       Unit[]
  priceHistory ProductPriceHistory[]
  items       TransactionItem[]
}

model ProductPriceHistory {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  sellPrice Decimal  @db.Decimal(12,2)
  costPrice Decimal  @db.Decimal(12,2)
  fromDate  DateTime @default(now())
}

// ONE physical phone. Phones = unit-tracked. Accessories = quantity only.
model Unit {
  id            String        @id @default(cuid())
  productId     String
  product       Product       @relation(fields: [productId], references: [id])
  imei          String        @unique
  condition     UnitCondition @default(NEW)
  status        UnitStatus    @default(IN_STOCK)
  source        UnitSource    @default(VENDOR_PURCHASE)
  carrier       CarrierType   @default(NON_PTA) // PTA | NON_PTA | SIM_LOCKED
  batteryHealth Int?          // battery % for used phones (1-100)
  costPrice     Decimal       @db.Decimal(12,2)   // what the shop paid
  acquiredAt    DateTime      @default(now())
  grade         String?       // condition grade for used (A/B/C/D)

  item      TransactionItem?    // last/selling transaction line
  movements StockMovement[]
}

model StockMovement {
  id        String   @id @default(cuid())
  unitId    String?
  unit      Unit?    @relation(fields: [unitId], references: [id], onDelete: Cascade)
  productId String?  // for accessories / bulk
  type      StockMovementType
  qty       Int      @default(1)
  note      String?
  createdAt DateTime @default(now())
}

// ============ TRANSACTIONS (unified purchase/sale) ============

model Transaction {
  id          String          @id @default(cuid())
  type        TransactionType
  number      String          @unique   // e.g. PUR-0001, SAL-0001
  contactId   String
  contact     Contact         @relation(fields: [contactId], references: [id])
  userId      String
  user        User            @relation(fields: [userId], references: [id])
  subtotal    Decimal         @db.Decimal(12,2)
  discount    Decimal         @default(0) @db.Decimal(12,2)
  total       Decimal         @db.Decimal(12,2)
  status      PaymentStatus   @default(PAID)
  note        String?
  createdAt   DateTime        @default(now())

  items      TransactionItem[]
  payments   Payment[]
  reservation Reservation?  // set when a sale completes a reservation
}

model TransactionItem {
  id            String   @id @default(cuid())
  transactionId String
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  productId     String
  product       Product  @relation(fields: [productId], references: [id])
  unitId        String?             // set when a specific phone is sold/returned (not unique: a unit is linked on its purchase line AND its sale line)
  unit          Unit?    @relation(fields: [unitId], references: [id])
  quantity      Int      @default(1)
  unitPrice     Decimal  @db.Decimal(12,2)
  discount      Decimal  @default(0) @db.Decimal(12,2)
  total         Decimal  @db.Decimal(12,2)
}

model Payment {
  id            String        @id @default(cuid())
  transactionId String
  transaction   Transaction   @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  method        PaymentMethod
  amount        Decimal       @db.Decimal(12,2)   // portion of the total paid by this method
  reference     String?       // card ref / bank slip no.
  bankAccountId String?       // set for BANK_TRANSFER: which shop account it landed in
  bankAccount   BankAccount?  @relation(fields: [bankAccountId], references: [id])
  createdAt     DateTime      @default(now())
}

// Pre-registered shop bank accounts shown as tap-choices in the payment sheet.
model BankAccount {
  id          String    @id @default(cuid())
  name        String    // label shown in POS, e.g. "Meezan - Business"
  bankName    String
  accountNo   String
  holderName  String?
  iban        String?
  isDefault   Boolean   @default(false)
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  payments    Payment[]
  vouchers    Voucher[]
}

// Non-sale cash movements: cash in (CRV) and cash out (CPV). Reversed = voided
// but kept for the audit trail. Can be Cash or a bank transfer on a registered account.
enum VoucherType   { RECEIVING PAYMENT }
enum VoucherStatus { ACTIVE REVERSED }

model Voucher {
  id            String        @id @default(cuid())
  type          VoucherType   // RECEIVING = money in, PAYMENT = money out
  number        String        @unique  // CRV-0001 / CPV-0001
  amount        Decimal       @db.Decimal(12,2)
  method        PaymentMethod @default(CASH) // CASH or BANK_TRANSFER
  bankAccountId String?
  bankAccount   BankAccount?  @relation(fields: [bankAccountId], references: [id])
  contactId     String        // required — every voucher is against a contact
  contact       Contact       @relation(fields: [contactId], references: [id])
  narration     String?       // reason: loan returned, office rent, owner drawing…
  date          DateTime      @default(now())
  status        VoucherStatus @default(ACTIVE)
  reversedById  String?
  reversedBy    User?         @relation(fields: [reversedById], references: [id])
  reversedAt    DateTime?
  reversalNote  String?
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([type, date])
}

model CreditPayment {
  id             String        @id @default(cuid())
  creditAccountId String
  creditAccount  CreditAccount @relation(fields: [creditAccountId], references: [id], onDelete: Cascade)
  amount         Decimal       @db.Decimal(12,2)
  receivedFrom   String?       // which transaction triggered it (or manual collection)
  dueDate        DateTime?
  paidAt         DateTime      @default(now())
}

// ============ SUPPORTING ============

model Expense {
  id        String   @id @default(cuid())
  category  String   // rent, salary, electricity, other
  amount    Decimal  @db.Decimal(12,2)
  note      String?
  contactId String?
  contact   Contact? @relation(fields: [contactId], references: [id])
  date      DateTime @default(now())
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  action    String   // SALE.CREATE, UNIT.ADJUST, PRICE.OVERRIDE ...
  entity    String   // Transaction, Unit, Contact ...
  entityId  String
  details   String?  // JSON diff/snapshot
  createdAt DateTime @default(now())
}

model DashboardWidget {
  id       String   @id @default(cuid())
  userId   String
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  key      String   // widget type id
  layout   String   // JSON: {x, y, w, h}
  settings String   // JSON: widget-specific options
  order    Int      @default(0)
}

model Settings {
  key   String @id
  value String // JSON blob
}

// Company branding used on receipts/invoices/dashboard.
model CompanyProfile {
  id          String   @id @default("store")   // single row
  name        String
  tagline     String?
  address     String?
  phone       String?
  email       String?
  logoUrl     String?   // uploaded logo path
  footerText  String?   // "No refund after 7 days..." etc.
  currency    String   @default("PKR")
  taxRate     Decimal  @default(0) @db.Decimal(5,2)
}

// ============ RESERVATIONS (hold / consignment) ============

enum ReservationStatus { ACTIVE COMPLETED CANCELLED }
enum HoldType { RESERVATION CONSIGNMENT }

model Reservation {
  id        String            @id @default(cuid())
  type      HoldType          @default(RESERVATION)  // RESERVATION = held in-shop, CONSIGNMENT = phone out with a shopkeeper
  number    String            @unique   // e.g. RES-0001
  contactId String
  contact   Contact           @relation(fields: [contactId], references: [id])
  userId    String
  user      User              @relation(fields: [userId], references: [id])
  subtotal  Decimal           @db.Decimal(12,2)
  discount  Decimal           @default(0) @db.Decimal(12,2)
  total     Decimal           @db.Decimal(12,2)
  advance   Decimal           @default(0) @db.Decimal(12,2)  // 0 = nothing paid yet (always 0 for consignments)
  status    ReservationStatus @default(ACTIVE)
  note      String?
  createdAt DateTime          @default(now())
  saleId    String?           @unique  // set when the sale that completes this is created
  sale      Transaction?      @relation(fields: [saleId], references: [id])

  items ReservationItem[]

  @@index([status, createdAt])
}

model ReservationItem {
  id            String      @id @default(cuid())
  reservationId String
  reservation   Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  productId     String
  product       Product     @relation(fields: [productId], references: [id])
  unitId        String?     // set when a specific phone is held/consigned
  unit          Unit?       @relation(fields: [unitId], references: [id])
  quantity      Int         @default(1)
  unitPrice     Decimal     @db.Decimal(12,2)  // sell price for a hold; the agreed price for a consignment
  discount      Decimal     @default(0) @db.Decimal(12,2)
  total         Decimal     @db.Decimal(12,2)
}
```

---

## 3. Key Rules (Business Logic)

1. **IMEI uniqueness** enforced at DB level — no two physical phones share an IMEI.
2. **Selling a phone** → pick a `Unit`, set `status = SOLD`, link to `TransactionItem.unitId`. Accessories: decrement quantity, no unit.
3. **Buying a used phone** → create `Unit` with `condition = USED`, `source = BOUGHT_WALKIN` (or `VENDOR_PURCHASE`), `costPrice = paid amount`, `acquiredAt = now`.
4. **Sale return** → unit returns to stock with `condition = USED` (unless unopened), `source = SALE_RETURN`.
5. **Return refunds** → each return records a `payments` array (same shape as purchase/sale): **CASH**, **CREDIT**, or a **split** (e.g. Rs 30k cash + Rs 20k credit on a Rs 50k refund). A payment on `CREDIT` means "returned but not paid yet" and sets the transaction `status = PENDING` (fully CASH = `PAID`): for a purchase return the vendor's `CreditAccount.balance` **increases** (they owe us and it nets against a future purchase); for a sale return the customer's balance **decreases** (their debt to us drops). `voidReturn` reverses the same sign per payment.
6. **Credit sales (partial)** → if the total is Rs 1,000 and Rs 500 is paid on credit, one `Payment` with `method = CREDIT`, `amount = 500` is created; `CreditAccount.balance` increases by exactly **500** (never the full total). Collections create `CreditPayment` and reduce balance.
7. **Contact unification** — a walk-in who sells you a phone gets `type = WALK_IN`; later buying upgrades to `CUSTOMER` or `BOTH` on the **same record**.
8. **Bank transfer payments** → `Payment.bankAccountId` must point to a registered `BankAccount`. Splitting Rs 500 across two accounts = two `Payment` rows (Rs 300 → A, Rs 200 → B). The sum of all `Payment.amount` rows must equal `Transaction.total`.
9. **Cost visibility** — `costPrice` and `Product.costPrice` are excluded from any API response unless user role can view costs.
10. **Every mutation writes an `AuditLog`** entry.
11. **Reserving a phone (hold)** → create `Reservation` with `type = RESERVATION`, set `Unit.status = RESERVED`, write a `StockMovement` of type `RESERVED`. Cancelling releases the unit back to `IN_STOCK` with a `RELEASED` movement. Reserved units never count as available stock. When a hold with an advance is cancelled, the cashier picks whether the advance was **paid back now** (`refundStatus = PAID`) or **not yet** (`refundStatus = PENDING`, which records the amount as debt on us by reducing the customer's `CreditAccount.balance`). A pending refund can later be settled via `POST /reservation/:id/refund`, which restores the balance and sets `PAID`.
12. **Completing a reservation on sale** — when a `SALE` includes a reserved `Unit`, the reservation becomes `COMPLETED` (linked via `saleId`) and the advance is recorded as a `Payment` on the sale (`reference = "Advance from RES-xxxx"`), so the cashier only collects the balance due. If the reservation belongs to a **different** contact, the POS warns before proceeding.
13. **Consignment (sale-or-return)** — `Reservation` with `type = CONSIGNMENT` and `advance = 0`. The phone **leaves the shop**: `Unit.status = OUT`, `StockMovement` of type `OUT` (note "Consigned RES-xxxx to …"). `unitPrice` on each item is the **agreed price** with the shopkeeper (editable per phone). Consigned units never count as available stock and never appear in search/POS results.
14. **Settling a consignment** — two outcomes, both set `status = COMPLETED`:
    - **Sold** via POS (Process Reservation): a `SALE` is created, `saleId` set, and the shopkeeper's payment is recorded — the sale line uses the agreed `unitPrice`.
    - **Returned**: `POST /reservation/:id/return` sets `Unit.status = IN_STOCK` with an `IN` movement ("Returned from consignment RES-xxxx"). A COMPLETED consignment with `saleId = null` means it came back unsold.
15. **Vouchers** — a `Voucher` records a **non-sale cash movement against a contact**: `RECEIVING` (CRV, money in from a customer/vendor) or `PAYMENT` (CPV, money out to them). `contactId` is **required**. A voucher changes the contact's `CreditAccount.balance`: CRV reduces what they owe us (`-amount`), CPV increases it (`+amount`) — so money in from a contact lowers their debt, money out to them raises it. Reversing a voucher voids it (`status = REVERSED`, records `reversedBy`, `reversedAt`, `reversalNote`), keeps it for the audit trail, and **undoes its balance effect**. Only ADMIN/MANAGER can modify or reverse a voucher; a reversed voucher can never be modified. Modifying an active voucher re-applies its balance effect from the old value to the new one. `method = BANK_TRANSFER` requires a registered `BankAccount`.

## 4. Storage Notes

- SQLite embedded (`backend/data/fig.db`) — offline desktop, single client.
- All money as `Decimal(12,2)`, never floats.
- `layout`/`settings`/`specs` as JSON strings.
