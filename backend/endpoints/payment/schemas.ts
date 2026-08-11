import { z } from "zod";

export const collectSchema = z.object({
  contactId: z.string().min(1, "contactId is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER"]).default("CASH"),
  reference: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type CollectInput = z.infer<typeof collectSchema>;
