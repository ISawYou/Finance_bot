import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { FlowType, PaymentStatus } from "@shared/types/domain";
import { getCalendarEvents, getObligationDetails, type CalendarEventsResponse, type ObligationDetails } from "@frontend/lib/api";
import { formatFlowType, formatMonthLabel, formatPaymentDate, money } from "@frontend/lib/formatters";
import { ListSkeleton, StateCard } from "./ui";
import { ObligationPreviewSheet } from "./ObligationPreviewSheet";
import { PaymentCalendarEventCard } from "./PaymentCalendarEventCard";

type ViewMode = "month" | "agenda";

const statusOptions: Array<{ value: PaymentStatus | "all"; label: string }> = [
  { value: "all", label: "Все" },
  { value: "planned", label: "Запланировано" },
  { value: "overdue", label: "Просрочено" },
  { value: "paid", label: "Оплачено" },
  { value: "needs_review", label: "Проверить" }
];

const flowOptions: Array<{ value: FlowType | "all"; label: string }> = [
  { value: "all", label: "Все потоки" },
  { value: "operating", label: "Операционный" },
  { value: "financial", label: "Финансовый" },
  { value: "tax", label: "Налоги" },
  { value: "payroll", label: "ФОТ" },
  { value: "investing", label: "Инвестиции" }
];

export function PaymentCalendarScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [status, setStatus] = useState<PaymentStatus | "all">("all");
  const [flowType, setFlowType] = useState<FlowType | "all">("all");
  const [data, setData] = useState<CalendarEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewDetails, setPreviewDetails] = useState<ObligationDetails | null>(null);

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
        setSelectedDate((current) => {
          const next = current && response.items.some((item) => item.paymentDate === current)
            ? current
            : response.items[0]?.paymentDate ?? range.dateFrom;
          return next;
        });
      })
      .catch(() => setError("Не удалось загрузить календарь платежей."))
      .finally(() => setLoading(false));
  }, [range.dateFrom, range.dateTo, status, flowType]);

  const items = data?.items ?? [];
  const groupedByDate = groupByDate(items);
  const selectedItems = selectedDate ? groupedByDate.get(selectedDate) ?? [] : [];
  const days = buildMonthGrid(currentMonth);
  const agendaGroups = buildAgendaGroups(items);

  async function openObligationPreview(obligationId: string) {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewDetails(null);

    try {
      const details = await getObligationDetails(obligationId);
      setPreviewDetails(details);
    } catch {
      setPreviewError("Не удалось загрузить обязательство из календаря.");
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <>
      <section style={styles.card}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Календарь</h2>
            <p style={styles.subtitle}>Платёжный календарь для контроля ближайших денег.</p>
          </div>
          <div style={styles.viewSwitch}>
            <button type="button" onClick={() => setViewMode("month")} style={viewMode === "month" ? styles.viewActive : styles.viewButton}>
              Месяц
            </button>
            <button type="button" onClick={() => setViewMode("agenda")} style={viewMode === "agenda" ? styles.viewActive : styles.viewButton}>
              Лента
            </button>
          </div>
        </div>

        <div style={styles.monthNav}>
          <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} style={styles.navButton}>
            Назад
          </button>
          <strong>{formatMonthLabel(currentMonth)}</strong>
          <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={styles.navButton}>
            Вперёд
          </button>
        </div>

        <div style={styles.filtersBlock}>
          <div style={styles.filterRow}>
            {statusOptions.map((option) => (
              <button key={option.value} type="button" onClick={() => setStatus(option.value)} style={status === option.value ? styles.filterChipActive : styles.filterChip}>
                {option.label}
              </button>
            ))}
          </div>
          <div style={styles.filterRow}>
            {flowOptions.map((option) => (
              <button key={option.value} type="button" onClick={() => setFlowType(option.value)} style={flowType === option.value ? styles.filterChipActive : styles.filterChip}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <ListSkeleton />
        ) : error ? (
          <StateCard title="Календарь недоступен" description={error} tone="error" />
        ) : viewMode === "month" ? (
          <>
            <MonthView days={days} groupedByDate={groupedByDate} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            <DayDetail date={selectedDate} items={selectedItems} onOpenObligation={openObligationPreview} />
          </>
        ) : (
          <AgendaView groups={agendaGroups} onOpenObligation={openObligationPreview} />
        )}
      </section>

      <ObligationPreviewSheet
        open={previewOpen}
        loading={previewLoading}
        error={previewError}
        details={previewDetails}
        onClose={() => setPreviewOpen(false)}
      />
    </>
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
          const dayItems = props.groupedByDate.get(iso) ?? [];
          const total = dayItems.reduce((sum, item) => sum + item.amount, 0);
          const inCurrentMonth = day.getUTCMonth() === new Date(`${props.days[15].toISOString().slice(0, 7)}-01T00:00:00Z`).getUTCMonth();

          return (
            <button key={iso} type="button" onClick={() => props.onSelectDate(iso)} style={props.selectedDate === iso ? styles.dayActive : styles.dayCell}>
              <div style={{ ...styles.dayNumber, opacity: inCurrentMonth ? 1 : 0.42 }}>{day.getUTCDate()}</div>
              {dayItems.length ? (
                <>
                  <div style={styles.dayAmount}>{money.format(total)}</div>
                  <div style={styles.dayDots}>
                    {dayItems.slice(0, 3).map((item) => (
                      <span key={item.id} style={dotStyle(item.status, item.flowType)} />
                    ))}
                  </div>
                </>
              ) : (
                <div style={styles.dayEmpty}>Нет</div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

function DayDetail(props: {
  date: string | null;
  items: CalendarEventsResponse["items"];
  onOpenObligation: (obligationId: string) => void;
}) {
  const total = props.items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div style={styles.dayPanel}>
      <div style={styles.dayHeader}>
        <div>
          <h3 style={styles.dayTitle}>{props.date ? formatPaymentDate(props.date) : "Выберите день"}</h3>
          <p style={styles.dayHint}>{props.items.length ? `${props.items.length} платежа / ${money.format(total)}` : "На этот день платежей нет"}</p>
        </div>
      </div>

      {!props.items.length ? (
        <StateCard title="На этот день пусто" description="Выберите другой день в календаре." tone="empty" />
      ) : (
        <div style={styles.eventsStack}>
          {props.items.map((item) => (
            <PaymentCalendarEventCard key={item.id} event={item} onOpenObligation={props.onOpenObligation} />
          ))}
        </div>
      )}
    </div>
  );
}

function AgendaView(props: {
  groups: Array<{ date: string; total: number; items: CalendarEventsResponse["items"] }>;
  onOpenObligation: (obligationId: string) => void;
}) {
  if (!props.groups.length) {
    return <StateCard title="Платежей не найдено" description="Измените фильтры или месяц, чтобы увидеть события." tone="empty" />;
  }

  return (
    <div style={styles.agendaGroups}>
      {props.groups.map((group) => (
        <section key={group.date} style={styles.groupCard}>
          <div style={styles.groupHeader}>
            <div>
              <strong>{formatPaymentDate(group.date)}</strong>
              <p style={styles.groupMeta}>{group.items.length} платежа</p>
            </div>
            <strong>{money.format(group.total)}</strong>
          </div>
          <div style={styles.eventsStack}>
            {group.items.map((item) => (
              <PaymentCalendarEventCard key={item.id} event={item} compact onOpenObligation={props.onOpenObligation} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function buildAgendaGroups(items: CalendarEventsResponse["items"]) {
  const grouped = groupByDate(items);
  return Array.from(grouped.entries()).map(([date, dayItems]) => ({
    date,
    total: dayItems.reduce((sum, item) => sum + item.amount, 0),
    items: dayItems
  }));
}

function groupByDate(items: CalendarEventsResponse["items"]) {
  const map = new Map<string, CalendarEventsResponse["items"]>();
  for (const item of items) {
    const bucket = map.get(item.paymentDate) ?? [];
    bucket.push(item);
    map.set(item.paymentDate, bucket);
  }
  return new Map(Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)));
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

function dotStyle(status: PaymentStatus, flowType: FlowType): CSSProperties {
  if (status === "overdue") return styles.dotOverdue;
  if (status === "paid") return styles.dotPaid;
  if (flowType === "financial") return styles.dotFinancial;
  if (flowType === "tax") return styles.dotTax;
  return styles.dotOperating;
}

const dotBase: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: 999
};

const styles: Record<string, CSSProperties> = {
  card: {
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    background: "#ffffff",
    border: "1px solid #ece4d5"
  },
  header: {
    display: "grid",
    gap: 12
  },
  title: {
    margin: 0,
    fontSize: 18
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#6f6658",
    fontSize: 13
  },
  viewSwitch: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8
  },
  viewButton: {
    minHeight: 44,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid #e6dece",
    background: "#fffaf1",
    cursor: "pointer"
  },
  viewActive: {
    minHeight: 44,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid #16302b",
    background: "#16302b",
    color: "#f9f7f1",
    cursor: "pointer"
  },
  monthNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 14
  },
  navButton: {
    minHeight: 42,
    padding: "0 14px",
    borderRadius: 14,
    border: "1px solid #e6dece",
    background: "#fffaf1",
    cursor: "pointer"
  },
  filtersBlock: {
    display: "grid",
    gap: 10,
    marginTop: 14
  },
  filterRow: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 2
  },
  filterChip: {
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #e6dece",
    background: "#fffaf1",
    whiteSpace: "nowrap",
    cursor: "pointer"
  },
  filterChipActive: {
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #16302b",
    background: "#16302b",
    color: "#f9f7f1",
    whiteSpace: "nowrap",
    cursor: "pointer"
  },
  weekHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 6,
    marginTop: 16
  },
  weekCell: {
    textAlign: "center",
    fontSize: 12,
    color: "#6f6658"
  },
  monthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 6,
    marginTop: 8
  },
  dayCell: {
    minHeight: 82,
    padding: 8,
    borderRadius: 14,
    border: "1px solid #ece4d5",
    background: "#fffdf8",
    textAlign: "left",
    cursor: "pointer"
  },
  dayActive: {
    minHeight: 82,
    padding: 8,
    borderRadius: 14,
    border: "1px solid #16302b",
    background: "#eef4f2",
    textAlign: "left",
    cursor: "pointer"
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: 600
  },
  dayAmount: {
    marginTop: 6,
    fontSize: 11,
    color: "#16302b",
    lineHeight: 1.2
  },
  dayDots: {
    display: "flex",
    gap: 4,
    marginTop: 6
  },
  dotOverdue: {
    ...dotBase,
    background: "#d2663f"
  },
  dotPaid: {
    ...dotBase,
    background: "#79946b"
  },
  dotFinancial: {
    ...dotBase,
    background: "#2c5aa0"
  },
  dotTax: {
    ...dotBase,
    background: "#8a4fa8"
  },
  dotOperating: {
    ...dotBase,
    background: "#16302b"
  },
  dayEmpty: {
    marginTop: 6,
    color: "#b7ad9d",
    fontSize: 11
  },
  dayPanel: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid #ece4d5"
  },
  dayHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  dayTitle: {
    margin: 0,
    fontSize: 16
  },
  dayHint: {
    margin: "6px 0 0",
    color: "#6f6658",
    fontSize: 13
  },
  eventsStack: {
    display: "grid",
    gap: 10,
    marginTop: 12
  },
  agendaGroups: {
    display: "grid",
    gap: 12,
    marginTop: 12
  },
  groupCard: {
    padding: 14,
    borderRadius: 18,
    background: "#fcfaf5",
    border: "1px solid #ece4d5"
  },
  groupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  groupMeta: {
    margin: "6px 0 0",
    color: "#6f6658",
    fontSize: 13
  }
};
