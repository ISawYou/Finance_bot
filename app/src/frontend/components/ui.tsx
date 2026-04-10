import type { CSSProperties } from "react";

export function MetricCard(props: {
  label: string;
  value: string;
  tone: "default" | "accent" | "alert";
  hint?: string;
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
      {props.hint ? <p style={styles.metricHint}>{props.hint}</p> : null}
    </article>
  );
}

export function StateCard(props: { title: string; description: string; tone: "error" | "empty" }) {
  const toneStyle = props.tone === "error" ? styles.stateError : styles.stateEmpty;

  return (
    <div style={{ ...styles.stateCard, ...toneStyle }}>
      <strong style={styles.stateTitle}>{props.title}</strong>
      <p style={styles.stateText}>{props.description}</p>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div style={styles.list}>
      {Array.from({ length: 3 }).map((_, index) => (
        <article key={index} style={styles.listItem}>
          <div style={styles.skeletonBlock}>
            <div style={{ ...styles.skeletonLine, width: 150 }} />
            <div style={{ ...styles.skeletonLine, width: 96 }} />
          </div>
          <div style={{ ...styles.skeletonLine, width: 72 }} />
        </article>
      ))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  metricCard: {
    padding: 16,
    borderRadius: 20,
    background: "#fffdf8",
    border: "1px solid #ece4d5",
    minHeight: 108
  },
  metricCardAccent: {
    padding: 16,
    borderRadius: 20,
    background: "#16302b",
    color: "#f9f7f1",
    border: "1px solid #16302b",
    minHeight: 108
  },
  metricCardAlert: {
    padding: 16,
    borderRadius: 20,
    background: "#fff3ed",
    border: "1px solid #f4c9b8",
    minHeight: 108
  },
  metricLabel: {
    margin: 0,
    color: "inherit",
    opacity: 0.8,
    fontSize: 13
  },
  metricValue: {
    display: "block",
    marginTop: 8,
    fontSize: 24,
    lineHeight: 1.1
  },
  metricHint: {
    margin: "8px 0 0",
    fontSize: 12,
    opacity: 0.8
  },
  stateCard: {
    marginTop: 12,
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
  stateTitle: {
    display: "block",
    fontSize: 15
  },
  stateText: {
    margin: "8px 0 0",
    color: "#6f6658",
    lineHeight: 1.5,
    fontSize: 14
  },
  list: {
    display: "grid",
    gap: 12,
    marginTop: 12
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "10px 0",
    borderBottom: "1px solid #f0eadf"
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
