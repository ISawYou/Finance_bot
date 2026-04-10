import type { PostgrestError } from "@supabase/supabase-js";
import type {
  CreateObligationInput,
  FlowType,
  Obligation,
  UpdateObligationInput
} from "@shared/types/domain";
import { createServerSupabaseClient } from "../lib/supabase";
import { deriveNextPaymentDate } from "../services/scheduled-payment-generator";

type ObligationRow = {
  id: string;
  title: string | null;
  type: string | null;
  flow_type: string | null;
  category: string | null;
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

type UpsertObligationRow = {
  title: string;
  type: string;
  flow_type: CreateObligationInput["flowType"];
  category: string;
  amount: number;
  currency: string;
  recurrence_type: CreateObligationInput["recurrenceType"];
  recurrence_day: number | null;
  start_date: string;
  end_date: string | null;
  next_payment_date: string | null;
  comment: string | null;
};

const obligationSelect = `
  id,
  title,
  type,
  flow_type,
  category,
  amount,
  currency,
  recurrence_type,
  recurrence_day,
  start_date,
  end_date,
  next_payment_date,
  comment,
  status
`;

export const obligationsRepository = {
  async listObligations(limit = 100): Promise<Obligation[]> {
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from("obligations")
      .select(obligationSelect)
      .order("next_payment_date", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true })
      .limit(limit);

    if (error) {
      throw createRepositoryError(error);
    }

    return ((data ?? []) as ObligationRow[]).map(mapObligationRow);
  },

  async getObligationById(id: string): Promise<Obligation | null> {
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("obligations")
      .select(obligationSelect)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw createRepositoryError(error);
    }

    return data ? mapObligationRow(data as ObligationRow) : null;
  },

  async createObligation(input: CreateObligationInput): Promise<Obligation> {
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const payload: UpsertObligationRow & { status: "active" } = {
      ...mapUpsertPayload(input),
      status: "active"
    };

    const { data, error } = await supabase
      .from("obligations")
      .insert(payload)
      .select(obligationSelect)
      .single();

    if (error) {
      throw createRepositoryError(error);
    }

    return mapObligationRow(data as ObligationRow);
  },

  async updateObligation(id: string, input: UpdateObligationInput): Promise<Obligation> {
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error } = await supabase
      .from("obligations")
      .update(mapUpsertPayload(input))
      .eq("id", id)
      .select(obligationSelect)
      .single();

    if (error) {
      throw createRepositoryError(error);
    }

    return mapObligationRow(data as ObligationRow);
  },

  async updateObligationStatus(id: string, status: Obligation["status"]): Promise<Obligation> {
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error } = await supabase
      .from("obligations")
      .update({ status })
      .eq("id", id)
      .select(obligationSelect)
      .single();

    if (error) {
      throw createRepositoryError(error);
    }

    return mapObligationRow(data as ObligationRow);
  }
};

function mapUpsertPayload(input: CreateObligationInput | UpdateObligationInput): UpsertObligationRow {
  return {
    title: input.title,
    type: input.type,
    flow_type: input.flowType,
    category: input.category,
    amount: input.amount,
    currency: input.currency,
    recurrence_type: input.recurrenceType,
    recurrence_day: input.recurrenceDay,
    start_date: input.startDate,
    end_date: input.endDate,
    next_payment_date: deriveNextPaymentDate(input),
    comment: input.comment
  };
}

function mapObligationRow(row: ObligationRow): Obligation {
  return {
    id: row.id,
    title: row.title ?? "Obligation",
    type: row.type ?? "other",
    flowType: normalizeFlowType(row.flow_type),
    category: row.category ?? "other",
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

function normalizeFlowType(value: string | null): FlowType {
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

function normalizeRecurrenceType(value: string | null): Obligation["recurrenceType"] {
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
