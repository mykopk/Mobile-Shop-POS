# Frontend Production Readiness — Fix Checklist

Full code review of the frontend (`app/`, `components/`, `lib/`) conducted with `npx tsc --noEmit` (clean).

**Verdict:** Not production ready — functionally complete, but the items below must be fixed before real use.

---

## Phase 1 — Critical (data integrity & money)

- [ ] **Atomic multi-invoice returns** — `app/(app)/purchase-returns/page.tsx:362` and `app/(app)/sale-returns/page.tsx:339` post one request per source invoice. If a later request fails, earlier returns are already committed but the toast says "failed"; retrying causes double-return errors. → Add one atomic endpoint (or rollback handling on partial failure).
- [ ] **Money as floats everywhere** — backend uses `Decimal`, but the UI does `parseFloat`/`String()` arithmetic (`pos`, `purchases`, returns, split payments; `refund?: number` at `lib/api-types.ts:340`). → Use integer paisa math (or decimal.js) in money arithmetic; make `refund` a decimal string.
- [ ] **Stale search race** — `app/(app)/pos/page.tsx:194`, purchase/sale returns, and `app/(app)/reservations/page.tsx:140` debounce but never abort in-flight requests; a slow earlier query can overwrite newer results. → Pass an `AbortSignal` and abort on new search.

---

## Phase 2 — High (silent failure & safety)

- [ ] **Error states on every list/report page** — almost none surface `useApi.error` (only `users/page.tsx` does); a network/500 shows "No data found" like an empty DB. Affected: products, contacts, inventory, expenses, vouchers, all reports, pos, dashboard. → Surface `useApi.error` with a retry button (model: `users/page.tsx`).
- [ ] **Confirm destructive actions** — purchases "Clear all" (`app/(app)/purchases/page.tsx:410`) and bank-account delete in settings (`app/(app)/settings/page.tsx:186`) are one-tap with no confirm. → Wrap in confirm dialog; disable confirm while busy.

---

## Phase 3 — Medium (a11y & correctness)

- [ ] **Modal a11y** — `components/ui/dialog.tsx`, `components/ui/sheet.tsx`, `components/vouchers/reverse-voucher-dialog.tsx`, `components/transactions/transaction-detail.tsx`, and the date-picker popup lack `role="dialog"`, `aria-modal`, focus trap, and scroll lock. → Add dialog ARIA + focus trap + scroll lock.
- [ ] **Invalid HTML `<a><button>`** — nested interactive element at `components/transactions/transaction-detail.tsx:180`. → Restructure (wrap styling on the link instead).
- [ ] **Tabnabbing** — voucher print link opens `target="_blank"` without `rel="noreferrer"` (`components/vouchers/voucher-row.tsx:58`). → Add `rel="noreferrer"`.
- [ ] **Hardcoded branding** — "DOST Mobile" baked into receipts (`pos/page.tsx:517`, `reservations/page.tsx:354`) instead of company settings; many labels inline instead of `lib/constants.ts`; `"Rs "` literal at `lib/money.ts:4`. → Read company name from settings; move labels to `constants.ts`; move `Rs` into constants.
- [ ] **CSV export not escaped** (`lib/csv.ts:36`) — commas/quotes in names corrupt files. → Escape fields (quotes, commas, newlines) in `downloadCsv`.
- [ ] **apiClient 204/empty-body crash** (`lib/apiClient.ts:48`) — `res.json()` unconditionally throws on empty body. → Guard for empty/204 responses.
- [ ] **`QRCode.toDataURL` unhandled rejection** (`app/(app)/print/page.tsx:423`). → Add `.catch` with toast.
- [ ] **`image-picker.tsx`** — `onFile` has no catch (`components/products/image-picker.tsx:42`); stores full base64 in DB; pasted URLs unrestricted. → Add error handling; resize/compress; restrict to https.
- [ ] **A11y regressions in `app/globals.css:13-34`** — global SVG focus-outline removal, hidden scrollbars, `user-select:none`. → Restore visible focus styles; keep scrollbars accessible; scope `user-select` to controls.

---

## Phase 4 — Minor (cleanup)

- [ ] **Unstable row keys** — `components/reports/report-table.tsx:42` (index key), `components/reports/top-list.tsx:19` (label key). → Use stable ids.
- [ ] **`components/badge.tsx`** — status variants render near-identical colors, so Active vs Reversed look the same. → Distinct colors per variant.
- [ ] **`components/products/manage-window.tsx:169-692`** — three ~170-line near-duplicate list components. → Extract one generic component.
- [ ] **`components/scanner.tsx`** — side effects in render body; camera keeps decoding while minimized; `detectedTimer` not cleared on unmount. → Move ref assignments to effects; stop stream when hidden; clear timer.
- [ ] **`lib/dates.ts`** — `toLocaleDateString`/`toLocaleTimeString` with no explicit locale/timezone; report dates can shift a day across timezones. → Pin `en-PK` + explicit timezone.
- [ ] **`lib/use-api.ts:29`** — `refetch` never aborts the previous in-flight request (stale overwrite). → Abort previous request in `refetch`.
- [ ] **`components/ui/dropdown.tsx`** — missing `aria-controls`/arrow-key nav; search only matches suffixes. → Add arrow-key navigation + aria; substring match from start.
- [ ] **`lib/units.ts:31-38`** — raw Tailwind palette classes instead of `brand-*`/`ink-*` tokens. → Map to theme tokens.
- [ ] **Rename `lib/emv-qr.ts`** — contains only `whatsappLink`, no EMV QR generation. → Rename or implement EMV QR.
- [ ] **`components/icons/index.tsx:5`** — `React.ReactNode` without importing `React`. → Import `ReactNode` type.

---

## Verification

- [ ] `cd frontend && npx tsc --noEmit` passes.
- [ ] Re-run manual pass on returns, split payments, search-as-you-type, error/empty states, and focus/keyboard behavior after fixes.