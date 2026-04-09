import type { PaymentCalendarOverview, ScheduledPayment } from "@shared/types/domain";
import { isSupabaseConfigured } from "../config/env";
import { paymentCalendarRepository } from "../repositories/payment-calendar-repository";

const mockPayments: ScheduledPayment[] = [
  {
    id: "rent-apr",
    obligationId: "office-rent",
    title: "Аренда офиса",
    type: "rent",
    paymentDate: "2026-04-10",
    amount: 150000,
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
    const { payments, source } = await loadUpcomingPayments();
    const today = startOfUtcDay(new Date());
    const weekEnd = new Date(today);
    weekEnd.setUTCDate(today.getUTCDate() + 7);

    const month = today.getUTCMonth();
    const year = today.getUTCFullYear();
    const upcoming = payments
      .filter((payment) => {
        const paymentDate = parsePaymentDate(payment.paymentDate);
        return paymentDate >= today || payment.status === "overdue";
      })
      .sort(compareByPaymentDate)
      .slice(0, 8);

    const todayAmount = sumPayments(
      payments.filter((payment) => payment.paymentDate === isoDate(today))
    );
    const weekAmount = sumPayments(
      payments.filter((payment) => {
        const paymentDate = parsePaymentDate(payment.paymentDate);
        return paymentDate >= today && paymentDate <= weekEnd;
      })
    );
    const monthAmount = sumPayments(
      payments.filter((payment) => {
        const paymentDate = parsePaymentDate(payment.paymentDate);
        return paymentDate.getUTCMonth() === month && paymentDate.getUTCFullYear() === year;
      })
    );
    const overdueCount = payments.filter((payment) => payment.status === "overdue").length;

    return {
      source,
      summary: {
        todayAmount,
        weekAmount,
        monthAmount,
        overdueCount
      },
      upcoming
    };
  }
};

async function loadUpcomingPayments() {
  if (!isSupabaseConfigured()) {
    return {
      payments: mockPayments,
      source: "mock" as const
    };
  }

  try {
    const payments = await paymentCalendarRepository.listUpcomingPayments();
    return {
      payments: payments.sort(compareByPaymentDate),
      source: "supabase" as const
    };
  } catch (error) {
    console.warn("Payment calendar fallback to mock data.", error);
    return {
      payments: mockPayments,
      source: "mock" as const
    };
  }
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
