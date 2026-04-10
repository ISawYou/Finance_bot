import type {
  CreateObligationInput,
  Obligation,
  ObligationDetailsResponse,
  ObligationsListResponse,
  ScheduledPayment,
  UpdateObligationInput
} from "@shared/types/domain";
import { isSupabaseConfigured } from "../config/env";
import { obligationsRepository } from "../repositories/obligations-repository";
import { paymentCalendarRepository } from "../repositories/payment-calendar-repository";
import { buildScheduledPaymentDates } from "./scheduled-payment-generator";

const mockObligations: Obligation[] = [
  {
    id: "office-rent",
    title: "Office rent",
    type: "rent",
    flowType: "operating",
    category: "rent",
    amount: 150000,
    currency: "RUB",
    recurrenceType: "monthly",
    recurrenceDay: 10,
    startDate: "2026-04-10",
    endDate: null,
    nextPaymentDate: "2026-04-10",
    comment: "Main office",
    status: "active"
  },
  {
    id: "vat",
    title: "VAT",
    type: "tax",
    flowType: "tax",
    category: "vat",
    amount: 240000,
    currency: "RUB",
    recurrenceType: "quarterly",
    recurrenceDay: 14,
    startDate: "2026-04-14",
    endDate: null,
    nextPaymentDate: "2026-04-14",
    comment: null,
    status: "paused"
  },
  {
    id: "salary-main",
    title: "Salary",
    type: "salary",
    flowType: "payroll",
    category: "salary",
    amount: 620000,
    currency: "RUB",
    recurrenceType: "monthly",
    recurrenceDay: 25,
    startDate: "2026-04-25",
    endDate: null,
    nextPaymentDate: "2026-04-25",
    comment: null,
    status: "active"
  }
];

const mockPayments: ScheduledPayment[] = [
  {
    id: "rent-apr",
    obligationId: "office-rent",
    title: "Office rent",
    type: "rent",
    flowType: "operating",
    category: "rent",
    paymentDate: "2026-04-10",
    amount: 150000,
    currency: "RUB",
    status: "planned",
    plannedComment: null,
    paidAt: null
  },
  {
    id: "rent-may",
    obligationId: "office-rent",
    title: "Office rent",
    type: "rent",
    flowType: "operating",
    category: "rent",
    paymentDate: "2026-05-10",
    amount: 150000,
    currency: "RUB",
    status: "planned",
    plannedComment: null,
    paidAt: null
  },
  {
    id: "salary-apr",
    obligationId: "salary-main",
    title: "Salary",
    type: "salary",
    flowType: "payroll",
    category: "salary",
    paymentDate: "2026-04-25",
    amount: 620000,
    currency: "RUB",
    status: "planned",
    plannedComment: null,
    paidAt: null
  }
];

export const obligationsService = {
  async list(): Promise<ObligationsListResponse> {
    if (!isSupabaseConfigured()) {
      return {
        source: "mock",
        items: sortObligations(mockObligations)
      };
    }

    try {
      const items = await obligationsRepository.listObligations();
      return {
        source: "supabase",
        items: sortObligations(items)
      };
    } catch (error) {
      console.warn("Obligations fallback to mock data.", error);
      return {
        source: "mock",
        items: sortObligations(mockObligations)
      };
    }
  },

  async getDetails(id: string): Promise<ObligationDetailsResponse> {
    if (!isSupabaseConfigured()) {
      const item = mockObligations.find((entry) => entry.id === id);

      if (!item) {
        throw new Error("Obligation not found.");
      }

      return {
        source: "mock",
        item,
        upcomingPayments: mockPayments
          .filter((payment) => payment.obligationId === id)
          .sort(comparePayments)
          .slice(0, 6),
        activityStatus: item.status
      };
    }

    try {
      const item = await obligationsRepository.getObligationById(id);

      if (!item) {
        throw new Error("Obligation not found.");
      }

      const upcomingPayments = await paymentCalendarRepository.listUpcomingPaymentsByObligationId(id, {
        limit: 6
      });

      return {
        source: "supabase",
        item,
        upcomingPayments,
        activityStatus: item.status
      };
    } catch (error) {
      console.warn("Obligation details fallback to mock data.", error);
      const item = mockObligations.find((entry) => entry.id === id);

      if (!item) {
        throw error instanceof Error ? error : new Error("Obligation not found.");
      }

      return {
        source: "mock",
        item,
        upcomingPayments: mockPayments
          .filter((payment) => payment.obligationId === id)
          .sort(comparePayments)
          .slice(0, 6),
        activityStatus: item.status
      };
    }
  },

  async create(input: CreateObligationInput): Promise<Obligation> {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is not configured.");
    }

    const obligation = await obligationsRepository.createObligation(input);
    await generateScheduledPayments(obligation);
    return obligation;
  },

  async update(id: string, input: UpdateObligationInput): Promise<Obligation> {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is not configured.");
    }

    return obligationsRepository.updateObligation(id, input);
  },

  async setStatus(id: string, status: Obligation["status"]): Promise<Obligation> {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is not configured.");
    }

    return obligationsRepository.updateObligationStatus(id, status);
  }
};

async function generateScheduledPayments(obligation: Obligation) {
  const candidateDates = buildScheduledPaymentDates(obligation);

  if (candidateDates.length === 0) {
    return;
  }

  const existingDates = await paymentCalendarRepository.listExistingPaymentDates(
    obligation.id,
    candidateDates
  );
  const existingSet = new Set(existingDates);

  const rows = candidateDates
    .filter((paymentDate) => !existingSet.has(paymentDate))
    .map((paymentDate) => ({
      obligation_id: obligation.id,
      payment_date: paymentDate,
      amount: obligation.amount,
      currency: obligation.currency,
      flow_type: obligation.flowType,
      category: obligation.category,
      status: "planned" as const
    }));

  await paymentCalendarRepository.createScheduledPayments(rows);
}

function sortObligations(items: Obligation[]) {
  return [...items].sort((left, right) => {
    const statusWeight = getStatusWeight(left.status) - getStatusWeight(right.status);

    if (statusWeight !== 0) {
      return statusWeight;
    }

    const leftDate = left.nextPaymentDate ?? "9999-12-31";
    const rightDate = right.nextPaymentDate ?? "9999-12-31";
    return leftDate.localeCompare(rightDate) || left.title.localeCompare(right.title);
  });
}

function getStatusWeight(status: Obligation["status"]) {
  switch (status) {
    case "active":
      return 0;
    case "paused":
      return 1;
    default:
      return 2;
  }
}

function comparePayments(left: ScheduledPayment, right: ScheduledPayment) {
  return left.paymentDate.localeCompare(right.paymentDate);
}
