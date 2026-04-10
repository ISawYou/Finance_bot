import { useEffect, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import { getMiniAppContext } from "./lib/telegram";
import {
  createObligation,
  getCalendarOverview,
  getObligations,
  type CalendarOverview,
  type ObligationsResponse
} from "./lib/api";
import type { CreateObligationInput } from "@shared/types/domain";
import { DashboardScreen } from "./components/DashboardScreen";
import {
  ObligationsScreen,
  initialObligationForm,
  sortObligations,
  type ObligationFormState
} from "./components/ObligationsScreen";
import { PaymentCalendarScreen } from "./components/PaymentCalendarScreen";

type Screen = "dashboard" | "calendar" | "obligations";

export function App() {
  const [screen, setScreen] = useState<Screen>("calendar");
  const [overview, setOverview] = useState<CalendarOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [obligations, setObligations] = useState<ObligationsResponse | null>(null);
  const [obligationsLoading, setObligationsLoading] = useState(true);
  const [obligationsError, setObligationsError] = useState<string | null>(null);
  const [form, setForm] = useState<ObligationFormState>(initialObligationForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const miniApp = getMiniAppContext();

  useEffect(() => {
    refreshOverview();
    refreshObligations();
  }, []);

  function refreshOverview() {
    setOverviewLoading(true);
    setOverviewError(null);
    getCalendarOverview()
      .then(setOverview)
      .catch(() => setOverviewError("Не удалось загрузить обзор платежного календаря."))
      .finally(() => setOverviewLoading(false));
  }

  function refreshObligations() {
    setObligationsLoading(true);
    setObligationsError(null);
    getObligations()
      .then(setObligations)
      .catch(() => setObligationsError("Не удалось загрузить список обязательств."))
      .finally(() => setObligationsLoading(false));
  }

  const source = screen === "obligations" ? obligations?.source : overview?.source;
  const sourceLabel =
    (screen === "obligations" ? obligationsLoading : overviewLoading)
      ? "загрузка..."
      : source === "supabase"
        ? "Supabase"
        : "Mock data";

  async function handleCreateObligation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const payload: CreateObligationInput = {
        title: form.title.trim(),
        type: form.type.trim(),
        flowType: form.flowType,
        category: form.category.trim(),
        amount: Number(form.amount),
        currency: form.currency.trim().toUpperCase(),
        recurrenceType: form.recurrenceType,
        recurrenceDay: form.recurrenceDay ? Number(form.recurrenceDay) : null,
        startDate: form.startDate,
        endDate: form.endDate || null,
        comment: form.comment.trim() ? form.comment.trim() : null
      };

      const created = await createObligation(payload);
      handleObligationMutated(created);
      refreshOverview();
      setForm(initialObligationForm);
      setSubmitSuccess("Обязательство создано.");
      setScreen("obligations");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не удалось создать обязательство.");
    } finally {
      setSubmitLoading(false);
    }
  }

  function handleFormChange(
    field: keyof ObligationFormState,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function handleObligationMutated(updated: ObligationsResponse["items"][number]) {
    setObligations((current) => ({
      source: current?.source ?? "supabase",
      items: sortObligations([
        updated,
        ...(current?.items ?? []).filter((item) => item.id !== updated.id)
      ])
    }));
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <p style={styles.eyebrow}>Finance Control</p>
        <h1 style={styles.title}>Money calendar для собственника</h1>
        <p style={styles.subtitle}>
          Основной интерфейс теперь строится вокруг календаря платежей, а obligations остаются базой для планирования.
        </p>
        <div style={styles.meta}>
          <span style={styles.sourceBadge}>Источник: {sourceLabel}</span>
          <span>Платформа: {miniApp.platform}</span>
          <span>Пользователь: {miniApp.userName}</span>
        </div>
      </section>

      <nav style={styles.nav}>
        <button type="button" onClick={() => setScreen("calendar")} style={screen === "calendar" ? styles.tabActive : styles.tab}>Payment Calendar</button>
        <button type="button" onClick={() => setScreen("dashboard")} style={screen === "dashboard" ? styles.tabActive : styles.tab}>Dashboard</button>
        <button type="button" onClick={() => setScreen("obligations")} style={screen === "obligations" ? styles.tabActive : styles.tab}>Obligations</button>
      </nav>

      {screen === "calendar" ? <PaymentCalendarScreen /> : null}
      {screen === "dashboard" ? (
        <DashboardScreen overview={overview} loading={overviewLoading} error={overviewError} />
      ) : null}
      {screen === "obligations" ? (
        <ObligationsScreen
          obligations={obligations}
          loading={obligationsLoading}
          error={obligationsError}
          form={form}
          submitLoading={submitLoading}
          submitError={submitError}
          submitSuccess={submitSuccess}
          onFormChange={handleFormChange}
          onSubmit={handleCreateObligation}
          onObligationMutated={handleObligationMutated}
          onPaymentCalendarChanged={refreshOverview}
        />
      ) : null}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    margin: 0,
    padding: "24px 16px 40px",
    background: "linear-gradient(180deg, #f3efe6 0%, #faf8f2 54%, #ffffff 100%)",
    color: "#1d1d1f",
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
  },
  hero: {
    padding: 20,
    borderRadius: 24,
    background: "#16302b",
    color: "#f9f7f1",
    boxShadow: "0 12px 32px rgba(22, 48, 43, 0.18)"
  },
  eyebrow: {
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontSize: 12,
    opacity: 0.8
  },
  title: {
    margin: "10px 0 12px",
    fontSize: 30,
    lineHeight: 1.1
  },
  subtitle: {
    margin: 0,
    lineHeight: 1.5,
    maxWidth: 560
  },
  meta: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 16,
    fontSize: 13,
    opacity: 0.9
  },
  sourceBadge: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.2)"
  },
  nav: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginTop: 16
  },
  tab: {
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid #e6dece",
    background: "#fffaf1",
    color: "#5f5648",
    fontWeight: 600,
    cursor: "pointer"
  },
  tabActive: {
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid #16302b",
    background: "#16302b",
    color: "#f9f7f1",
    fontWeight: 600,
    cursor: "pointer"
  }
};
