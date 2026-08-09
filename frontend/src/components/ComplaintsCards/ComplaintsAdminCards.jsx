import styles from "./ComplaintsAdminCards.module.css";

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
  return (
    <div className={styles.ComplaintsAdminCards}>
      <p className={styles.type}>{type}</p>
      <p className={styles.title} title={title}>
        {title}
      </p>
      <p className={styles.target}>{target}</p>
      <p className={styles.owner}>{owner}</p>
      <p className={styles.status}>
        {status === "in_review"
          ? "Under_Review".toUpperCase()
          : status.toUpperCase()}
      </p>
      <p className={styles.reporter}>{reporter}</p>
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
