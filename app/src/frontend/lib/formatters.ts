import type { FlowType, Obligation, OwnerDashboardOverview, PaymentStatus } from "@shared/types/domain";

export const money = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0
});

export function formatPaymentDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long"
  }).format(date);
}

export function formatMonthLabel(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric"
  }).format(value);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatPaymentStatus(status: PaymentStatus) {
  switch (status) {
    case "overdue":
      return "Просрочено";
    case "paid":
      return "Оплачено";
    case "needs_review":
      return "Нужно проверить";
    case "cancelled":
      return "Отменено";
    default:
      return "Запланировано";
  }
}

export function formatObligationStatus(status: Obligation["status"]) {
  switch (status) {
    case "paused":
      return "На паузе";
    case "closed":
      return "Закрыто";
    default:
      return "Активно";
  }
}

export function formatFlowType(flowType: FlowType) {
  switch (flowType) {
    case "operating":
      return "Операционный";
    case "financial":
      return "Финансовый";
    case "tax":
      return "Налоги";
    case "payroll":
      return "ФОТ";
    case "investing":
      return "Инвестиции";
    default:
      return "Прочее";
  }
}

export function formatRecurrenceType(value: Obligation["recurrenceType"]) {
  switch (value) {
    case "once":
      return "Разово";
    case "weekly":
      return "Еженедельно";
    case "monthly":
      return "Ежемесячно";
    case "quarterly":
      return "Ежеквартально";
    case "yearly":
      return "Ежегодно";
    default:
      return "По графику";
  }
}

export function formatDataSource(value: OwnerDashboardOverview["source"] | "supabase" | "cache" | "mock" | undefined) {
  switch (value) {
    case "bank_api":
      return "Банк API";
    case "cache":
      return "Кэш";
    case "supabase":
      return "Supabase";
    default:
      return "Демо-данные";
  }
}
