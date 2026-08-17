import { useActivityContext } from "../../context/ActivityContext";
import styles from "./UsersCards.module.css";
import { useState } from "react";
import { Ban, ExternalLink, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import AsyncButton from "../AsyncButton/AsyncButton";
import UserStatusConfirmationModal from "../UserStatusConfirmationModal/UserStatusConfirmationModal";

const UsersCards = ({ user, blockUser, unBlockUser }) => {
  const { loadActivities } = useActivityContext();
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const isBlocked = user.status === "blocked";
  const isProtected = user.role !== "user";
  const fullName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
  const profilePath = `/userStats/${encodeURIComponent(user.email)}`;

  const handleUserAction = async () => {
    if (isUpdating || !pendingAction) return;
    setIsUpdating(true);

    try {
      const updated = pendingAction === "unblock"
        ? await unBlockUser(user.email)
        : await blockUser(user.email);

      if (updated) {
        await loadActivities();
      }
    } finally {
      setIsUpdating(false);
      setPendingAction(null);
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
            onClick={() =>
              setPendingAction(isBlocked ? "unblock" : "block")
            }
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

      <UserStatusConfirmationModal
        action={pendingAction}
        user={user}
        isUpdating={isUpdating}
        onClose={() => {
          if (!isUpdating) setPendingAction(null);
        }}
        onConfirm={handleUserAction}
      />
    </div>
  );
};

export default UsersCards;
