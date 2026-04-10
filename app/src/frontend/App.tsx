import { useEffect, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import type { CreateObligationInput, OwnerDashboardOverview } from "@shared/types/domain";
import { DashboardScreen } from "./components/DashboardScreen";
import { MoneyScreen } from "./components/MoneyScreen";
import {
  ObligationsScreen,
  initialObligationForm,
  sortObligations,
  type ObligationFormState
} from "./components/ObligationsScreen";
import { PaymentCalendarScreen } from "./components/PaymentCalendarScreen";
import { getMiniAppContext } from "./lib/telegram";
import { createObligation, getObligations, getOwnerDashboardOverview, type ObligationsResponse } from "./lib/api";
import { formatDataSource } from "./lib/formatters";

type Screen = "dashboard" | "calendar" | "obligations" | "money";

const screenTitles: Record<Screen, string> = {
  dashboard: "Главная",
  calendar: "Календарь",
  obligations: "Обязательства",
  money: "Деньги"
};

export function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [overview, setOverview] = useState<OwnerDashboardOverview | null>(null);
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
    getOwnerDashboardOverview()
      .then(setOverview)
      .catch(() => setOverviewError("Не удалось загрузить данные главного экрана."))
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

  const source = screen === "obligations" ? obligations?.source : overview?.source;
  const sourceLabel = (screen === "obligations" ? obligationsLoading : overviewLoading) ? "Загрузка..." : formatDataSource(source);

  return (
    <main style={styles.page}>
      <section style={styles.appFrame}>
        <header style={styles.header}>
          <div>
            <p style={styles.kicker}>Finance Control</p>
            <h1 style={styles.headerTitle}>{screenTitles[screen]}</h1>
            <p style={styles.headerSubtext}>Источник: {sourceLabel}</p>
          </div>
          <div style={styles.headerMeta}>
            <span>{miniApp.platform}</span>
            <span>{miniApp.userName}</span>
          </div>
        </header>

        <section style={styles.content}>
          {screen === "dashboard" ? <DashboardScreen overview={overview} loading={overviewLoading} error={overviewError} /> : null}
          {screen === "calendar" ? <PaymentCalendarScreen /> : null}
          {screen === "money" ? <MoneyScreen overview={overview} loading={overviewLoading} error={overviewError} /> : null}
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
        </section>

        <nav style={styles.bottomNav}>
          <button type="button" onClick={() => setScreen("dashboard")} style={screen === "dashboard" ? styles.navButtonActive : styles.navButton}>Главная</button>
          <button type="button" onClick={() => setScreen("calendar")} style={screen === "calendar" ? styles.navButtonActive : styles.navButton}>Календарь</button>
          <button type="button" onClick={() => setScreen("obligations")} style={screen === "obligations" ? styles.navButtonActive : styles.navButton}>Обязательства</button>
          <button type="button" onClick={() => setScreen("money")} style={screen === "money" ? styles.navButtonActive : styles.navButton}>Деньги</button>
        </nav>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    margin: 0,
    background: "linear-gradient(180deg, #f3efe6 0%, #faf8f2 54%, #ffffff 100%)",
    color: "#1d1d1f",
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
  },
  appFrame: {
    minHeight: "100vh",
    paddingTop: "max(16px, env(safe-area-inset-top))",
    paddingRight: 16,
    paddingLeft: 16,
    paddingBottom: "calc(88px + env(safe-area-inset-bottom))",
    boxSizing: "border-box"
  },
  header: {
    padding: 18,
    borderRadius: 22,
    background: "#16302b",
    color: "#f9f7f1",
    boxShadow: "0 12px 32px rgba(22, 48, 43, 0.18)"
  },
  kicker: {
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontSize: 11,
    opacity: 0.78
  },
  headerTitle: {
    margin: "10px 0 6px",
    fontSize: 28,
    lineHeight: 1.05
  },
  headerSubtext: {
    margin: 0,
    opacity: 0.85,
    fontSize: 13
  },
  headerMeta: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 12,
    fontSize: 12,
    opacity: 0.8
  },
  content: {
    marginTop: 12
  },
  bottomNav: {
    position: "fixed",
    left: 12,
    right: 12,
    bottom: "max(12px, env(safe-area-inset-bottom))",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
    padding: 8,
    borderRadius: 20,
    background: "rgba(255, 250, 241, 0.96)",
    border: "1px solid #e6dece",
    boxShadow: "0 10px 24px rgba(46, 41, 31, 0.12)",
    backdropFilter: "blur(10px)"
  },
  navButton: {
    minHeight: 48,
    padding: "8px 6px",
    borderRadius: 14,
    border: "1px solid transparent",
    background: "transparent",
    color: "#5f5648",
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer"
  },
  navButtonActive: {
    minHeight: 48,
    padding: "8px 6px",
    borderRadius: 14,
    border: "1px solid #16302b",
    background: "#16302b",
    color: "#f9f7f1",
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer"
  }
};
