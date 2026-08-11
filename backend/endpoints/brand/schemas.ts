import { z } from "zod";

export const brandSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const brandUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export type BrandInput = z.infer<typeof brandSchema>;
export type BrandUpdateInput = z.infer<typeof brandUpdateSchema>;
