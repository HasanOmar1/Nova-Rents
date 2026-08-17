import styles from "./ComplaintsAdminCards.module.css";

const STATUS_LABELS = {
  open: "Open",
  in_review: "Under review",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_CLASSES = {
  open: styles.open,
  in_review: styles.inReview,
  resolved: styles.resolved,
  closed: styles.closed,
};

const ComplaintsAdminCards = ({
  type,
  title,
  target,
  owner,
  status,
  reporter,
  action,
  onReview,
}) => {
  const statusLabel = STATUS_LABELS[status] || status || "Unknown";
  const typeClass = type === "Vehicle" ? styles.vehicle : "";

  return (
    <div className={styles.ComplaintsAdminCards}>
      <p className={styles.typeCell} data-label="Type">
        <span className={`${styles.typeBadge} ${typeClass}`}>{type}</span>
      </p>
      <p className={styles.titleCell} data-label="Title" title={title}>
        {title}
      </p>
      <p className={styles.targetCell} data-label="Target" title={target}>
        {target}
      </p>
      <p className={styles.ownerCell} data-label="Listed owner" title={owner}>
        {owner}
      </p>
      <p className={styles.statusCell} data-label="Status">
        <span
          className={`${styles.statusBadge} ${STATUS_CLASSES[status] || ""}`}
        >
          {statusLabel}
        </span>
      </p>
      <p
        className={styles.reporterCell}
        data-label="Reporter"
        title={reporter}
      >
        {reporter}
      </p>
      <button
        type="button"
        className={styles.action}
        onClick={onReview}
        aria-label={`Review complaint: ${title}`}
      >
        {action}
      </button>
    </div>
  );
};

export default ComplaintsAdminCards;
