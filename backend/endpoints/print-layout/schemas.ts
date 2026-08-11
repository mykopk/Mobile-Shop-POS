import { z } from "zod";

export const printLayoutSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  type: z.enum(["document", "inventory"]).default("document"),
  format: z.enum(["58", "80", "a4"]).default("80"),
  options: z.record(z.string(), z.boolean()).default({}),
  qrType: z.enum(["none", "whatsapp", "website"]).default("none"),
  isDefault: z.boolean().optional(),
});

export const printLayoutUpdateSchema = printLayoutSchema.partial();

export type PrintLayoutInput = z.infer<typeof printLayoutSchema>;
export type PrintLayoutUpdateInput = z.infer<typeof printLayoutUpdateSchema>;
