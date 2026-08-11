import { z } from "zod";

export const bankAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  bankName: z.string().trim().min(1, "Bank name is required"),
  accountNo: z.string().trim().min(1, "Account number is required"),
  holderName: z.string().trim().optional().or(z.literal("")),
  iban: z.string().trim().optional().or(z.literal("")),
  active: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const bankAccountUpdateSchema = bankAccountSchema.partial();

export type BankAccountInput = z.infer<typeof bankAccountSchema>;
export type BankAccountUpdateInput = z.infer<typeof bankAccountUpdateSchema>;
