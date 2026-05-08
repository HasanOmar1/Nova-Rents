import styles from "./AdminComplaints.module.css";

const AdminComplaints = ({ title, description, state, type }) => {
  return (
    <div className={styles.AdminComplaints}>
      <div className={styles.top}>
        <h4>{title}</h4>
        <p
          className={`${styles.state} ${state === "Review" ? styles.review : styles.closed}`}
        >
          {state}
        </p>
      </div>
      <p className={styles.description}>
        {description} <span className={styles.type}>{type}</span>
      </p>
    </div>
  );
};

export default AdminComplaints;
