import { z } from "zod";

export const obligationRecurrenceSchema = z.enum([
  "once",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom"
]);

export const obligationStatusSchema = z.enum(["active", "paused", "closed"]);

export const flowTypeSchema = z.enum([
  "operating",
  "financial",
  "tax",
  "payroll",
  "investing",
  "other"
]);

export const obligationSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  type: z.string(),
  flowType: flowTypeSchema,
  category: z.string().min(1),
  amount: z.number().nonnegative(),
  currency: z.string().min(1),
  recurrenceType: obligationRecurrenceSchema,
  recurrenceDay: z.number().int().min(1).max(31).nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  nextPaymentDate: z.string().nullable(),
  comment: z.string().nullable(),
  status: obligationStatusSchema
});

export const createObligationInputSchema = z.object({
  title: z.string().trim().min(1, "Enter title"),
  type: z.string().trim().min(1, "Enter type"),
  flowType: flowTypeSchema,
  category: z.string().trim().min(1, "Enter category"),
  amount: z.number().nonnegative("Amount must be non-negative"),
  currency: z.string().trim().min(1, "Enter currency"),
  recurrenceType: obligationRecurrenceSchema,
  recurrenceDay: z.number().int().min(1).max(31).nullable(),
  startDate: z.string().min(1, "Enter start date"),
  endDate: z.string().nullable(),
  comment: z.string().nullable()
});

export const updateObligationInputSchema = createObligationInputSchema;

export const updateObligationStatusInputSchema = z.object({
  status: obligationStatusSchema
});
