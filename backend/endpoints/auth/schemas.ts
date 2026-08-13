import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
});

export const changePinSchema = z.object({
  currentPin: z.string().regex(/^\d{4}$/, "Current PIN must be 4 digits"),
  newPin: z.string().regex(/^\d{4}$/, "New PIN must be 4 digits"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePinInput = z.infer<typeof changePinSchema>;
