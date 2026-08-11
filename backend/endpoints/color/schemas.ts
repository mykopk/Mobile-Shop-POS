import { z } from "zod";

export const colorSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const colorUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export type ColorInput = z.infer<typeof colorSchema>;
export type ColorUpdateInput = z.infer<typeof colorUpdateSchema>;
