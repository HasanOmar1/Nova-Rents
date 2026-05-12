import styles from "./ComplaintsAdminCards.module.css";

const ComplaintsAdminCards = ({
  type,
  title,
  target,
  owner,
  status,
  reporter,
  action,
}) => {
  return (
    <div className={styles.ComplaintsAdminCards}>
      <p className={styles.type}>{type}</p>
      <p className={styles.title}>{title}</p>
      <p className={styles.target}>{target}</p>
      <p className={styles.owner}>{owner}</p>
      <p className={styles.status}>{status}</p>
      <p className={styles.reporter}>{reporter}</p>
      <p className={styles.action}>{action}</p>
    </div>
  );
};

export default ComplaintsAdminCards;
