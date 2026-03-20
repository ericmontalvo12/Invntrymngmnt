import { z } from "zod";

export const inventoryItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  sku: z.string().min(1, "SKU is required").max(100),
  upc: z.string().max(50).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  quantity_on_hand: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  minimum_threshold: z.coerce.number().int().min(0),
  reorder_quantity: z.coerce.number().int().min(0),
  unit_type: z.string().min(1).max(50).default("unit"),
  cost_per_unit: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(["active", "inactive", "discontinued"]).default("active"),
  reorder_status: z
    .enum(["needs_reorder", "ordered", "received"])
    .default("needs_reorder"),
});

export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;

export const stockTransactionSchema = z.object({
  item_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  note: z.string().max(500).optional().nullable(),
  reason: z.string().max(200).optional().nullable(),
});

export const adjustmentSchema = z.object({
  item_id: z.string().uuid(),
  new_quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  note: z.string().min(1, "Note is required for manual adjustments").max(500),
});

export type StockTransactionFormValues = z.infer<typeof stockTransactionSchema>;
export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;
