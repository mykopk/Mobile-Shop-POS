import { z } from "zod";

export const openCashSessionSchema = z.object({
  openingFloat: z.coerce.number().min(0).default(0),
  note: z.string().trim().optional().nullable().or(z.literal("")),
});

export const closeCashSessionSchema = z.object({
  countedFloat: z.coerce.number().min(0, "Counted cash must be 0 or more"),
  note: z.string().trim().optional().nullable().or(z.literal("")),
});

export type OpenCashSessionInput = z.infer<typeof openCashSessionSchema>;
export type CloseCashSessionInput = z.infer<typeof closeCashSessionSchema>;
