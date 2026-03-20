import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  contact_name: z.string().max(255).optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
