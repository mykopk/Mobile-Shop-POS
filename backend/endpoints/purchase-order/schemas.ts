import { z } from "zod";

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "productId is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  costPrice: z.coerce.number().min(0, "Cost must be 0 or more"),
});

export const createPurchaseOrderSchema = z.object({
  contactId: z.string().min(1, "contactId is required"),
  items: z.array(purchaseOrderItemSchema).min(1, "Add at least one item"),
  note: z.string().trim().optional().nullable().or(z.literal("")),
});

export const receivePurchaseOrderSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().min(1, "itemId is required"),
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
      }),
    )
    .min(1, "Receive at least one item"),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>;
