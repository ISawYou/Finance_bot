import type {
  CreateObligationInput,
  Obligation,
  ObligationsListResponse,
  PaymentCalendarOverview
} from "@shared/types/domain";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export type CalendarOverview = PaymentCalendarOverview;
export type ObligationsResponse = ObligationsListResponse;

export async function getCalendarOverview(): Promise<CalendarOverview> {
  return apiGet<CalendarOverview>("/api/payment-calendar/overview");
}

export async function getObligations(): Promise<ObligationsResponse> {
  return apiGet<ObligationsResponse>("/api/obligations");
}

export async function createObligation(input: CreateObligationInput): Promise<Obligation> {
  const response = await fetch(`${apiBaseUrl}/api/obligations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error || `API error: ${response.status}`);
  }

  return response.json() as Promise<Obligation>;
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
