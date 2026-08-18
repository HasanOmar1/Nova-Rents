import { useId } from "react";
import { AlertTriangle, Ban, ShieldCheck, UserRound, X } from "lucide-react";
import AsyncButton from "../AsyncButton/AsyncButton";
import { useModalDialog } from "../../hooks/useModalDialog";
import styles from "./UserStatusConfirmationModal.module.css";

const UserStatusConfirmationModal = ({
  action,
  user,
  isUpdating,
  onClose,
  onConfirm,
}) => {
  const isOpen = Boolean(action && user);
  const isUnblock = action === "unblock";
  const dialogRef = useModalDialog(isOpen);
  const titleId = useId();
  const descriptionId = useId();

  if (!user) return null;

  const fullName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

  const handleCancel = (event) => {
    event.preventDefault();
    if (!isUpdating) onClose();
  };

  const handleDialogClick = (event) => {
    const dialog = dialogRef.current;
    if (!dialog || isUpdating) return;

    const bounds = dialog.getBoundingClientRect();
    const clickedBackdrop =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;

    if (clickedBackdrop) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.UserStatusConfirmationModal}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={handleCancel}
      onClick={handleDialogClick}
    >
      <div className={styles.content}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          disabled={isUpdating}
          aria-label="Close confirmation"
        >
          <X size={19} aria-hidden="true" />
        </button>

        <div
          className={`${styles.actionIcon} ${
            isUnblock ? styles.unblockIcon : styles.blockIcon
          }`}
          aria-hidden="true"
        >
          {isUnblock ? <ShieldCheck size={27} /> : <Ban size={27} />}
        </div>

        <p className={styles.eyebrow}>Account access</p>
        <h2 id={titleId}>
          {isUnblock
            ? "Are you sure you want to unblock this user?"
            : "Are you sure you want to block this user?"}
        </h2>
        <p id={descriptionId} className={styles.description}>
          {isUnblock
            ? "This account will regain access to Nova Rents."
            : "This account will lose access to restricted Nova Rents features until an admin unblocks it."}
        </p>

        <div className={styles.userSummary}>
          <span className={styles.userIcon} aria-hidden="true">
            <UserRound size={20} />
          </span>
          <span className={styles.userIdentity}>
            <strong>{fullName}</strong>
            <span>{user.email}</span>
          </span>
          <span
            className={`${styles.statusBadge} ${
              user.status === "blocked" ? styles.blocked : styles.active
            }`}
          >
            {user.status}
          </span>
        </div>

        <div
          className={`${styles.notice} ${
            isUnblock ? styles.unblockNotice : styles.blockNotice
          }`}
        >
          {isUnblock ? (
            <ShieldCheck size={18} aria-hidden="true" />
          ) : (
            <AlertTriangle size={18} aria-hidden="true" />
          )}
          <p>
            {isUnblock
              ? "Only restore access after confirming this account is allowed to use the platform."
              : "Existing account data will be preserved, and the account can be unblocked later."}
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isUpdating}
          >
            Cancel
          </button>
          <AsyncButton
            type="button"
            className={isUnblock ? styles.unblockButton : styles.blockButton}
            onClick={onConfirm}
            loading={isUpdating}
            loadingText={isUnblock ? "Unblocking..." : "Blocking..."}
          >
            {isUnblock ? (
              <ShieldCheck size={17} aria-hidden="true" />
            ) : (
              <Ban size={17} aria-hidden="true" />
            )}
            {isUnblock ? "Unblock account" : "Block account"}
          </AsyncButton>
        </div>
      </div>
    </dialog>
  );
};

export default UserStatusConfirmationModal;
