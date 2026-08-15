import { z } from "zod";

export const dashboardWidgetSchema = z.object({
  key: z.string().min(1, "Widget key is required"),
  order: z.coerce.number().int().min(0).default(0),
  layout: z.string().optional(),
  settings: z.string().optional(),
});

export const updateDashboardWidgetsSchema = z.object({
  widgets: z.array(dashboardWidgetSchema).max(40).default([]),
});

export type UpdateDashboardWidgetsInput = z.infer<typeof updateDashboardWidgetsSchema>;
