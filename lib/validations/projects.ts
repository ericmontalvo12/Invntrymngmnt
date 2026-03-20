import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional().nullable(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
