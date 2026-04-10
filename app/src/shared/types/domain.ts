export type ObligationType = string;

export type FlowType =
  | "operating"
  | "financial"
  | "tax"
  | "payroll"
  | "investing"
  | "other";

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
  flowType: FlowType;
  category: string;
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
  flowType: FlowType;
  category: string;
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

export type PaymentCalendarEventFilters = {
  dateFrom: string;
  dateTo: string;
  status?: PaymentStatus | "all";
  flowType?: FlowType | "all";
};

export type PaymentCalendarEventsResponse = {
  source?: "mock" | "supabase";
  filters: PaymentCalendarEventFilters;
  items: ScheduledPayment[];
};

export type ObligationsListResponse = {
  source?: "mock" | "supabase";
  items: Obligation[];
};

export type ObligationDetailsResponse = {
  source?: "mock" | "supabase";
  item: Obligation;
  upcomingPayments: ScheduledPayment[];
  activityStatus: "active" | "paused" | "closed";
};

export type CreateObligationInput = {
  title: string;
  type: string;
  flowType: FlowType;
  category: string;
  amount: number;
  currency: string;
  recurrenceType: "once" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  recurrenceDay: number | null;
  startDate: string;
  endDate: string | null;
  comment: string | null;
};

export type UpdateObligationInput = CreateObligationInput;

export type UpdateObligationStatusInput = {
  status: Obligation["status"];
};
