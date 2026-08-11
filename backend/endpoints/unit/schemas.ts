import { z } from "zod";

export const adjustSchema = z.object({
  unitId: z.string().min(1, "unitId is required"),
  status: z.enum(["IN_STOCK", "RESERVED", "DAMAGED", "WRITTEN_OFF"]),
  note: z.string().trim().optional(),
});

export type AdjustInput = z.infer<typeof adjustSchema>;

export const unitSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  imei: z.string().trim().min(1, "IMEI is required"),
  condition: z.enum(["NEW", "USED"]).default("NEW"),
  status: z.enum(["IN_STOCK", "RESERVED", "DAMAGED", "WRITTEN_OFF"]).default("IN_STOCK"),
  source: z.enum(["VENDOR_PURCHASE", "BOUGHT_WALKIN", "SALE_RETURN", "PURCHASE_RETURN"]).default("VENDOR_PURCHASE"),
  carrier: z.enum(["NON_PTA", "PTA", "SIM_LOCKED"]).default("NON_PTA"),
  batteryHealth: z.coerce.number().int().min(0).max(100).optional(),
  grade: z.string().trim().optional(),
  costPrice: z.coerce.number().min(0, "Cost price must be 0 or more"),
  acquiredAt: z.string().datetime().optional(),
});

export type UnitInput = z.infer<typeof unitSchema>;

export const unitUpdateSchema = z.object({
  imei: z.string().trim().min(1).optional(),
  condition: z.enum(["NEW", "USED"]).optional(),
  carrier: z.enum(["NON_PTA", "PTA", "SIM_LOCKED"]).optional(),
  batteryHealth: z.coerce.number().int().min(0).max(100).nullable().optional(),
  grade: z.string().trim().nullable().optional(),
  costPrice: z.coerce.number().min(0).optional(),
  acquiredAt: z.string().datetime().nullable().optional(),
});

export type UnitUpdateInput = z.infer<typeof unitUpdateSchema>;

export const importUnitSchema = z.object({
  imei: z.string().trim().min(1, "IMEI is required"),
  brand: z.string().trim().min(1, "Brand is required"),
  model: z.string().trim().min(1, "Model is required"),
  storage: z.string().trim().optional(),
  color: z.string().trim().optional(),
  condition: z.enum(["NEW", "USED"]).default("NEW"),
  carrier: z.enum(["NON_PTA", "PTA", "SIM_LOCKED"]).default("NON_PTA"),
  grade: z.string().trim().optional(),
  batteryHealth: z.coerce.number().int().min(0).max(100).optional(),
  costPrice: z.coerce.number().min(0).default(0),
  acquiredAt: z.string().datetime().optional(),
});

export const importUnitsSchema = z.object({
  units: z.array(importUnitSchema).min(1, "No units to import"),
});

export type ImportUnitInput = z.infer<typeof importUnitSchema>;
