import type { CSSProperties } from "react";
import type { OwnerDashboardOverview } from "@shared/types/domain";
import { formatDateTime, money } from "@frontend/lib/formatters";
import { ListSkeleton, MetricCard, StateCard } from "./ui";

export function MoneyScreen(props: {
  overview: OwnerDashboardOverview | null;
  loading: boolean;
  error: string | null;
}) {
  const balances = props.overview?.balances ?? [];
  const summary = props.overview?.summary;

  return (
    <>
      <section style={styles.grid}>
        <MetricCard label="Всего денег" value={props.loading ? "..." : money.format(summary?.totalCash ?? 0)} tone="accent" />
        <MetricCard label="После 7 дней" value={props.loading ? "..." : money.format(summary?.projectedCashAfterWeek ?? 0)} tone="default" />
        <MetricCard label="После месяца" value={props.loading ? "..." : money.format(summary?.projectedCashAfterMonth ?? 0)} tone="alert" />
      </section>

      <section style={styles.card}>
        <h2 style={styles.title}>Счета и остатки</h2>
        <p style={styles.hint}>Актуальные остатки по банковским счетам компании.</p>
        {props.loading ? (
          <ListSkeleton />
        ) : props.error ? (
          <StateCard title="Не удалось загрузить остатки" description={props.error} tone="error" />
        ) : balances.length === 0 ? (
          <StateCard title="Остатков пока нет" description="Подключите банк или дождитесь первой синхронизации." tone="empty" />
        ) : (
          <div style={styles.list}>
            {balances.map((item) => (
              <article key={item.bankAccountId} style={styles.row}>
                <div>
                  <strong>{item.accountName}</strong>
                  <p style={styles.meta}>{item.bankName}{item.accountNumberMask ? ` / ${item.accountNumberMask}` : ""}</p>
                  <p style={styles.submeta}>Обновлено {formatDateTime(item.balanceAt)}</p>
                </div>
                <strong>{money.format(item.amount)}</strong>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  grid: { display: "grid", gridTemplateColumns: "repeat(1, minmax(0, 1fr))", gap: 12, marginTop: 12 },
  card: { marginTop: 12, padding: 16, borderRadius: 20, background: "#ffffff", border: "1px solid #ece4d5" },
  title: { margin: 0, fontSize: 18 },
  hint: { margin: "6px 0 0", color: "#6f6658", fontSize: 13 },
  list: { display: "grid", gap: 12, marginTop: 12 },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingBottom: 12, borderBottom: "1px solid #f0eadf" },
  meta: { margin: "6px 0 0", color: "#6f6658", fontSize: 13 },
  submeta: { margin: "4px 0 0", color: "#8b816f", fontSize: 12 }
};
