import { useActivityContext } from "../../context/ActivityContext";
import styles from "./UsersCards.module.css";
import { useState } from "react";

const UsersCards = ({ user, blockUser, unBlockUser }) => {
  const { loadActivities } = useActivityContext();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUserAction = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    if (user.status === "active") await blockUser(user.email);
    if (user.status === "blocked") await unBlockUser(user.email);
    await loadActivities();
    setIsUpdating(false);
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
          <button className={styles.action} onClick={handleUserAction} disabled={isUpdating}>
            {isUpdating ? "Updating..." : user.role === "user" && user.status === "active"
              ? "Block"
              : user.role === "user" && user.status === "blocked"
                ? "Unblock"
                : "Protected"}
          </button>
        )}
      </div>
    </div>
  );
};

export default UsersCards;
