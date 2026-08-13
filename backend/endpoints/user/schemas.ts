import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  pin: z.string().trim().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER"]),
  avatar: z.string().optional().or(z.literal("")),
  active: z.boolean().optional().default(true),
  permissions: z.array(z.string()).optional(),
});

export const updateUserSchema = createUserSchema.partial();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
