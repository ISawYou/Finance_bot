import { z } from "zod";

export const paymentStatusFilterSchema = z.enum([
  "all",
  "planned",
  "paid",
  "overdue",
  "cancelled",
  "needs_review"
]);

export const flowTypeFilterSchema = z.enum([
  "all",
  "operating",
  "financial",
  "tax",
  "payroll",
  "investing",
  "other"
]);

export const paymentCalendarFiltersSchema = z.object({
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
  status: paymentStatusFilterSchema.default("all"),
  flowType: flowTypeFilterSchema.default("all")
});
