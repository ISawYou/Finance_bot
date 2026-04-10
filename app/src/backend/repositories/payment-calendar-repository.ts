import type { PostgrestError } from "@supabase/supabase-js";
import type { FlowType, PaymentCalendarEventFilters, PaymentStatus, ScheduledPayment } from "@shared/types/domain";
import { createServerSupabaseClient } from "../lib/supabase";

type ObligationRef = {
  id: string;
  title: string | null;
  type: string | null;
  flow_type: string | null;
  category: string | null;
  status: string | null;
};

type ScheduledPaymentRow = {
  id: string;
  obligation_id: string | null;
  payment_date: string;
  amount: number;
  currency: string | null;
  flow_type: string | null;
  category: string | null;
  status: string | null;
  planned_comment: string | null;
  paid_at: string | null;
  obligations: ObligationRef | ObligationRef[] | null;
};

type CreateScheduledPaymentRow = {
  obligation_id: string;
  payment_date: string;
  amount: number;
  currency: string;
  flow_type: FlowType;
  category: string;
  status: "planned";
};

const paymentSelect = `
  id,
  obligation_id,
  payment_date,
  amount,
  currency,
  flow_type,
  category,
  status,
  planned_comment,
  paid_at,
  obligations (
    id,
    title,
    type,
    flow_type,
    category,
    status
  )
`;

export const paymentCalendarRepository = {
  async listPayments(filters: PaymentCalendarEventFilters, limit?: number): Promise<ScheduledPayment[]> {
    const supabase = createServerSupabaseClient();
    if (!supabase) return [];

    let query = supabase
      .from("scheduled_payments")
      .select(paymentSelect)
      .gte("payment_date", filters.dateFrom)
      .lte("payment_date", filters.dateTo)
      .eq("obligations.status", "active")
      .order("payment_date", { ascending: true });

    if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
    if (filters.flowType && filters.flowType !== "all") query = query.eq("flow_type", filters.flowType);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw createRepositoryError(error);
    return ((data ?? []) as unknown as ScheduledPaymentRow[]).map(mapScheduledPaymentRow);
  },

  async listUpcomingPaymentsByObligationId(obligationId: string, options?: { includeCancelled?: boolean; limit?: number }): Promise<ScheduledPayment[]> {
    const supabase = createServerSupabaseClient();
    if (!supabase) return [];

    let query = supabase
      .from("scheduled_payments")
      .select(paymentSelect)
      .eq("obligation_id", obligationId)
      .gte("payment_date", new Date().toISOString().slice(0, 10))
      .order("payment_date", { ascending: true });

    if (!options?.includeCancelled) query = query.neq("status", "cancelled");
    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) throw createRepositoryError(error);
    return ((data ?? []) as unknown as ScheduledPaymentRow[]).map(mapScheduledPaymentRow);
  },

  async listExistingPaymentDates(obligationId: string, dates: string[]) {
    const supabase = createServerSupabaseClient();
    if (!supabase || dates.length === 0) return [];

    const { data, error } = await supabase
      .from("scheduled_payments")
      .select("payment_date")
      .eq("obligation_id", obligationId)
      .in("payment_date", dates);

    if (error) throw createRepositoryError(error);
    return (data ?? []).map((row) => String(row.payment_date));
  },

  async createScheduledPayments(rows: CreateScheduledPaymentRow[]) {
    const supabase = createServerSupabaseClient();
    if (!supabase || rows.length === 0) return;

    const { error } = await supabase.from("scheduled_payments").insert(rows);
    if (error) throw createRepositoryError(error);
  }
};

function mapScheduledPaymentRow(row: ScheduledPaymentRow): ScheduledPayment {
  const obligation = Array.isArray(row.obligations) ? row.obligations[0] ?? null : row.obligations;
  return {
    id: row.id,
    obligationId: row.obligation_id ?? obligation?.id ?? "unknown-obligation",
    title: obligation?.title ?? "Obligatory payment",
    type: obligation?.type ?? "other",
    flowType: normalizeFlowType(row.flow_type ?? obligation?.flow_type),
    category: row.category ?? obligation?.category ?? "other",
    paymentDate: row.payment_date,
    amount: row.amount,
    currency: row.currency ?? "RUB",
    status: normalizeStatus(row.status),
    plannedComment: row.planned_comment,
    paidAt: row.paid_at
  };
}

function normalizeFlowType(value: string | null | undefined): FlowType {
  switch (value) {
    case "operating":
    case "financial":
    case "tax":
    case "payroll":
    case "investing":
      return value;
    default:
      return "other";
  }
}

function normalizeStatus(value: string | null): PaymentStatus {
  switch (value) {
    case "planned":
    case "paid":
    case "overdue":
    case "cancelled":
    case "needs_review":
      return value;
    default:
      return "planned";
  }
}

function createRepositoryError(error: PostgrestError) {
  return new Error(`Supabase query failed: ${error.message}`);
}
