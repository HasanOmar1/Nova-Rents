import styles from "./UsersCards.module.css";

const UsersCards = ({ user, blockUser, unBlockUser }) => {
  const handleUserAction = () => {
    if (user.status === "active") blockUser(user.email);
    if (user.status === "blocked") unBlockUser(user.email);
  };

  const fullName = user.firstName + " " + user.lastName;
  return (
    <div className={styles.UsersCards}>
      <p className={styles.name}>{fullName}</p>
      <p className={styles.email}>{user.email}</p>
      <p
        className={`${styles.status} ${user.status === "active" ? styles.active : styles.blocked}`}
      >
        {user.status}
      </p>
      <div className={styles.actionContainer}>
        {user.role === "admin" ? (
          <p className={`${styles.action} ${styles.protected}`}>Protected</p>
        ) : (
          <p className={styles.action} onClick={handleUserAction}>
            {user.role === "user" && user.status === "active"
              ? "Block"
              : user.role === "user" && user.status === "blocked"
                ? "Unblock"
                : "Protected"}
          </p>
        )}
      </div>
    </div>
  );
};

export default UsersCards;
