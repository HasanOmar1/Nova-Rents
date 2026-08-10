import { useActivityContext } from "../../context/ActivityContext";
import styles from "./UsersCards.module.css";
import { useState } from "react";
import { Ban, LockKeyhole, ShieldCheck } from "lucide-react";
import AsyncButton from "../AsyncButton/AsyncButton";

const UsersCards = ({ user, blockUser, unBlockUser }) => {
  const { loadActivities } = useActivityContext();
  const [isUpdating, setIsUpdating] = useState(false);

  const isBlocked = user.status === "blocked";
  const isProtected = user.role !== "user";
  const fullName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

  const handleUserAction = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const updated = isBlocked
        ? await unBlockUser(user.email)
        : await blockUser(user.email);

      if (updated) {
        await loadActivities();
      }
    } finally {
      setIsUpdating(false);
    }
  };

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
        {isProtected ? (
          <span
            className={`${styles.action} ${styles.protected}`}
            aria-label={`${fullName} is a protected account`}
          >
            <LockKeyhole size={16} aria-hidden="true" />
            Protected
          </span>
        ) : (
          <AsyncButton
            type="button"
            className={`${styles.action} ${
              isBlocked ? styles.unblockAction : styles.blockAction
            }`}
            onClick={handleUserAction}
            loading={isUpdating}
            loadingText={isBlocked ? "Unblocking..." : "Blocking..."}
            aria-label={`${isBlocked ? "Unblock" : "Block"} ${fullName}`}
          >
            {isBlocked ? (
              <ShieldCheck size={16} aria-hidden="true" />
            ) : (
              <Ban size={16} aria-hidden="true" />
            )}
            {isBlocked ? "Unblock" : "Block"}
          </AsyncButton>
        )}
      </div>
    </div>
  );
};

export default UsersCards;
