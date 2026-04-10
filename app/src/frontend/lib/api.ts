import type {
  CreateObligationInput,
  Obligation,
  ObligationDetailsResponse,
  ObligationsListResponse,
  PaymentCalendarEventsResponse,
  PaymentCalendarOverview,
  UpdateObligationInput
} from "@shared/types/domain";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export type CalendarOverview = PaymentCalendarOverview;
export type CalendarEventsResponse = PaymentCalendarEventsResponse;
export type ObligationsResponse = ObligationsListResponse;
export type ObligationDetails = ObligationDetailsResponse;

export async function getCalendarOverview(): Promise<CalendarOverview> {
  return apiGet<CalendarOverview>("/api/payment-calendar/overview");
}

export async function getObligations(): Promise<ObligationsResponse> {
  return apiGet<ObligationsResponse>("/api/obligations");
}

export async function getObligationDetails(id: string): Promise<ObligationDetails> {
  return apiGet<ObligationDetails>(`/api/obligations/${id}`);
}

export async function getCalendarEvents(params: {
  dateFrom: string;
  dateTo: string;
  status?: string;
  flowType?: string;
}): Promise<CalendarEventsResponse> {
  const search = new URLSearchParams({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo
  });

  if (params.status) {
    search.set("status", params.status);
  }

  if (params.flowType) {
    search.set("flowType", params.flowType);
  }

  return apiGet<CalendarEventsResponse>(`/api/payment-calendar/events?${search.toString()}`);
}

export async function createObligation(input: CreateObligationInput): Promise<Obligation> {
  return apiSend<Obligation>("/api/obligations", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateObligation(id: string, input: UpdateObligationInput): Promise<Obligation> {
  return apiSend<Obligation>(`/api/obligations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function updateObligationStatus(
  id: string,
  status: Obligation["status"]
): Promise<Obligation> {
  return apiSend<Obligation>(`/api/obligations/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

async function apiSend<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error || `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
