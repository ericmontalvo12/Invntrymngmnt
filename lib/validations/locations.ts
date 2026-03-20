import { z } from "zod";

export const locationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(500).optional().nullable(),
});

export type LocationFormValues = z.infer<typeof locationSchema>;
