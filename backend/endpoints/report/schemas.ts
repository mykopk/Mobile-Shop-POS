import { z } from "zod";

const isoDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const rangeSchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export const ledgerSchema = z.object({
  contactId: z.string().trim().min(1, "Contact is required"),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export type RangeInput = z.infer<typeof rangeSchema>;
export type LedgerInput = z.infer<typeof ledgerSchema>;
