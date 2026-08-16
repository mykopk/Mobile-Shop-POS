import { z } from "zod";

const companySchema = z.object({
  name: z.string().trim().min(1, "Store name is required"),
  tagline: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  footerText: z.string().trim().optional(),
  currency: z.string().trim().min(1, "Currency is required").default("PKR"),
  timezone: z.string().trim().min(1, "Timezone is required").default("Asia/Karachi"),
});

const bankAccountSchema = z.object({
  name: z.string().trim().min(1, "Account name is required"),
  bankName: z.string().trim().min(1, "Bank name is required"),
  accountNo: z.string().trim().min(1, "Account number is required"),
  holderName: z.string().trim().optional().or(z.literal("")),
  iban: z.string().trim().optional().or(z.literal("")),
});

const adminSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  pin: z.string().trim().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export const setupSchema = z.object({
  company: companySchema,
  bankAccounts: z.array(bankAccountSchema).optional().default([]),
  admin: adminSchema,
});

export type SetupInput = z.infer<typeof setupSchema>;