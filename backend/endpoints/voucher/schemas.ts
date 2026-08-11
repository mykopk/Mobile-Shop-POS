import { z } from "zod";

export const voucherSchema = z.object({
  type: z.enum(["RECEIVING", "PAYMENT"]),
  amount: z.coerce.number().positive("Amount must be more than 0"),
  method: z.enum(["CASH", "BANK_TRANSFER"]).default("CASH"),
  bankAccountId: z.string().trim().optional().nullable().or(z.literal("")),
  contactId: z.string().trim().min(1, "Pick a contact"),
  narration: z.string().trim().optional().nullable().or(z.literal("")),
  date: z.string().trim().optional().nullable().or(z.literal("")),
});

export const voucherUpdateSchema = voucherSchema.partial();

export const reverseVoucherSchema = z.object({
  note: z.string().trim().optional().nullable().or(z.literal("")),
});

export type VoucherInput = z.infer<typeof voucherSchema>;
export type VoucherUpdateInput = z.infer<typeof voucherUpdateSchema>;
export type VoucherType = z.infer<typeof voucherSchema>["type"];
