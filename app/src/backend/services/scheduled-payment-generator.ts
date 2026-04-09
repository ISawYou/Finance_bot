import type { CreateObligationInput, Obligation } from "@shared/types/domain";

const GENERATION_MONTHS = 12;

export function buildScheduledPaymentDates(
  obligation: Pick<
    Obligation,
    "recurrenceType" | "recurrenceDay" | "startDate" | "endDate"
  >
): string[] {
  switch (obligation.recurrenceType) {
    case "once":
      return limitByEndDate([obligation.startDate], obligation.endDate);
    case "monthly":
      return buildMonthlyDates(obligation, 1);
    case "quarterly":
      return buildMonthlyDates(obligation, 3);
    case "yearly":
      return buildYearlyDates(obligation);
    default:
      return [];
  }
}

export function deriveNextPaymentDate(input: CreateObligationInput): string | null {
  const dates = buildScheduledPaymentDates({
    recurrenceType: input.recurrenceType,
    recurrenceDay: input.recurrenceDay,
    startDate: input.startDate,
    endDate: input.endDate
  });

  return dates[0] ?? input.startDate;
}

function buildMonthlyDates(
  obligation: Pick<Obligation, "recurrenceDay" | "startDate" | "endDate">,
  monthStep: number
) {
  const start = parseIsoDate(obligation.startDate);
  const day = obligation.recurrenceDay ?? start.getUTCDate();
  const dates: string[] = [];

  for (let offset = 0; offset < GENERATION_MONTHS; offset += monthStep) {
    const candidate = createUtcDate(
      start.getUTCFullYear(),
      start.getUTCMonth() + offset,
      day
    );

    if (candidate < start) {
      continue;
    }

    dates.push(toIsoDate(candidate));
  }

  return limitByEndDate(dates, obligation.endDate);
}

function buildYearlyDates(
  obligation: Pick<Obligation, "recurrenceDay" | "startDate" | "endDate">
) {
  const start = parseIsoDate(obligation.startDate);
  const day = obligation.recurrenceDay ?? start.getUTCDate();
  const month = start.getUTCMonth();
  const dates: string[] = [];

  for (let offset = 0; offset < GENERATION_MONTHS; offset += 12) {
    const candidate = createUtcDate(start.getUTCFullYear() + offset / 12, month, day);

    if (candidate < start) {
      continue;
    }

    dates.push(toIsoDate(candidate));
  }

  return limitByEndDate(dates, obligation.endDate);
}

function limitByEndDate(dates: string[], endDate: string | null) {
  if (!endDate) {
    return dates;
  }

  return dates.filter((date) => date <= endDate);
}

function createUtcDate(year: number, month: number, day: number) {
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const normalizedDay = Math.min(day, lastDayOfMonth);
  return new Date(Date.UTC(year, month, normalizedDay));
}

function parseIsoDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
