import type { CSSProperties } from "react";
import type { ScheduledPayment } from "@shared/types/domain";
import { formatFlowType, formatPaymentDate, formatPaymentStatus, money } from "@frontend/lib/formatters";

export function PaymentCalendarEventCard(props: {
  event: ScheduledPayment;
  compact?: boolean;
  onOpenObligation?: (obligationId: string) => void;
}) {
  return (
    <button type="button" onClick={() => props.onOpenObligation?.(props.event.obligationId)} style={props.compact ? styles.cardCompact : styles.card}>
      <div style={styles.main}>
        <div style={styles.content}>
          <strong style={styles.title}>{props.event.title}</strong>
          <p style={styles.meta}>
            {formatPaymentDate(props.event.paymentDate)} / {formatPaymentStatus(props.event.status)}
          </p>
          <p style={styles.submeta}>{formatFlowType(props.event.flowType)} / {props.event.category}</p>
        </div>
        <div style={styles.side}>
          <strong style={styles.amount}>{money.format(props.event.amount)}</strong>
          <span style={statusStyle(props.event.status)}>{formatPaymentStatus(props.event.status)}</span>
        </div>
      </div>
    </button>
  );
}

function statusStyle(status: ScheduledPayment["status"]): CSSProperties {
  if (status === "overdue") return styles.statusOverdue;
  if (status === "paid") return styles.statusPaid;
  if (status === "needs_review") return styles.statusReview;
  return styles.statusPlanned;
}

const statusBase: CSSProperties = {
  padding: "6px 8px",
  borderRadius: 999,
  fontSize: 11,
  whiteSpace: "nowrap"
};

const styles: Record<string, CSSProperties> = {
  card: {
    width: "100%",
    padding: 14,
    borderRadius: 16,
    border: "1px solid #ece4d5",
    background: "#fffdf8",
    textAlign: "left",
    cursor: "pointer"
  },
  cardCompact: {
    width: "100%",
    padding: 12,
    borderRadius: 14,
    border: "1px solid #ece4d5",
    background: "#fffdf8",
    textAlign: "left",
    cursor: "pointer"
  },
  main: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  content: {
    minWidth: 0
  },
  title: {
    display: "block",
    fontSize: 14
  },
  meta: {
    margin: "6px 0 0",
    color: "#6f6658",
    fontSize: 12
  },
  submeta: {
    margin: "4px 0 0",
    color: "#8b816f",
    fontSize: 12
  },
  side: {
    display: "grid",
    justifyItems: "end",
    gap: 8
  },
  amount: {
    fontSize: 14,
    lineHeight: 1.2
  },
  statusPlanned: {
    ...statusBase,
    background: "#eef4f2",
    color: "#16302b"
  },
  statusPaid: {
    ...statusBase,
    background: "#ecf7ef",
    color: "#25613b"
  },
  statusOverdue: {
    ...statusBase,
    background: "#fff3ed",
    color: "#8a3f22"
  },
  statusReview: {
    ...statusBase,
    background: "#fff7e9",
    color: "#9a6518"
  }
};
