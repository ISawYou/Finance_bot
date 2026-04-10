import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { FlowType, PaymentStatus } from "@shared/types/domain";
import { getCalendarEvents, type CalendarEventsResponse } from "@frontend/lib/api";
import { formatMonthLabel, formatPaymentDate, money } from "@frontend/lib/formatters";
import { ListSkeleton, StateCard } from "./ui";

type ViewMode = "month" | "agenda";

export function PaymentCalendarScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [status, setStatus] = useState<PaymentStatus | "all">("all");
  const [flowType, setFlowType] = useState<FlowType | "all">("all");
  const [data, setData] = useState<CalendarEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return { dateFrom: toIsoDate(monthStart), dateTo: toIsoDate(monthEnd) };
  }, [currentMonth]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getCalendarEvents({ dateFrom: range.dateFrom, dateTo: range.dateTo, status, flowType })
      .then((response) => {
        setData(response);
        setSelectedDate((current) => current ?? response.items[0]?.paymentDate ?? range.dateFrom);
      })
      .catch(() => setError("Не удалось загрузить события календаря."))
      .finally(() => setLoading(false));
  }, [range.dateFrom, range.dateTo, status, flowType]);

  const items = data?.items ?? [];
  const days = buildMonthGrid(currentMonth);
  const groupedByDate = groupByDate(items);
  const selectedItems = selectedDate ? groupedByDate.get(selectedDate) ?? [] : [];

  return (
    <section style={styles.card}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.title}>Payment Calendar</h2>
          <p style={styles.subtitle}>Основной money calendar для собственника.</p>
        </div>
        <div style={styles.viewSwitch}>
          <button type="button" onClick={() => setViewMode("month")} style={viewMode === "month" ? styles.viewTabActive : styles.viewTab}>Month</button>
          <button type="button" onClick={() => setViewMode("agenda")} style={viewMode === "agenda" ? styles.viewTabActive : styles.viewTab}>Agenda</button>
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.monthNav}>
          <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} style={styles.iconButton}>←</button>
          <strong>{formatMonthLabel(currentMonth)}</strong>
          <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={styles.iconButton}>→</button>
        </div>
        <div style={styles.filters}>
          <select value={status} onChange={(event) => setStatus(event.target.value as PaymentStatus | "all")} style={styles.select}>
            <option value="all">Все статусы</option>
            <option value="planned">planned</option>
            <option value="paid">paid</option>
            <option value="overdue">overdue</option>
            <option value="needs_review">needs_review</option>
          </select>
          <select value={flowType} onChange={(event) => setFlowType(event.target.value as FlowType | "all")} style={styles.select}>
            <option value="all">Все потоки</option>
            <option value="operating">operating</option>
            <option value="financial">financial</option>
            <option value="tax">tax</option>
            <option value="payroll">payroll</option>
            <option value="investing">investing</option>
            <option value="other">other</option>
          </select>
        </div>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <StateCard title="Календарь недоступен" description={error} tone="error" />
      ) : viewMode === "agenda" ? (
        <AgendaView items={items} />
      ) : (
        <>
          <MonthView days={days} groupedByDate={groupedByDate} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          <DayDetail date={selectedDate} items={selectedItems} />
        </>
      )}
    </section>
  );
}

function AgendaView(props: { items: CalendarEventsResponse["items"] }) {
  if (!props.items.length) {
    return <StateCard title="Событий нет" description="По выбранным фильтрам платежей не найдено." tone="empty" />;
  }
  return (
    <div style={styles.agendaList}>
      {props.items.map((item) => (
        <article key={item.id} style={styles.agendaItem}>
          <div>
            <strong>{item.title}</strong>
            <p style={styles.meta}>{formatPaymentDate(item.paymentDate)} · {item.status}</p>
            <p style={styles.submeta}>{item.flowType} · {item.category}</p>
          </div>
          <strong>{money.format(item.amount)}</strong>
        </article>
      ))}
    </div>
  );
}

function MonthView(props: {
  days: Date[];
  groupedByDate: Map<string, CalendarEventsResponse["items"]>;
  selectedDate: string | null;
  onSelectDate: (value: string) => void;
}) {
  return (
    <>
      <div style={styles.weekHeader}>
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((label) => (
          <div key={label} style={styles.weekCell}>{label}</div>
        ))}
      </div>
      <div style={styles.monthGrid}>
        {props.days.map((day) => {
          const iso = toIsoDate(day);
          const items = props.groupedByDate.get(iso) ?? [];
          const total = items.reduce((sum, item) => sum + item.amount, 0);
          return (
            <button key={iso} type="button" onClick={() => props.onSelectDate(iso)} style={props.selectedDate === iso ? styles.dayCellActive : styles.dayCell}>
              <div style={styles.dayNumber}>{day.getUTCDate()}</div>
              {items.length ? (
                <>
                  <div style={styles.dayAmount}>{money.format(total)}</div>
                  <div style={styles.dayDots}>
                    {items.slice(0, 3).map((item) => <span key={item.id} style={getEventDotStyle(item.status, item.flowType)} />)}
                  </div>
                </>
              ) : (
                <div style={styles.dayEmpty}>—</div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

function DayDetail(props: { date: string | null; items: CalendarEventsResponse["items"] }) {
  return (
    <div style={styles.dayDetail}>
      <h3 style={styles.dayDetailTitle}>{props.date ? formatPaymentDate(props.date) : "Выберите день"}</h3>
      {!props.items.length ? (
        <p style={styles.emptyText}>На этот день платежей нет.</p>
      ) : (
        <div style={styles.agendaList}>
          {props.items.map((item) => (
            <article key={item.id} style={styles.agendaItem}>
              <div>
                <strong>{item.title}</strong>
                <p style={styles.meta}>{item.status}</p>
                <p style={styles.submeta}>{item.flowType} · {item.category}</p>
              </div>
              <strong>{money.format(item.amount)}</strong>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByDate(items: CalendarEventsResponse["items"]) {
  const map = new Map<string, CalendarEventsResponse["items"]>();
  for (const item of items) {
    const bucket = map.get(item.paymentDate) ?? [];
    bucket.push(item);
    map.set(item.paymentDate, bucket);
  }
  return map;
}

function buildMonthGrid(date: Date) {
  const first = startOfMonth(date);
  const firstDay = (first.getUTCDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setUTCDate(first.getUTCDate() - firstDay);
  return Array.from({ length: 42 }, (_, index) => {
    const value = new Date(gridStart);
    value.setUTCDate(gridStart.getUTCDate() + index);
    return value;
  });
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function addMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getEventDotStyle(status: string, flowType: string): CSSProperties {
  if (status === "overdue") return styles.dotOverdue;
  if (status === "paid") return styles.dotPaid;
  if (flowType === "financial") return styles.dotFinancial;
  return styles.dotOperating;
}

const styles: Record<string, CSSProperties> = {
  card: { marginTop: 16, padding: 18, borderRadius: 24, background: "#ffffff", border: "1px solid #ece4d5" },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  title: { margin: 0, fontSize: 18 },
  subtitle: { margin: "6px 0 0", color: "#6f6658", fontSize: 13 },
  viewSwitch: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  viewTab: { padding: "10px 12px", borderRadius: 14, border: "1px solid #e6dece", background: "#fffaf1", cursor: "pointer" },
  viewTabActive: { padding: "10px 12px", borderRadius: 14, border: "1px solid #16302b", background: "#16302b", color: "#f9f7f1", cursor: "pointer" },
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 16 },
  monthNav: { display: "flex", alignItems: "center", gap: 10 },
  iconButton: { width: 36, height: 36, borderRadius: 12, border: "1px solid #e6dece", background: "#fffaf1", cursor: "pointer" },
  filters: { display: "flex", gap: 10, flexWrap: "wrap" },
  select: { padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd3c0", background: "#fffdf8" },
  weekHeader: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginTop: 16 },
  weekCell: { textAlign: "center", fontSize: 12, color: "#6f6658" },
  monthGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginTop: 8 },
  dayCell: { minHeight: 92, padding: 10, borderRadius: 16, border: "1px solid #ece4d5", background: "#fffdf8", textAlign: "left", cursor: "pointer" },
  dayCellActive: { minHeight: 92, padding: 10, borderRadius: 16, border: "1px solid #16302b", background: "#eef4f2", textAlign: "left", cursor: "pointer" },
  dayNumber: { fontSize: 13, fontWeight: 600 },
  dayAmount: { marginTop: 8, fontSize: 12, color: "#16302b" },
  dayDots: { display: "flex", gap: 4, marginTop: 8 },
  dotOverdue: { width: 8, height: 8, borderRadius: 999, background: "#d2663f" },
  dotPaid: { width: 8, height: 8, borderRadius: 999, background: "#79946b" },
  dotFinancial: { width: 8, height: 8, borderRadius: 999, background: "#2c5aa0" },
  dotOperating: { width: 8, height: 8, borderRadius: 999, background: "#16302b" },
  dayEmpty: { marginTop: 8, color: "#b7ad9d" },
  dayDetail: { marginTop: 16, paddingTop: 16, borderTop: "1px solid #ece4d5" },
  dayDetailTitle: { margin: 0, fontSize: 16 },
  agendaList: { display: "grid", gap: 12, marginTop: 12 },
  agendaItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, paddingBottom: 12, borderBottom: "1px solid #f0eadf" },
  meta: { margin: "6px 0 0", color: "#6f6658", fontSize: 13 },
  submeta: { margin: "4px 0 0", color: "#8b816f", fontSize: 12 },
  emptyText: { margin: "12px 0 0", color: "#6f6658" }
};
