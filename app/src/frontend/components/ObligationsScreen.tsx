import { useEffect, useState, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from "react";
import type { CreateObligationInput, Obligation } from "@shared/types/domain";
import { getObligationDetails, updateObligation, updateObligationStatus, type ObligationDetails, type ObligationsResponse } from "@frontend/lib/api";
import { formatFlowType, formatObligationStatus, formatPaymentDate, formatPaymentStatus, formatRecurrenceType, money } from "@frontend/lib/formatters";
import { ListSkeleton, StateCard } from "./ui";

export type ObligationFormState = {
  title: string;
  type: string;
  flowType: CreateObligationInput["flowType"];
  category: string;
  amount: string;
  currency: string;
  recurrenceType: CreateObligationInput["recurrenceType"];
  recurrenceDay: string;
  startDate: string;
  endDate: string;
  comment: string;
};

export const initialObligationForm: ObligationFormState = {
  title: "",
  type: "",
  flowType: "operating",
  category: "",
  amount: "",
  currency: "RUB",
  recurrenceType: "monthly",
  recurrenceDay: "",
  startDate: "",
  endDate: "",
  comment: ""
};

export function sortObligations(items: ObligationsResponse["items"]) {
  return [...items].sort((a, b) => weight(a.status) - weight(b.status) || (a.nextPaymentDate ?? "9999-12-31").localeCompare(b.nextPaymentDate ?? "9999-12-31") || a.title.localeCompare(b.title));
}

export function ObligationsScreen(props: {
  obligations: ObligationsResponse | null;
  loading: boolean;
  error: string | null;
  form: ObligationFormState;
  submitLoading: boolean;
  submitError: string | null;
  submitSuccess: string | null;
  onFormChange: (field: keyof ObligationFormState, event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onObligationMutated: (item: Obligation) => void;
  onPaymentCalendarChanged: () => void;
}) {
  const items = props.obligations?.items ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<ObligationDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<ObligationFormState>(initialObligationForm);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      setDetails(null);
      return;
    }
    if (!selectedId || !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setDetailsLoading(true);
    setDetailsError(null);
    setEditMode(false);
    getObligationDetails(selectedId)
      .then((data) => {
        setDetails(data);
        setEditForm(toFormState(data.item));
      })
      .catch(() => setDetailsError("Не удалось загрузить детали обязательства."))
      .finally(() => setDetailsLoading(false));
  }, [selectedId]);

  const isEmpty = !props.loading && !props.error && items.length === 0;

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details) return;
    setSaving(true);
    setActionError(null);
    setMessage(null);
    try {
      const updated = await updateObligation(details.item.id, toPayload(editForm));
      props.onObligationMutated(updated);
      const fresh = await getObligationDetails(updated.id);
      setDetails(fresh);
      setEditForm(toFormState(fresh.item));
      setEditMode(false);
      setMessage("Обязательство обновлено.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось обновить обязательство.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: Obligation["status"]) {
    if (!details) return;
    setSaving(true);
    setActionError(null);
    setMessage(null);
    try {
      const updated = await updateObligationStatus(details.item.id, status);
      props.onObligationMutated(updated);
      props.onPaymentCalendarChanged();
      const fresh = await getObligationDetails(updated.id);
      setDetails(fresh);
      setEditForm(toFormState(fresh.item));
      setEditMode(false);
      setMessage(`Статус обновлён: ${formatObligationStatus(status)}.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось обновить статус.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section style={styles.card}>
        <h2 style={styles.title}>Новое обязательство</h2>
        <p style={styles.hint}>Простая форма для ввода нового обязательства.</p>
        <Form form={props.form} onChange={props.onFormChange} onSubmit={props.onSubmit} submitLabel={props.submitLoading ? "Сохраняем..." : "Создать"} />
        {props.submitError ? <div style={{ ...styles.msg, ...styles.error }}>{props.submitError}</div> : null}
        {props.submitSuccess ? <div style={{ ...styles.msg, ...styles.success }}>{props.submitSuccess}</div> : null}
      </section>

      <section style={styles.card}>
        <h2 style={styles.title}>Реестр обязательств</h2>
        <p style={styles.hint}>Сумма, периодичность, ближайшая дата и рабочий статус.</p>

        {props.loading ? (
          <ListSkeleton />
        ) : props.error ? (
          <StateCard title="Не удалось загрузить обязательства" description={props.error} tone="error" />
        ) : isEmpty ? (
          <StateCard title="Обязательств пока нет" description="Создайте первое обязательство, чтобы заполнить реестр." tone="empty" />
        ) : (
          <div style={styles.stack}>
            <div style={styles.list}>
              {items.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} style={selectedId === item.id ? styles.itemActive : styles.item}>
                  <div style={styles.row}>
                    <strong>{item.title}</strong>
                    <strong>{money.format(item.amount)}</strong>
                  </div>
                  <p style={styles.meta}>{formatRecurrenceType(item.recurrenceType)} / {formatFlowType(item.flowType)} / {item.category}</p>
                  <div style={styles.row}>
                    <span>{item.nextPaymentDate ? formatPaymentDate(item.nextPaymentDate) : "Дата не задана"}</span>
                    <span style={statusStyle(item.status)}>{formatObligationStatus(item.status)}</span>
                  </div>
                </button>
              ))}
            </div>

            <div style={styles.panel}>
              {!selectedId ? (
                <StateCard title="Выберите обязательство" description="Нажмите на карточку, чтобы открыть детали." tone="empty" />
              ) : detailsLoading ? (
                <ListSkeleton />
              ) : detailsError ? (
                <StateCard title="Не удалось загрузить детали" description={detailsError} tone="error" />
              ) : details ? (
                <>
                  <div style={styles.row}>
                    <div>
                      <h3 style={styles.subtitle}>{details.item.title}</h3>
                      <p style={styles.meta}>{details.item.type} / {formatFlowType(details.item.flowType)} / {details.item.category}</p>
                    </div>
                    <span style={statusStyle(details.activityStatus)}>{formatObligationStatus(details.activityStatus)}</span>
                  </div>

                  <div style={styles.grid}>
                    <Metric label="Сумма" value={money.format(details.item.amount)} />
                    <Metric label="Периодичность" value={formatRecurrenceType(details.item.recurrenceType)} />
                    <Metric label="Ближайший платёж" value={details.item.nextPaymentDate ? formatPaymentDate(details.item.nextPaymentDate) : "Не задан"} />
                    <Metric label="Период" value={`${formatPaymentDate(details.item.startDate)} - ${details.item.endDate ? formatPaymentDate(details.item.endDate) : "Без даты окончания"}`} />
                  </div>

                  {details.item.comment ? <p style={styles.comment}>{details.item.comment}</p> : null}

                  <div style={styles.actions}>
                    <button type="button" onClick={() => setEditMode((v) => !v)} style={styles.secondaryButton}>{editMode ? "Отменить" : "Редактировать"}</button>
                    <button type="button" onClick={() => changeStatus("paused")} disabled={saving || details.item.status === "paused"} style={styles.secondaryButton}>Пауза</button>
                    <button type="button" onClick={() => changeStatus("closed")} disabled={saving || details.item.status === "closed"} style={styles.dangerButton}>Закрыть</button>
                    {details.item.status !== "active" ? <button type="button" onClick={() => changeStatus("active")} disabled={saving} style={styles.secondaryButton}>Возобновить</button> : null}
                  </div>

                  {actionError ? <div style={{ ...styles.msg, ...styles.error }}>{actionError}</div> : null}
                  {message ? <div style={{ ...styles.msg, ...styles.success }}>{message}</div> : null}

                  {editMode ? <Form form={editForm} onChange={(field, event) => setEditForm((current) => ({ ...current, [field]: event.target.value }))} onSubmit={saveEdit} submitLabel={saving ? "Сохраняем..." : "Сохранить"} /> : null}

                  <div style={styles.payments}>
                    <h4 style={styles.paymentsTitle}>Ближайшие плановые платежи</h4>
                    {!details.upcomingPayments.length ? (
                      <StateCard title="Платежей пока нет" description="Для этого обязательства нет будущих scheduled payments." tone="empty" />
                    ) : (
                      <div style={styles.paymentsList}>
                        {details.upcomingPayments.map((payment) => (
                          <article key={payment.id} style={styles.payItem}>
                            <div>
                              <strong>{formatPaymentDate(payment.paymentDate)}</strong>
                              <p style={styles.meta}>{formatPaymentStatus(payment.status)} / {formatFlowType(payment.flowType)} / {payment.category}</p>
                            </div>
                            <strong>{money.format(payment.amount)}</strong>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function Form(props: {
  form: ObligationFormState;
  onChange: (field: keyof ObligationFormState, event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  submitLabel: string;
}) {
  return (
    <form onSubmit={props.onSubmit} style={styles.form}>
      <Field label="Название"><input required value={props.form.title} onChange={(event) => props.onChange("title", event)} style={styles.input} /></Field>
      <Field label="Тип"><input required value={props.form.type} onChange={(event) => props.onChange("type", event)} style={styles.input} /></Field>
      <Field label="Поток"><select value={props.form.flowType} onChange={(event) => props.onChange("flowType", event)} style={styles.input}>{[{value:"operating",label:"Операционный"},{value:"financial",label:"Финансовый"},{value:"tax",label:"Налоги"},{value:"payroll",label:"ФОТ"},{value:"investing",label:"Инвестиции"},{value:"other",label:"Прочее"}].map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}</select></Field>
      <Field label="Категория"><input required value={props.form.category} onChange={(event) => props.onChange("category", event)} style={styles.input} /></Field>
      <Field label="Сумма"><input required type="number" min="0" step="0.01" value={props.form.amount} onChange={(event) => props.onChange("amount", event)} style={styles.input} /></Field>
      <Field label="Валюта"><input required value={props.form.currency} onChange={(event) => props.onChange("currency", event)} style={styles.input} /></Field>
      <Field label="Периодичность"><select value={props.form.recurrenceType} onChange={(event) => props.onChange("recurrenceType", event)} style={styles.input}>{[{value:"once",label:"Разово"},{value:"weekly",label:"Еженедельно"},{value:"monthly",label:"Ежемесячно"},{value:"quarterly",label:"Ежеквартально"},{value:"yearly",label:"Ежегодно"},{value:"custom",label:"По графику"}].map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}</select></Field>
      <Field label="День платежа"><input type="number" min="1" max="31" value={props.form.recurrenceDay} onChange={(event) => props.onChange("recurrenceDay", event)} style={styles.input} /></Field>
      <Field label="Дата начала"><input required type="date" value={props.form.startDate} onChange={(event) => props.onChange("startDate", event)} style={styles.input} /></Field>
      <Field label="Дата окончания"><input type="date" value={props.form.endDate} onChange={(event) => props.onChange("endDate", event)} style={styles.input} /></Field>
      <Field label="Комментарий"><textarea value={props.form.comment} onChange={(event) => props.onChange("comment", event)} style={styles.textarea} /></Field>
      <button type="submit" style={styles.primaryButton}>{props.submitLabel}</button>
    </form>
  );
}

function Field(props: { label: string; children: ReactNode }) {
  return <label style={styles.field}><span style={styles.label}>{props.label}</span>{props.children}</label>;
}

function Metric(props: { label: string; value: string }) {
  return <div style={styles.metric}><span style={styles.metricLabel}>{props.label}</span><strong>{props.value}</strong></div>;
}

function toFormState(item: Obligation): ObligationFormState {
  return { title: item.title, type: item.type, flowType: item.flowType, category: item.category, amount: String(item.amount), currency: item.currency, recurrenceType: item.recurrenceType, recurrenceDay: item.recurrenceDay ? String(item.recurrenceDay) : "", startDate: item.startDate, endDate: item.endDate ?? "", comment: item.comment ?? "" };
}

function toPayload(form: ObligationFormState): CreateObligationInput {
  return { title: form.title.trim(), type: form.type.trim(), flowType: form.flowType, category: form.category.trim(), amount: Number(form.amount), currency: form.currency.trim().toUpperCase(), recurrenceType: form.recurrenceType, recurrenceDay: form.recurrenceDay ? Number(form.recurrenceDay) : null, startDate: form.startDate, endDate: form.endDate || null, comment: form.comment.trim() ? form.comment.trim() : null };
}

function weight(status: Obligation["status"]) { return status === "active" ? 0 : status === "paused" ? 1 : 2; }
function statusStyle(status: Obligation["status"]) { return status === "paused" ? styles.statusPaused : status === "closed" ? styles.statusClosed : styles.statusActive; }

const styles: Record<string, CSSProperties> = {
  card: { marginTop: 12, padding: 16, borderRadius: 20, background: "#ffffff", border: "1px solid #ece4d5" },
  title: { margin: 0, fontSize: 18 },
  subtitle: { margin: 0, fontSize: 18 },
  hint: { margin: "6px 0 0", color: "#6f6658", fontSize: 13 },
  stack: { display: "grid", gap: 12, marginTop: 12 },
  form: { display: "grid", gap: 12, marginTop: 12 },
  field: { display: "grid", gap: 6 },
  label: { fontSize: 13, color: "#5f5648" },
  input: { width: "100%", minHeight: 46, padding: "12px 14px", borderRadius: 14, border: "1px solid #ddd3c0", background: "#fffdf8", fontSize: 16, boxSizing: "border-box" },
  textarea: { width: "100%", minHeight: 84, padding: "12px 14px", borderRadius: 14, border: "1px solid #ddd3c0", background: "#fffdf8", fontSize: 16, resize: "vertical", boxSizing: "border-box" },
  primaryButton: { minHeight: 48, padding: "12px 16px", borderRadius: 14, border: "1px solid #16302b", background: "#16302b", color: "#f9f7f1", fontWeight: 600, cursor: "pointer" },
  secondaryButton: { minHeight: 44, padding: "11px 14px", borderRadius: 14, border: "1px solid #d8cfbf", background: "#fffaf1", color: "#3e382f", fontWeight: 600, cursor: "pointer" },
  dangerButton: { minHeight: 44, padding: "11px 14px", borderRadius: 14, border: "1px solid #cc9e90", background: "#fff3ed", color: "#8a3f22", fontWeight: 600, cursor: "pointer" },
  msg: { marginTop: 12, padding: "10px 12px", borderRadius: 14, fontSize: 14 },
  error: { background: "#fff3ed", border: "1px solid #f4c9b8", color: "#8a3f22" },
  success: { background: "#ecf7ef", border: "1px solid #b9ddc0", color: "#25613b" },
  list: { display: "grid", gap: 12 },
  item: { padding: 16, borderRadius: 18, border: "1px solid #ece4d5", background: "#fffdf8", textAlign: "left", cursor: "pointer" },
  itemActive: { padding: 16, borderRadius: 18, border: "1px solid #16302b", background: "#eef4f2", textAlign: "left", cursor: "pointer" },
  panel: { padding: 16, borderRadius: 18, border: "1px solid #ece4d5", background: "#fcfaf5" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" },
  meta: { margin: "8px 0 0", color: "#6f6658", fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 16 },
  metric: { display: "grid", gap: 4, padding: 12, borderRadius: 14, border: "1px solid #ece4d5", background: "#ffffff" },
  metricLabel: { fontSize: 12, color: "#8b816f", textTransform: "uppercase" },
  comment: { margin: "16px 0 0", padding: 14, borderRadius: 14, background: "#fffdf8", border: "1px solid #ece4d5", lineHeight: 1.5, color: "#4c463d" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 },
  payments: { marginTop: 20, paddingTop: 16, borderTop: "1px solid #ece4d5" },
  paymentsTitle: { margin: 0, fontSize: 16 },
  paymentsList: { display: "grid", gap: 10, marginTop: 12 },
  payItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingBottom: 10, borderBottom: "1px solid #f0eadf" },
  statusActive: { padding: "6px 10px", borderRadius: 999, background: "#ecf7ef", color: "#25613b", fontSize: 12 },
  statusPaused: { padding: "6px 10px", borderRadius: 999, background: "#fff7e9", color: "#9a6518", fontSize: 12 },
  statusClosed: { padding: "6px 10px", borderRadius: 999, background: "#f3f0ea", color: "#7b7365", fontSize: 12 }
};
