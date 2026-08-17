import { useActivityContext } from "../../context/ActivityContext";
import styles from "./UsersCards.module.css";
import { useState } from "react";
import { Ban, ExternalLink, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import AsyncButton from "../AsyncButton/AsyncButton";

const UsersCards = ({ user, blockUser, unBlockUser }) => {
  const { loadActivities } = useActivityContext();
  const [isUpdating, setIsUpdating] = useState(false);

  const isBlocked = user.status === "blocked";
  const isProtected = user.role !== "user";
  const fullName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
  const profilePath = `/userStats/${encodeURIComponent(user.email)}`;

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
      <Link
        className={styles.profileLink}
        to={profilePath}
        aria-label={`View ${fullName}'s profile`}
        title={`View ${fullName}'s profile`}
      />

      <p className={styles.name}>
        <span>{fullName}</span>
        <ExternalLink
          size={15}
          className={styles.profileIcon}
          aria-hidden="true"
        />
      </p>
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
