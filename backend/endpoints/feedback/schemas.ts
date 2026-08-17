import { z } from "zod";

export const crashReportSchema = z.object({
  app: z.string().trim().default("Fig POS"),
  version: z.string().trim().optional(),
  platform: z.string().trim().optional(),
  title: z.string().trim().min(1, "Title is required").max(300),
  body: z.string().trim().min(1, "Body is required"),
  logTail: z.string().trim().optional().default(""),
});

export type CrashReportInput = z.infer<typeof crashReportSchema>;