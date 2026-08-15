import { z } from "zod";

export const citySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export type CityInput = z.infer<typeof citySchema>;
