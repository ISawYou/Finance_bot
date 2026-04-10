import type {
  PaymentCalendarEventFilters,
  PaymentCalendarEventsResponse,
  PaymentCalendarOverview,
  ScheduledPayment
} from "@shared/types/domain";
import { isSupabaseConfigured } from "../config/env";
import { paymentCalendarRepository } from "../repositories/payment-calendar-repository";

const mockPayments: ScheduledPayment[] = [
  {
    id: "rent-apr",
    obligationId: "office-rent",
    title: "Аренда офиса",
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
    id: "loan-apr",
    obligationId: "bank-loan-interest",
    title: "Проценты по кредиту",
    type: "loan_interest",
    flowType: "financial",
    category: "interest",
    paymentDate: "2026-04-12",
    amount: 95000,
    currency: "RUB",
    status: "planned",
    plannedComment: null,
    paidAt: null
  },
  {
    id: "tax-apr",
    obligationId: "vat",
    title: "НДС",
    type: "tax",
    flowType: "tax",
    category: "vat",
    paymentDate: "2026-04-14",
    amount: 240000,
    currency: "RUB",
    status: "planned",
    plannedComment: null,
    paidAt: null
  },
  {
    id: "salary-apr",
    obligationId: "salary-main",
    title: "Зарплата",
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

export const paymentCalendarService = {
  async getOverview(): Promise<PaymentCalendarOverview> {
    const today = startOfUtcDay(new Date());
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
    const weekEnd = new Date(today);
    weekEnd.setUTCDate(today.getUTCDate() + 7);

    const { items: payments, source } = await loadPayments({
      dateFrom: isoDate(monthStart),
      dateTo: isoDate(monthEnd),
      status: "all",
      flowType: "all"
    });

    const actionable = payments.filter(
      (payment) => payment.status === "planned" || payment.status === "overdue" || payment.status === "needs_review"
    );
    const upcoming = actionable
      .filter((payment) => {
        const paymentDate = parsePaymentDate(payment.paymentDate);
        return paymentDate >= today || payment.status === "overdue";
      })
      .sort(compareByPaymentDate)
      .slice(0, 8);

    return {
        source,
      summary: {
        todayAmount: sumPayments(actionable.filter((payment) => payment.paymentDate === isoDate(today))),
        weekAmount: sumPayments(
          actionable.filter((payment) => {
            const paymentDate = parsePaymentDate(payment.paymentDate);
            return paymentDate >= today && paymentDate <= weekEnd;
          })
        ),
        monthAmount: sumPayments(actionable),
        overdueCount: actionable.filter((payment) => payment.status === "overdue").length
      },
      upcoming
    };
  },

  async getEvents(filters: PaymentCalendarEventFilters): Promise<PaymentCalendarEventsResponse> {
    return loadPayments(filters);
  }
};

async function loadPayments(filters: PaymentCalendarEventFilters): Promise<PaymentCalendarEventsResponse> {
  if (!isSupabaseConfigured()) {
    return {
      source: "mock",
      filters,
      items: applyFilters(mockPayments, filters)
    };
  }

  try {
    const items = await paymentCalendarRepository.listPayments(filters);
    return {
      source: "supabase",
      filters,
      items
    };
  } catch (error) {
    console.warn("Payment calendar fallback to mock data.", error);
    return {
      source: "mock",
      filters,
      items: applyFilters(mockPayments, filters)
    };
  }
}

function applyFilters(items: ScheduledPayment[], filters: PaymentCalendarEventFilters) {
  return items.filter((item) => {
    const inRange = item.paymentDate >= filters.dateFrom && item.paymentDate <= filters.dateTo;
    const statusOk = !filters.status || filters.status === "all" || item.status === filters.status;
    const flowOk = !filters.flowType || filters.flowType === "all" || item.flowType === filters.flowType;
    return inRange && statusOk && flowOk;
  });
}

function sumPayments(payments: ScheduledPayment[]) {
  return payments.reduce((total, payment) => total + payment.amount, 0);
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parsePaymentDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function compareByPaymentDate(a: ScheduledPayment, b: ScheduledPayment) {
  return a.paymentDate.localeCompare(b.paymentDate);
}
