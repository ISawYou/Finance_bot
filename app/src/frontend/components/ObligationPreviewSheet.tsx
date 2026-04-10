import type { CSSProperties } from "react";
import type { ObligationDetails } from "@frontend/lib/api";
import { formatFlowType, formatObligationStatus, formatPaymentDate, formatPaymentStatus, formatRecurrenceType, money } from "@frontend/lib/formatters";
import { ListSkeleton, StateCard } from "./ui";

export function ObligationPreviewSheet(props: {
  open: boolean;
  loading: boolean;
  error: string | null;
  details: ObligationDetails | null;
  onClose: () => void;
}) {
  if (!props.open) {
    return null;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.scrim} onClick={props.onClose} />
      <section style={styles.sheet}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.title}>Обязательство</h3>
            <p style={styles.subtitle}>Быстрый просмотр из календаря</p>
          </div>
          <button type="button" onClick={props.onClose} style={styles.closeButton}>
            Закрыть
          </button>
        </div>

        {props.loading ? (
          <ListSkeleton />
        ) : props.error ? (
          <StateCard title="Не удалось открыть обязательство" description={props.error} tone="error" />
        ) : !props.details ? (
          <StateCard title="Данных пока нет" description="Попробуйте открыть событие ещё раз." tone="empty" />
        ) : (
          <>
            <div style={styles.top}>
              <div>
                <strong style={styles.name}>{props.details.item.title}</strong>
                <p style={styles.meta}>
                  {formatFlowType(props.details.item.flowType)} / {props.details.item.category}
                </p>
              </div>
              <span style={styles.status}>{formatObligationStatus(props.details.activityStatus)}</span>
            </div>

            <div style={styles.grid}>
              <Info label="Сумма" value={money.format(props.details.item.amount)} />
              <Info label="Периодичность" value={formatRecurrenceType(props.details.item.recurrenceType)} />
              <Info label="Ближайший платёж" value={props.details.item.nextPaymentDate ? formatPaymentDate(props.details.item.nextPaymentDate) : "Не задан"} />
              <Info label="Тип" value={props.details.item.type} />
            </div>

            {props.details.item.comment ? <p style={styles.comment}>{props.details.item.comment}</p> : null}

            <div style={styles.block}>
              <h4 style={styles.blockTitle}>Ближайшие платежи</h4>
              {props.details.upcomingPayments.length === 0 ? (
                <StateCard title="Платежей пока нет" description="Для этого обязательства нет ближайших planned payments." tone="empty" />
              ) : (
                <div style={styles.list}>
                  {props.details.upcomingPayments.map((payment) => (
                    <article key={payment.id} style={styles.row}>
                      <div>
                        <strong>{formatPaymentDate(payment.paymentDate)}</strong>
                        <p style={styles.meta}>{formatPaymentStatus(payment.status)}</p>
                      </div>
                      <strong>{money.format(payment.amount)}</strong>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Info(props: { label: string; value: string }) {
  return (
    <div style={styles.info}>
      <span style={styles.infoLabel}>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 30
  },
  scrim: {
    position: "absolute",
    inset: 0,
    background: "rgba(19, 24, 23, 0.32)"
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "82vh",
    overflowY: "auto",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    background: "#fffaf3",
    padding: "18px 16px calc(22px + env(safe-area-inset-bottom))",
    boxShadow: "0 -10px 24px rgba(17, 21, 20, 0.16)"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  closeButton: {
    minHeight: 42,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid #ddd3c0",
    background: "#fffdf8",
    cursor: "pointer"
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 16
  },
  name: {
    display: "block",
    fontSize: 17
  },
  meta: {
    margin: "6px 0 0",
    color: "#6f6658",
    fontSize: 13
  },
  status: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#eef4f2",
    color: "#16302b",
    fontSize: 12
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
    marginTop: 16
  },
  info: {
    display: "grid",
    gap: 4,
    padding: 12,
    borderRadius: 14,
    border: "1px solid #ece4d5",
    background: "#ffffff"
  },
  infoLabel: {
    fontSize: 12,
    color: "#8b816f",
    textTransform: "uppercase"
  },
  comment: {
    margin: "14px 0 0",
    padding: 12,
    borderRadius: 14,
    background: "#ffffff",
    border: "1px solid #ece4d5",
    color: "#4c463d",
    lineHeight: 1.5
  },
  block: {
    marginTop: 18
  },
  blockTitle: {
    margin: 0,
    fontSize: 15
  },
  list: {
    display: "grid",
    gap: 10,
    marginTop: 12
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingBottom: 10,
    borderBottom: "1px solid #f0eadf"
  }
};
