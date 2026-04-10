import type { CSSProperties } from "react";
import type { CalendarOverview } from "@frontend/lib/api";
import { formatPaymentDate, money } from "@frontend/lib/formatters";
import { ListSkeleton, MetricCard, StateCard } from "./ui";

export function DashboardScreen(props: {
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
        <MetricCard label="Сегодня" value={props.loading ? "..." : money.format(summary?.todayAmount ?? 0)} tone="default" />
        <MetricCard label="7 дней" value={props.loading ? "..." : money.format(summary?.weekAmount ?? 0)} tone="accent" />
        <MetricCard label="Месяц" value={props.loading ? "..." : money.format(summary?.monthAmount ?? 0)} tone="default" />
        <MetricCard label="Просрочено" value={props.loading ? "..." : String(summary?.overdueCount ?? 0)} tone="alert" />
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Ближайшие платежи</h2>
            <p style={styles.sectionHint}>Сумма, дата, поток денег и категория.</p>
          </div>
        </div>

        {props.loading ? (
          <ListSkeleton />
        ) : props.error ? (
          <StateCard title="Не удалось загрузить данные" description={props.error} tone="error" />
        ) : isEmpty ? (
          <StateCard title="Ближайших выплат нет" description="На сегодня и ближайший период обязательных платежей не найдено." tone="empty" />
        ) : (
          <div style={styles.list}>
            {upcoming.map((payment) => (
              <article key={payment.id} style={styles.listItem}>
                <div>
                  <strong>{payment.title}</strong>
                  <p style={styles.listMeta}>
                    {formatPaymentDate(payment.paymentDate)} · {getPaymentStatusLabel(payment.status)}
                  </p>
                  <p style={styles.secondaryMeta}>
                    {payment.flowType} · {payment.category}
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

const styles: Record<string, CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
    marginTop: 16
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
  listMeta: {
    margin: "6px 0 0",
    color: "#6f6658",
    fontSize: 13
  },
  secondaryMeta: {
    margin: "4px 0 0",
    color: "#8b816f",
    fontSize: 12
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
  }
};
