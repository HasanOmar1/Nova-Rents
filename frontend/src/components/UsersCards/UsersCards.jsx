import styles from "./UsersCards.module.css";

const UsersCards = ({ name, email, action, status }) => {
  return (
    <div className={styles.UsersCards}>
      <p className={styles.name}>{name}</p>
      <p className={styles.email}>{email}</p>
      <p
        className={`${styles.status} ${status === "Active" ? styles.active : styles.blocked}`}
      >
        {status}
      </p>
      <div className={styles.actionContainer}>
        <p
          className={`${styles.action} ${action === "admin" && styles.protected}`}
        >
          {action === "user" && status === "Active"
            ? "Block"
            : action === "user" && status === "Blocked"
              ? "Unblock"
              : "Protected"}
        </p>
      </div>
    </div>
  );
};

export default UsersCards;
