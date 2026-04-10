import { z } from "zod";

export const scheduledPaymentSchema = z.object({
  id: z.string(),
  obligationId: z.string(),
  title: z.string(),
  type: z.string(),
  flowType: z.enum(["operating", "financial", "tax", "payroll", "investing", "other"]),
  category: z.string(),
  paymentDate: z.string(),
  amount: z.number().nonnegative(),
  currency: z.string(),
  status: z.enum(["planned", "paid", "overdue", "cancelled", "needs_review"]),
  plannedComment: z.string().nullable(),
  paidAt: z.string().nullable()
});

export const paymentCalendarOverviewSchema = z.object({
  source: z.enum(["mock", "supabase"]).optional(),
  summary: z.object({
    todayAmount: z.number(),
    weekAmount: z.number(),
    monthAmount: z.number(),
    overdueCount: z.number().int().nonnegative()
  }),
  upcoming: z.array(scheduledPaymentSchema)
});
