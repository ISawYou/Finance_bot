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

type Screen = "dashboard" | "obligations";

type ObligationFormState = {
  title: string;
  type: string;
  amount: string;
  currency: string;
  recurrenceType: CreateObligationInput["recurrenceType"];
  recurrenceDay: string;
  startDate: string;
  endDate: string;
  comment: string;
};

const money = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0
});

const initialObligationForm: ObligationFormState = {
  title: "",
  type: "",
  amount: "",
  currency: "RUB",
  recurrenceType: "monthly",
  recurrenceDay: "",
  startDate: "",
  endDate: "",
  comment: ""
};

export function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
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
    setOverviewLoading(true);
    setOverviewError(null);

    getCalendarOverview()
      .then(setOverview)
      .catch(() => setOverviewError("Не удалось загрузить обзор платежного календаря."))
      .finally(() => setOverviewLoading(false));

    setObligationsLoading(true);
    setObligationsError(null);

    getObligations()
      .then(setObligations)
      .catch(() => setObligationsError("Не удалось загрузить список обязательств."))
      .finally(() => setObligationsLoading(false));
  }, []);

  const source = screen === "dashboard" ? overview?.source : obligations?.source;
  const sourceLabel =
    (screen === "dashboard" ? overviewLoading : obligationsLoading)
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
        amount: Number(form.amount),
        currency: form.currency.trim().toUpperCase(),
        recurrenceType: form.recurrenceType,
        recurrenceDay: form.recurrenceDay ? Number(form.recurrenceDay) : null,
        startDate: form.startDate,
        endDate: form.endDate || null,
        comment: form.comment.trim() ? form.comment.trim() : null
      };

      const created = await createObligation(payload);

      setObligations((current) => ({
        source: current?.source === "supabase" ? "supabase" : "supabase",
        items: sortObligations([created, ...(current?.items ?? [])])
      }));
      getCalendarOverview()
        .then(setOverview)
        .catch(() => undefined);
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
    setForm((current) => ({
      ...current,
      [field]: event.target.value
    }));
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <p style={styles.eyebrow}>Finance Control</p>
        <h1 style={styles.title}>Финансовый контроль без перегруза</h1>
        <p style={styles.subtitle}>
          Минимальный MVP для собственника и CFO: платежный календарь, реестр
          обязательств и первая форма создания нового обязательства.
        </p>
        <div style={styles.meta}>
          <span style={styles.sourceBadge}>Источник: {sourceLabel}</span>
          <span>Платформа: {miniApp.platform}</span>
          <span>Пользователь: {miniApp.userName}</span>
        </div>
      </section>

      <nav style={styles.nav}>
        <button
          type="button"
          onClick={() => setScreen("dashboard")}
          style={screen === "dashboard" ? styles.tabActive : styles.tab}
        >
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => setScreen("obligations")}
          style={screen === "obligations" ? styles.tabActive : styles.tab}
        >
          Obligations
        </button>
      </nav>

      {screen === "dashboard" ? (
        <DashboardView
          overview={overview}
          loading={overviewLoading}
          error={overviewError}
        />
      ) : (
        <ObligationsView
          obligations={obligations}
          loading={obligationsLoading}
          error={obligationsError}
          form={form}
          submitLoading={submitLoading}
          submitError={submitError}
          submitSuccess={submitSuccess}
          onFormChange={handleFormChange}
          onSubmit={handleCreateObligation}
        />
      )}
    </main>
  );
}

function DashboardView(props: {
  overview: CalendarOverview | null;
  loading: boolean;
  error: string | null;
}) {
  const summary = props.overview?.summary;
  const upcoming = props.overview?.upcoming ?? [];
  const isEmpty = !props.loading && !props.error && upcoming.length === 0;

  return (
    <>
      <section style={styles.grid}>
        <MetricCard
          label="Сегодня"
          value={props.loading ? "..." : money.format(summary?.todayAmount ?? 0)}
          tone="default"
        />
        <MetricCard
          label="7 дней"
          value={props.loading ? "..." : money.format(summary?.weekAmount ?? 0)}
          tone="accent"
        />
        <MetricCard
          label="Месяц"
          value={props.loading ? "..." : money.format(summary?.monthAmount ?? 0)}
          tone="default"
        />
        <MetricCard
          label="Просрочено"
          value={props.loading ? "..." : String(summary?.overdueCount ?? 0)}
          tone="alert"
        />
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Ближайшие платежи</h2>
            <p style={styles.sectionHint}>Только важные суммы и ближайшие даты.</p>
          </div>
        </div>

        {props.loading ? (
          <ListSkeleton />
        ) : props.error ? (
          <StateCard title="Не удалось загрузить данные" description={props.error} tone="error" />
        ) : isEmpty ? (
          <StateCard
            title="Ближайших выплат нет"
            description="На сегодня и ближайший период обязательных платежей не найдено."
            tone="empty"
          />
        ) : (
          <div style={styles.list}>
            {upcoming.map((payment) => (
              <article key={payment.id} style={styles.listItem}>
                <div>
                  <strong>{payment.title}</strong>
                  <p style={styles.listMeta}>
                    {formatPaymentDate(payment.paymentDate)} · {getPaymentStatusLabel(payment.status)}
                  </p>
                </div>
                <div style={styles.amountBox}>
                  <strong>{money.format(payment.amount)}</strong>
                  <span style={styles.typeBadge}>{payment.type}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function ObligationsView(props: {
  obligations: ObligationsResponse | null;
  loading: boolean;
  error: string | null;
  form: ObligationFormState;
  submitLoading: boolean;
  submitError: string | null;
  submitSuccess: string | null;
  onFormChange: (
    field: keyof ObligationFormState,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  const items = props.obligations?.items ?? [];
  const isEmpty = !props.loading && !props.error && items.length === 0;

  return (
    <>
      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Создать obligation</h2>
            <p style={styles.sectionHint}>Простая MVP-форма без лишних шагов.</p>
          </div>
        </div>

        <form onSubmit={props.onSubmit} style={styles.form}>
          <label style={styles.field}>
            <span style={styles.fieldLabel}>Название</span>
            <input
              required
              value={props.form.title}
              onChange={(event) => props.onFormChange("title", event)}
              style={styles.input}
              placeholder="Например, аренда офиса"
            />
          </label>

          <label style={styles.field}>
            <span style={styles.fieldLabel}>Тип</span>
            <input
              required
              value={props.form.type}
              onChange={(event) => props.onFormChange("type", event)}
              style={styles.input}
              placeholder="rent, tax, salary"
            />
          </label>

          <div style={styles.formRow}>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>Сумма</span>
              <input
                required
                min="0"
                step="0.01"
                type="number"
                value={props.form.amount}
                onChange={(event) => props.onFormChange("amount", event)}
                style={styles.input}
                placeholder="150000"
              />
            </label>

            <label style={styles.field}>
              <span style={styles.fieldLabel}>Валюта</span>
              <input
                required
                value={props.form.currency}
                onChange={(event) => props.onFormChange("currency", event)}
                style={styles.input}
                placeholder="RUB"
              />
            </label>
          </div>

          <div style={styles.formRow}>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>Периодичность</span>
              <select
                value={props.form.recurrenceType}
                onChange={(event) => props.onFormChange("recurrenceType", event)}
                style={styles.input}
              >
                <option value="once">Разово</option>
                <option value="weekly">Еженедельно</option>
                <option value="monthly">Ежемесячно</option>
                <option value="quarterly">Ежеквартально</option>
                <option value="yearly">Ежегодно</option>
                <option value="custom">По графику</option>
              </select>
            </label>

            <label style={styles.field}>
              <span style={styles.fieldLabel}>День платежа</span>
              <input
                min="1"
                max="31"
                type="number"
                value={props.form.recurrenceDay}
                onChange={(event) => props.onFormChange("recurrenceDay", event)}
                style={styles.input}
                placeholder="5"
              />
            </label>
          </div>

          <div style={styles.formRow}>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>Дата начала</span>
              <input
                required
                type="date"
                value={props.form.startDate}
                onChange={(event) => props.onFormChange("startDate", event)}
                style={styles.input}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.fieldLabel}>Дата окончания</span>
              <input
                type="date"
                value={props.form.endDate}
                onChange={(event) => props.onFormChange("endDate", event)}
                style={styles.input}
              />
            </label>
          </div>

          <label style={styles.field}>
            <span style={styles.fieldLabel}>Комментарий</span>
            <textarea
              value={props.form.comment}
              onChange={(event) => props.onFormChange("comment", event)}
              style={styles.textarea}
              placeholder="Короткий комментарий для команды"
            />
          </label>

          {props.submitError ? (
            <div style={{ ...styles.inlineMessage, ...styles.inlineError }}>
              {props.submitError}
            </div>
          ) : null}

          {props.submitSuccess ? (
            <div style={{ ...styles.inlineMessage, ...styles.inlineSuccess }}>
              {props.submitSuccess}
            </div>
          ) : null}

          <button type="submit" disabled={props.submitLoading} style={styles.primaryButton}>
            {props.submitLoading ? "Сохраняем..." : "Создать obligation"}
          </button>
        </form>
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Обязательства</h2>
            <p style={styles.sectionHint}>Read-only список текущих обязательств компании.</p>
          </div>
        </div>

        {props.loading ? (
          <ListSkeleton />
        ) : props.error ? (
          <StateCard title="Не удалось загрузить обязательства" description={props.error} tone="error" />
        ) : isEmpty ? (
          <StateCard
            title="Обязательств пока нет"
            description="В базе пока нет активных или приостановленных обязательств."
            tone="empty"
          />
        ) : (
          <div style={styles.list}>
            {items.map((item) => (
              <article key={item.id} style={styles.obligationItem}>
                <div style={styles.obligationMain}>
                  <div>
                    <strong>{item.title}</strong>
                    <p style={styles.listMeta}>
                      {item.type} · {getRecurrenceLabel(item.recurrenceType)}
                    </p>
                  </div>
                  <strong>{money.format(item.amount)}</strong>
                </div>
                <div style={styles.obligationMetaRow}>
                  <span style={styles.metaChip}>
                    Ближайший платеж: {item.nextPaymentDate ? formatPaymentDate(item.nextPaymentDate) : "не задан"}
                  </span>
                  <span style={getObligationStatusStyle(item.status)}>
                    {getObligationStatusLabel(item.status)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function ListSkeleton() {
  return (
    <div style={styles.list}>
      {Array.from({ length: 3 }).map((_, index) => (
        <article key={index} style={styles.listItem}>
          <div style={styles.skeletonBlock}>
            <div style={{ ...styles.skeletonLine, width: 180 }} />
            <div style={{ ...styles.skeletonLine, width: 120 }} />
          </div>
          <div style={{ ...styles.skeletonLine, width: 88 }} />
        </article>
      ))}
    </div>
  );
}

function MetricCard(props: {
  label: string;
  value: string;
  tone: "default" | "accent" | "alert";
}) {
  const toneStyle =
    props.tone === "accent"
      ? styles.metricCardAccent
      : props.tone === "alert"
        ? styles.metricCardAlert
        : styles.metricCard;

  return (
    <article style={toneStyle}>
      <p style={styles.metricLabel}>{props.label}</p>
      <strong style={styles.metricValue}>{props.value}</strong>
    </article>
  );
}

function StateCard(props: { title: string; description: string; tone: "error" | "empty" }) {
  const toneStyle = props.tone === "error" ? styles.stateError : styles.stateEmpty;

  return (
    <div style={{ ...styles.stateCard, ...toneStyle }}>
      <strong>{props.title}</strong>
      <p style={styles.stateText}>{props.description}</p>
    </div>
  );
}

function formatPaymentDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long"
  }).format(date);
}

function getPaymentStatusLabel(status: CalendarOverview["upcoming"][number]["status"]) {
  switch (status) {
    case "overdue":
      return "просрочено";
    case "paid":
      return "оплачено";
    case "needs_review":
      return "требует проверки";
    case "cancelled":
      return "отменено";
    default:
      return "запланировано";
  }
}

function getRecurrenceLabel(value: ObligationsResponse["items"][number]["recurrenceType"]) {
  switch (value) {
    case "once":
      return "разово";
    case "weekly":
      return "еженедельно";
    case "monthly":
      return "ежемесячно";
    case "quarterly":
      return "ежеквартально";
    case "yearly":
      return "ежегодно";
    default:
      return "по графику";
  }
}

function getObligationStatusLabel(value: ObligationsResponse["items"][number]["status"]) {
  switch (value) {
    case "paused":
      return "paused";
    case "closed":
      return "closed";
    default:
      return "active";
  }
}

function getObligationStatusStyle(value: ObligationsResponse["items"][number]["status"]) {
  if (value === "paused") {
    return styles.statusPaused;
  }

  if (value === "closed") {
    return styles.statusClosed;
  }

  return styles.statusActive;
}

function sortObligations(items: ObligationsResponse["items"]) {
  return [...items].sort((a, b) => {
    const aDate = a.nextPaymentDate ?? "9999-12-31";
    const bDate = b.nextPaymentDate ?? "9999-12-31";
    return aDate.localeCompare(bDate) || a.title.localeCompare(b.title);
  });
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
    gridTemplateColumns: "1fr 1fr",
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
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
    marginTop: 16
  },
  metricCard: {
    padding: 16,
    borderRadius: 20,
    background: "#fffdf8",
    border: "1px solid #ece4d5"
  },
  metricCardAccent: {
    padding: 16,
    borderRadius: 20,
    background: "#16302b",
    color: "#f9f7f1",
    border: "1px solid #16302b"
  },
  metricCardAlert: {
    padding: 16,
    borderRadius: 20,
    background: "#fff3ed",
    border: "1px solid #f4c9b8"
  },
  metricLabel: {
    margin: 0,
    color: "#6f6658",
    fontSize: 13
  },
  metricValue: {
    display: "block",
    marginTop: 8,
    fontSize: 24
  },
  card: {
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    background: "#ffffff",
    border: "1px solid #ece4d5"
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  sectionTitle: {
    margin: 0,
    fontSize: 18
  },
  sectionHint: {
    margin: "6px 0 0",
    color: "#6f6658",
    fontSize: 13
  },
  form: {
    display: "grid",
    gap: 12,
    marginTop: 16
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12
  },
  field: {
    display: "grid",
    gap: 6
  },
  fieldLabel: {
    fontSize: 13,
    color: "#5f5648"
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #ddd3c0",
    background: "#fffdf8",
    fontSize: 14,
    boxSizing: "border-box"
  },
  textarea: {
    width: "100%",
    minHeight: 88,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #ddd3c0",
    background: "#fffdf8",
    fontSize: 14,
    resize: "vertical",
    boxSizing: "border-box"
  },
  primaryButton: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid #16302b",
    background: "#16302b",
    color: "#f9f7f1",
    fontWeight: 600,
    cursor: "pointer"
  },
  inlineMessage: {
    padding: "10px 12px",
    borderRadius: 14,
    fontSize: 14
  },
  inlineError: {
    background: "#fff3ed",
    border: "1px solid #f4c9b8",
    color: "#8a3f22"
  },
  inlineSuccess: {
    background: "#ecf7ef",
    border: "1px solid #b9ddc0",
    color: "#25613b"
  },
  list: {
    display: "grid",
    gap: 12,
    marginTop: 16
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    paddingBottom: 12,
    borderBottom: "1px solid #f0eadf"
  },
  obligationItem: {
    display: "grid",
    gap: 10,
    paddingBottom: 14,
    borderBottom: "1px solid #f0eadf"
  },
  obligationMain: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16
  },
  obligationMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap"
  },
  listMeta: {
    margin: "6px 0 0",
    color: "#6f6658",
    fontSize: 13
  },
  amountBox: {
    display: "grid",
    justifyItems: "end",
    gap: 6
  },
  typeBadge: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "#f3ede1",
    color: "#5f5648",
    fontSize: 12,
    textTransform: "uppercase"
  },
  metaChip: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#faf7f0",
    border: "1px solid #ece4d5",
    color: "#5f5648",
    fontSize: 12
  },
  statusActive: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#ecf7ef",
    color: "#25613b",
    fontSize: 12,
    textTransform: "uppercase"
  },
  statusPaused: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#fff7e9",
    color: "#9a6518",
    fontSize: 12,
    textTransform: "uppercase"
  },
  statusClosed: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#f3f0ea",
    color: "#7b7365",
    fontSize: 12,
    textTransform: "uppercase"
  },
  stateCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18
  },
  stateEmpty: {
    background: "#faf7f0",
    border: "1px solid #ece4d5"
  },
  stateError: {
    background: "#fff3ed",
    border: "1px solid #f4c9b8"
  },
  stateText: {
    margin: "8px 0 0",
    color: "#6f6658",
    lineHeight: 1.5
  },
  skeletonBlock: {
    display: "grid",
    gap: 8
  },
  skeletonLine: {
    height: 12,
    borderRadius: 999,
    background: "linear-gradient(90deg, #eee6d8 0%, #f7f1e7 50%, #eee6d8 100%)"
  }
};
