import styles from "./ComplaintsHistoryCards.module.css";

const ComplaintsHistoryCards = ({
  title,
  status,
  relatedVehOrOwner,
  date,
  type,
  owner,
  description,
}) => {
  return (
    <div className={styles.ComplaintsHistoryCards}>
      <div className={styles.titleAndStatusContainer}>
        <h5>{title}</h5>
        <p
          className={`${styles.status} ${status === "Closed" && styles.closed}`}
        >
          {status}
        </p>
      </div>
      <p>
        {type === "vehicle" ? "Vehicle: " : "User: "} {relatedVehOrOwner} ·{" "}
        {date}
      </p>

      <p>Listed owner: {owner}</p>

      <p className={styles.description}>{description}</p>
    </div>
  );
};

export default ComplaintsHistoryCards;
