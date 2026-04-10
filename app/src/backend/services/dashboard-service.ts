import type { OwnerDashboardOverview, ScheduledPayment } from "@shared/types/domain";
import { bankBalancesService } from "./bank-balances-service";
import { paymentCalendarService } from "./payment-calendar-service";

export const dashboardService = {
  async getOwnerOverview(): Promise<OwnerDashboardOverview> {
    const balances = await bankBalancesService.getBalances();
    const payments = await loadMonthPayments();
    const actionable = payments.filter(isRequiredPayment);
    const today = startOfUtcDay(new Date());
    const weekEnd = new Date(today);
    weekEnd.setUTCDate(today.getUTCDate() + 7);

    const weekRequiredAmount = sumPayments(
      actionable.filter((payment) => {
        const paymentDate = parsePaymentDate(payment.paymentDate);
        return paymentDate >= today && paymentDate <= weekEnd;
      })
    );

    const monthRequiredAmount = sumPayments(actionable);

    return {
      source: balances.source,
      balances: balances.items,
      upcoming: actionable
        .filter((payment) => {
          const paymentDate = parsePaymentDate(payment.paymentDate);
          return paymentDate >= today || payment.status === "overdue";
        })
        .slice(0, 8),
      summary: {
        totalCash: balances.totalCash,
        weekRequiredAmount,
        monthRequiredAmount,
        projectedCashAfterWeek: balances.totalCash - weekRequiredAmount,
        projectedCashAfterMonth: balances.totalCash - monthRequiredAmount,
        overdueCount: actionable.filter((payment) => payment.status === "overdue").length
      }
    };
  }
};

async function loadMonthPayments() {
  const today = startOfUtcDay(new Date());
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));

  const response = await paymentCalendarService.getEvents({
    dateFrom: monthStart.toISOString().slice(0, 10),
    dateTo: monthEnd.toISOString().slice(0, 10),
    status: "all",
    flowType: "all"
  });

  return response.items.sort((left, right) => left.paymentDate.localeCompare(right.paymentDate));
}

function isRequiredPayment(payment: ScheduledPayment) {
  return payment.status === "planned" || payment.status === "overdue" || payment.status === "needs_review";
}

function sumPayments(payments: ScheduledPayment[]) {
  return payments.reduce((total, payment) => total + payment.amount, 0);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parsePaymentDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}
