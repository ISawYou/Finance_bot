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

export const obligationSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  type: z.string(),
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
  title: z.string().trim().min(1, "Введите название"),
  type: z.string().trim().min(1, "Укажите тип"),
  amount: z.number().nonnegative("Сумма должна быть неотрицательной"),
  currency: z.string().trim().min(1, "Укажите валюту"),
  recurrenceType: obligationRecurrenceSchema,
  recurrenceDay: z.number().int().min(1).max(31).nullable(),
  startDate: z.string().min(1, "Укажите дату начала"),
  endDate: z.string().nullable(),
  comment: z.string().nullable()
});
