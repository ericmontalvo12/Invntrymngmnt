import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(500).optional().nullable(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
