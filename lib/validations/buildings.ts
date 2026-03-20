import { z } from "zod";

export const buildingSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  address: z.string().max(500).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
});

export type BuildingFormValues = z.infer<typeof buildingSchema>;
