export type ObligationType = string;

export type PaymentStatus =
  | "planned"
  | "paid"
  | "overdue"
  | "cancelled"
  | "needs_review";

export type Obligation = {
  id: string;
  title: string;
  type: ObligationType;
  amount: number;
  currency: string;
  recurrenceType: "once" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  recurrenceDay: number | null;
  startDate: string;
  endDate: string | null;
  nextPaymentDate: string | null;
  comment: string | null;
  status: "active" | "paused" | "closed";
};

export type ScheduledPayment = {
  id: string;
  obligationId: string;
  title: string;
  type: ObligationType;
  paymentDate: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  plannedComment: string | null;
  paidAt: string | null;
};

export type PaymentCalendarOverview = {
  source?: "mock" | "supabase";
  summary: {
    todayAmount: number;
    weekAmount: number;
    monthAmount: number;
    overdueCount: number;
  };
  upcoming: ScheduledPayment[];
};

export type ObligationsListResponse = {
  source?: "mock" | "supabase";
  items: Obligation[];
};

export type CreateObligationInput = {
  title: string;
  type: string;
  amount: number;
  currency: string;
  recurrenceType: "once" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  recurrenceDay: number | null;
  startDate: string;
  endDate: string | null;
  comment: string | null;
};
