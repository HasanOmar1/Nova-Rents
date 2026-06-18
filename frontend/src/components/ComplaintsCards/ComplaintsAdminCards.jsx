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
      <p className={styles.title}>{title}</p>
      <p className={styles.target}>{target}</p>
      <p className={styles.owner}>{owner}</p>
      <p className={styles.status}>{status}</p>
      <p className={styles.reporter}>{reporter}</p>
      <button
        type="button"
        className={styles.action}
        onClick={onReview}
      >
        {action}
      </button>
    </div>
    
  );
};

export default ComplaintsAdminCards;
