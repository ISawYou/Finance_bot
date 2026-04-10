import type { CSSProperties } from "react";
import type { OwnerDashboardOverview } from "@shared/types/domain";
import { formatPaymentDate, money } from "@frontend/lib/formatters";
import { ListSkeleton, MetricCard, StateCard } from "./ui";

export function DashboardScreen(props: {
  overview: OwnerDashboardOverview | null;
  loading: boolean;
  error: string | null;
}) {
  const summary = props.overview?.summary;
  const balances = props.overview?.balances ?? [];
  const upcoming = props.overview?.upcoming ?? [];
  const isEmpty = !props.loading && !props.error && balances.length === 0 && upcoming.length === 0;

  return (
    <>
      <section style={styles.grid}>
        <MetricCard label="Total Cash" value={props.loading ? "..." : money.format(summary?.totalCash ?? 0)} tone="accent" />
        <MetricCard label="Required 7 Days" value={props.loading ? "..." : money.format(summary?.weekRequiredAmount ?? 0)} tone="default" />
        <MetricCard label="Required Month" value={props.loading ? "..." : money.format(summary?.monthRequiredAmount ?? 0)} tone="default" />
        <MetricCard label="After 7 Days" value={props.loading ? "..." : money.format(summary?.projectedCashAfterWeek ?? 0)} tone="default" />
        <MetricCard label="After Month" value={props.loading ? "..." : money.format(summary?.projectedCashAfterMonth ?? 0)} tone="alert" />
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Bank balances</h2>
            <p style={styles.sectionHint}>Current balances by account, used as the live cash base for the dashboard.</p>
          </div>
        </div>

        {props.loading ? (
          <ListSkeleton />
        ) : props.error ? (
          <StateCard title="Could not load dashboard" description={props.error} tone="error" />
        ) : isEmpty ? (
          <StateCard title="No cash data yet" description="Add bank integration or cached balances to see available money." tone="empty" />
        ) : (
          <div style={styles.list}>
            {balances.map((item) => (
              <article key={item.bankAccountId} style={styles.listItem}>
                <div>
                  <strong>{item.accountName}</strong>
                  <p style={styles.listMeta}>
                    {item.bankName}{item.accountNumberMask ? ` / ${item.accountNumberMask}` : ""}
                  </p>
                  <p style={styles.secondaryMeta}>
                    {item.currency} / Updated {formatBalanceAt(item.balanceAt)}
                  </p>
                </div>
                <strong>{money.format(item.amount)}</strong>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Upcoming required payments</h2>
            <p style={styles.sectionHint}>The most relevant planned payouts for the owner view.</p>
          </div>
        </div>

        {props.loading ? (
          <ListSkeleton />
        ) : props.error ? (
          <StateCard title="Could not load payments" description={props.error} tone="error" />
        ) : upcoming.length === 0 ? (
          <StateCard title="No required payments" description="There are no required scheduled payments in the current view." tone="empty" />
        ) : (
          <div style={styles.list}>
            {upcoming.map((payment) => (
              <article key={payment.id} style={styles.listItem}>
                <div>
                  <strong>{payment.title}</strong>
                  <p style={styles.listMeta}>
                    {formatPaymentDate(payment.paymentDate)} / {labelStatus(payment.status)}
                  </p>
                  <p style={styles.secondaryMeta}>
                    {payment.flowType} / {payment.category}
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

function labelStatus(status: OwnerDashboardOverview["upcoming"][number]["status"]) {
  if (status === "overdue") return "Overdue";
  if (status === "paid") return "Paid";
  if (status === "needs_review") return "Needs review";
  if (status === "cancelled") return "Cancelled";
  return "Planned";
}

function formatBalanceAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
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
  }
};
