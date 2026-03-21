import { z } from "zod";

export const workOrderItemSchema = z.object({
  item_id: z.string().uuid().optional().nullable(),
  item_name: z.string().min(1, "Item name is required").max(255),
  item_sku: z.string().min(1, "Item SKU is required").max(100),
  quantity_needed: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  notes: z.string().max(500).optional().nullable(),
});

export const workOrderSchema = z.object({
  building_id: z.string().uuid().optional().nullable(),
  apartment_unit: z.string().max(100).optional().nullable(),
  inspection_type_id: z.string().uuid().optional().nullable(),
  requested_by: z.string().uuid({ message: "Requested by is required" }),
  assigned_to: z.string().uuid().optional().nullable(),
  inspection_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  extended_due_date: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(workOrderItemSchema),
});

export type WorkOrderFormValues = z.infer<typeof workOrderSchema>;
export type WorkOrderItemFormValues = z.infer<typeof workOrderItemSchema>;
