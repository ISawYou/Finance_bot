import type { CSSProperties } from "react";
import type { OwnerDashboardOverview } from "@shared/types/domain";
import { formatFlowType, formatPaymentDate, formatPaymentStatus, money } from "@frontend/lib/formatters";
import { ListSkeleton, MetricCard, StateCard } from "./ui";

export function DashboardScreen(props: {
  overview: OwnerDashboardOverview | null;
  loading: boolean;
  error: string | null;
}) {
  const summary = props.overview?.summary;
  const upcoming = props.overview?.upcoming ?? [];

  return (
    <>
      <section style={styles.grid}>
        <MetricCard label="Всего денег" value={props.loading ? "..." : money.format(summary?.totalCash ?? 0)} tone="accent" hint="Все счета компании" />
        <MetricCard label="Обязательные 7 дней" value={props.loading ? "..." : money.format(summary?.weekRequiredAmount ?? 0)} tone="default" hint="Ближайшие обязательные выплаты" />
        <MetricCard label="Обязательные за месяц" value={props.loading ? "..." : money.format(summary?.monthRequiredAmount ?? 0)} tone="default" hint="Текущий месяц" />
        <MetricCard label="После выплат 7 дней" value={props.loading ? "..." : money.format(summary?.projectedCashAfterWeek ?? 0)} tone="default" />
        <MetricCard label="После выплат месяца" value={props.loading ? "..." : money.format(summary?.projectedCashAfterMonth ?? 0)} tone="alert" />
      </section>

      <section style={styles.card}>
        <h2 style={styles.title}>Ближайшие обязательные выплаты</h2>
        <p style={styles.hint}>Ключевые платежи, которые влияют на остаток денег.</p>
        {props.loading ? (
          <ListSkeleton />
        ) : props.error ? (
          <StateCard title="Не удалось загрузить главную" description={props.error} tone="error" />
        ) : upcoming.length === 0 ? (
          <StateCard title="Ближайших выплат нет" description="На ближайший период обязательных платежей не найдено." tone="empty" />
        ) : (
          <div style={styles.list}>
            {upcoming.map((payment) => (
              <article key={payment.id} style={styles.row}>
                <div>
                  <strong>{payment.title}</strong>
                  <p style={styles.meta}>
                    {formatPaymentDate(payment.paymentDate)} / {formatPaymentStatus(payment.status)}
                  </p>
                  <p style={styles.submeta}>
                    {formatFlowType(payment.flowType)} / {payment.category}
                  </p>
                </div>
                <strong>{money.format(payment.amount)}</strong>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
    gap: 12,
    marginTop: 12
  },
  card: {
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    background: "#ffffff",
    border: "1px solid #ece4d5"
  },
  title: {
    margin: 0,
    fontSize: 18
  },
  hint: {
    margin: "6px 0 0",
    color: "#6f6658",
    fontSize: 13
  },
  list: {
    display: "grid",
    gap: 12,
    marginTop: 12
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
    borderBottom: "1px solid #f0eadf"
  },
  meta: {
    margin: "6px 0 0",
    color: "#6f6658",
    fontSize: 13
  },
  submeta: {
    margin: "4px 0 0",
    color: "#8b816f",
    fontSize: 12
  }
};
