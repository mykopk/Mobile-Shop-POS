# DOST Mobile POS — Data Model

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

Product (catalog variant: brand+model+storage+color)
  ├─ ProductPriceHistory
  └─ Unit (one physical phone w/ IMEI) ── StockMovement
       └─ sold/returned in TransactionItem

Transaction (unified: PURCHASE | SALE | PURCHASE_RETURN | SALE_RETURN)
  ├─ TransactionItem (productId + optional unitId)
  └─ Payment (method, amount portion)
       ├─ method BANK_TRANSFER ── BankAccount (pre-registered shop accounts)
       └─ method CREDIT ── CreditAccount.balance + CreditPayment

BankAccount (shop's registered accounts; tap-choice in payment sheet)

CompanyProfile (single-row company branding: logo, footer, currency, tax)

Settings, Expense, AuditLog, DashboardWidget
```

---

## 2. Prisma Schema Plan

```prisma
// ============ ENUMS ============

enum ContactType   { WALK_IN CUSTOMER VENDOR BOTH }
enum UnitCondition { NEW USED }
enum UnitStatus    { IN_STOCK RESERVED SOLD RETURNED DAMAGED WRITTEN_OFF }
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
  role      Role     @default(CASHIER)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
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

model Product {
  id               String   @id @default(cuid())
  brand            String
  model            String
  storage          String?  // "128GB", null for accessories
  color            String?
  category         String   @default("PHONE") // PHONE | ACCESSORY
  sku              String?  @unique
  barcode          String?
  image            String?
  specs            String?  // JSON of key specs
  sellPrice        Decimal  @db.Decimal(12,2)
  costPrice        Decimal  @db.Decimal(12,2)  // default purchase cost
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
  id          String        @id @default(cuid())
  productId   String
  product     Product       @relation(fields: [productId], references: [id])
  imei        String        @unique
  condition   UnitCondition @default(NEW)
  status      UnitStatus    @default(IN_STOCK)
  source      UnitSource    @default(VENDOR_PURCHASE)
  costPrice   Decimal       @db.Decimal(12,2)   // what the shop paid
  acquiredAt  DateTime      @default(now())
  grade       String?       // condition grade for used (A/B/C/D)

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
}

model TransactionItem {
  id            String   @id @default(cuid())
  transactionId String
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  productId     String
  product       Product  @relation(fields: [productId], references: [id])
  unitId        String?  @unique   // set when a specific phone is sold/returned
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
```

---

## 3. Key Rules (Business Logic)

1. **IMEI uniqueness** enforced at DB level — no two physical phones share an IMEI.
2. **Selling a phone** → pick a `Unit`, set `status = SOLD`, link to `TransactionItem.unitId`. Accessories: decrement quantity, no unit.
3. **Buying a used phone** → create `Unit` with `condition = USED`, `source = BOUGHT_WALKIN` (or `VENDOR_PURCHASE`), `costPrice = paid amount`, `acquiredAt = now`.
4. **Sale return** → unit returns to stock with `condition = USED` (unless unopened), `source = SALE_RETURN`.
5. **Credit sales (partial)** → if the total is Rs 1,000 and Rs 500 is paid on credit, one `Payment` with `method = CREDIT`, `amount = 500` is created; `CreditAccount.balance` increases by exactly **500** (never the full total). Collections create `CreditPayment` and reduce balance.
6. **Contact unification** — a walk-in who sells you a phone gets `type = WALK_IN`; later buying upgrades to `CUSTOMER` or `BOTH` on the **same record**.
7. **Bank transfer payments** → `Payment.bankAccountId` must point to a registered `BankAccount`. Splitting Rs 500 across two accounts = two `Payment` rows (Rs 300 → A, Rs 200 → B). The sum of all `Payment.amount` rows must equal `Transaction.total`.
8. **Cost visibility** — `costPrice` and `Product.costPrice` are excluded from any API response unless user role can view costs.
9. **Every mutation writes an `AuditLog`** entry.

## 4. Storage Notes

- Dev: SQLite (`file:./dev.db`). Prod: PostgreSQL.
- All money as `Decimal(12,2)`, never floats.
- `layout`/`settings`/`specs` as JSON strings.
