import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
});

export type LoginInput = z.infer<typeof loginSchema>;
