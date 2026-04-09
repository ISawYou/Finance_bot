import type { PostgrestError } from "@supabase/supabase-js";
import type { ScheduledPayment } from "@shared/types/domain";
import { createServerSupabaseClient } from "../lib/supabase";

type ScheduledPaymentRow = {
  id: string;
  obligation_id: string | null;
  payment_date: string;
  amount: number;
  currency: string | null;
  status: string | null;
  planned_comment: string | null;
  paid_at: string | null;
  obligations:
    | {
        id: string;
        title: string | null;
        type: string | null;
        status: string | null;
      }
    | null;
};

type CreateScheduledPaymentRow = {
  obligation_id: string;
  payment_date: string;
  amount: number;
  currency: string;
  status: "planned";
};

export const paymentCalendarRepository = {
  async listUpcomingPayments(limit = 12): Promise<ScheduledPayment[]> {
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      return [];
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("scheduled_payments")
      .select(
        `
          id,
          obligation_id,
          payment_date,
          amount,
          currency,
          status,
          planned_comment,
          paid_at,
          obligations!inner (
            id,
            title,
            type,
            status
          )
        `
      )
      .or(`payment_date.gte.${today},status.eq.overdue`)
      .in("status", ["planned", "overdue", "needs_review"])
      .neq("status", "cancelled")
      .neq("obligations.status", "closed")
      .order("payment_date", { ascending: true })
      .limit(limit);

    if (error) {
      throw createRepositoryError(error);
    }

    return ((data ?? []) as ScheduledPaymentRow[]).map(mapScheduledPaymentRow);
  },

  async listExistingPaymentDates(obligationId: string, dates: string[]) {
    const supabase = createServerSupabaseClient();

    if (!supabase || dates.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from("scheduled_payments")
      .select("payment_date")
      .eq("obligation_id", obligationId)
      .in("payment_date", dates);

    if (error) {
      throw createRepositoryError(error);
    }

    return (data ?? []).map((row) => String(row.payment_date));
  },

  async createScheduledPayments(rows: CreateScheduledPaymentRow[]) {
    const supabase = createServerSupabaseClient();

    if (!supabase || rows.length === 0) {
      return;
    }

    const { error } = await supabase.from("scheduled_payments").insert(rows);

    if (error) {
      throw createRepositoryError(error);
    }
  }
};

function mapScheduledPaymentRow(row: ScheduledPaymentRow): ScheduledPayment {
  return {
    id: row.id,
    obligationId: row.obligation_id ?? row.obligations?.id ?? "unknown-obligation",
    title: row.obligations?.title ?? "Обязательный платеж",
    type: row.obligations?.type ?? "other",
    paymentDate: row.payment_date,
    amount: row.amount,
    currency: row.currency ?? "RUB",
    status: normalizeStatus(row.status),
    plannedComment: row.planned_comment,
    paidAt: row.paid_at
  };
}

function normalizeStatus(status: string | null): ScheduledPayment["status"] {
  switch (status) {
    case "planned":
    case "paid":
    case "overdue":
    case "cancelled":
    case "needs_review":
      return status;
    default:
      return "planned";
  }
}

function createRepositoryError(error: PostgrestError) {
  return new Error(`Supabase query failed: ${error.message}`);
}
