import type {
  CreateObligationInput,
  Obligation,
  ObligationsListResponse
} from "@shared/types/domain";
import { isSupabaseConfigured } from "../config/env";
import { obligationsRepository } from "../repositories/obligations-repository";
import { paymentCalendarRepository } from "../repositories/payment-calendar-repository";
import {
  buildScheduledPaymentDates,
  deriveNextPaymentDate
} from "./scheduled-payment-generator";

const mockObligations: Obligation[] = [
  {
    id: "office-rent",
    title: "Аренда офиса",
    type: "rent",
    amount: 150000,
    currency: "RUB",
    recurrenceType: "monthly",
    recurrenceDay: 10,
    startDate: "2026-04-10",
    endDate: null,
    nextPaymentDate: "2026-04-10",
    comment: null,
    status: "active"
  },
  {
    id: "vat",
    title: "НДС",
    type: "tax",
    amount: 240000,
    currency: "RUB",
    recurrenceType: "quarterly",
    recurrenceDay: 14,
    startDate: "2026-04-14",
    endDate: null,
    nextPaymentDate: "2026-04-14",
    comment: null,
    status: "active"
  },
  {
    id: "salary-main",
    title: "Зарплата",
    type: "salary",
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

export const obligationsService = {
  async list(): Promise<ObligationsListResponse> {
    if (!isSupabaseConfigured()) {
      return {
        source: "mock",
        items: mockObligations
      };
    }

    try {
      const items = await obligationsRepository.listObligations();
      return {
        source: "supabase",
        items
      };
    } catch (error) {
      console.warn("Obligations fallback to mock data.", error);
      return {
        source: "mock",
        items: mockObligations
      };
    }
  },

  async create(input: CreateObligationInput): Promise<Obligation> {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is not configured.");
    }

    const obligation = await obligationsRepository.createObligation({
      ...input,
      startDate: input.startDate,
      endDate: input.endDate
    });

    await generateScheduledPayments(obligation);

    return obligation;
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
      status: "planned" as const
    }));

  await paymentCalendarRepository.createScheduledPayments(rows);
}
