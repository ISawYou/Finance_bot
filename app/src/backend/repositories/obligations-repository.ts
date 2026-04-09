import type { PostgrestError } from "@supabase/supabase-js";
import type { CreateObligationInput, Obligation } from "@shared/types/domain";
import { createServerSupabaseClient } from "../lib/supabase";
import { deriveNextPaymentDate } from "../services/scheduled-payment-generator";

type ObligationRow = {
  id: string;
  title: string | null;
  type: string | null;
  amount: number;
  currency: string | null;
  recurrence_type: string | null;
  recurrence_day: number | null;
  start_date: string | null;
  end_date: string | null;
  next_payment_date: string | null;
  comment: string | null;
  status: string | null;
};

type CreateObligationRow = {
  title: string;
  type: string;
  amount: number;
  currency: string;
  recurrence_type: CreateObligationInput["recurrenceType"];
  recurrence_day: number | null;
  start_date: string;
  end_date: string | null;
  next_payment_date: string | null;
  comment: string | null;
  status: "active";
};

export const obligationsRepository = {
  async listObligations(limit = 50): Promise<Obligation[]> {
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from("obligations")
      .select(
        `
          id,
          title,
          type,
          amount,
          currency,
          recurrence_type,
          recurrence_day,
          start_date,
          end_date,
          next_payment_date,
          comment,
          status
        `
      )
      .neq("status", "closed")
      .order("next_payment_date", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true })
      .limit(limit);

    if (error) {
      throw createRepositoryError(error);
    }

    return ((data ?? []) as ObligationRow[]).map(mapObligationRow);
  },

  async createObligation(input: CreateObligationInput): Promise<Obligation> {
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const payload: CreateObligationRow = {
      title: input.title,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      recurrence_type: input.recurrenceType,
      recurrence_day: input.recurrenceDay,
      start_date: input.startDate,
      end_date: input.endDate,
      next_payment_date: deriveNextPaymentDate(input),
      comment: input.comment,
      status: "active"
    };

    const { data, error } = await supabase
      .from("obligations")
      .insert(payload)
      .select(
        `
          id,
          title,
          type,
          amount,
          currency,
          recurrence_type,
          recurrence_day,
          start_date,
          end_date,
          next_payment_date,
          comment,
          status
        `
      )
      .single();

    if (error) {
      throw createRepositoryError(error);
    }

    return mapObligationRow(data as ObligationRow);
  }
};

function mapObligationRow(row: ObligationRow): Obligation {
  return {
    id: row.id,
    title: row.title ?? "Обязательство",
    type: row.type ?? "other",
    amount: row.amount,
    currency: row.currency ?? "RUB",
    recurrenceType: normalizeRecurrenceType(row.recurrence_type),
    recurrenceDay: row.recurrence_day,
    startDate: row.start_date ?? "",
    endDate: row.end_date,
    nextPaymentDate: row.next_payment_date,
    comment: row.comment,
    status: normalizeObligationStatus(row.status)
  };
}

function normalizeRecurrenceType(
  value: string | null
): Obligation["recurrenceType"] {
  switch (value) {
    case "once":
    case "weekly":
    case "monthly":
    case "quarterly":
    case "yearly":
    case "custom":
      return value;
    default:
      return "custom";
  }
}

function normalizeObligationStatus(value: string | null): Obligation["status"] {
  switch (value) {
    case "paused":
    case "closed":
      return value;
    default:
      return "active";
  }
}

function createRepositoryError(error: PostgrestError) {
  return new Error(`Supabase query failed: ${error.message}`);
}
