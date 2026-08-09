import styles from "./ComplaintsHistoryCards.module.css";

const STATUS_LABELS = {
  open: "Open",
  in_review: "In Review",
  resolved: "Resolved",
  closed: "Closed",
};

const formatStatusLabel = (status) =>
  STATUS_LABELS[status] || status || "Unknown";

const statusClassName = (status) => {
  if (status === "open") return styles.open;
  if (status === "in_review") return styles.inReview;
  if (status === "resolved") return styles.resolved;
  if (status === "closed") return styles.closed;
  return "";
};

const ComplaintsHistoryCards = ({
  title,
  status,
  targetLabel,
  targetValue,
  referenceValue,
  listedOwner,
  submittedDate,
  description,
  adminResponse,
}) => {
  return (
    <div className={styles.ComplaintsHistoryCards}>
      <div className={styles.titleAndStatusContainer}>
        <h5>{title}</h5>
        <p className={`${styles.status} ${statusClassName(status)}`}>
          {formatStatusLabel(status)}
        </p>
      </div>

      <p>
        <span className={styles.metaLabel}>{targetLabel}:</span> {targetValue}
      </p>

      {referenceValue && (
        <p>
          <span className={styles.metaLabel}>Reference:</span> {referenceValue}
        </p>
      )}

      {listedOwner && (
        <p>
          <span className={styles.metaLabel}>Listed owner:</span> {listedOwner}
        </p>
      )}

      <p>
        <span className={styles.metaLabel}>Submitted:</span> {submittedDate}
      </p>

      <p className={styles.description}>Description: {description}</p>

      {adminResponse && (
        <div className={styles.responseBlock}>
          <p className={styles.responseLabel}>Admin response</p>
          <p className={styles.responseText}>{adminResponse}</p>
        </div>
      )}
    </div>
  );
};

export default ComplaintsHistoryCards;
