import { z } from "zod";

export const poLineItemSchema = z.object({
  item_id: z.string().uuid().optional().nullable(),
  item_name: z.string().min(1, "Item name is required").max(255),
  item_sku: z.string().min(1, "Item SKU is required").max(100),
  quantity_ordered: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  unit_cost: z.number().min(0).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const purchaseOrderSchema = z.object({
  vendor_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  building_id: z.string().uuid().optional().nullable(),
  apartment_unit: z.string().max(100).optional().nullable(),
  expected_delivery: z.string().optional().nullable(),
  special_instructions: z.string().max(2000).optional().nullable(),
  items: z
    .array(poLineItemSchema)
    .min(1, "At least one item is required"),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;
export type POLineItemFormValues = z.infer<typeof poLineItemSchema>;
