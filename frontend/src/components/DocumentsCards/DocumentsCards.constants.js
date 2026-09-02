// Defines constants used by the documents cards interface.
// It exports stable configuration data for related components and helpers.
import styles from "./DocumentsCards.module.css";

export const STATUS_CLASS = {
  not_uploaded: styles.notUploaded,
  pending_review: styles.pending,
  verified: styles.verified,
  rejected: styles.rejected,
  expired: styles.expired,
};

export const GOV_CLASS = {
  not_checked: styles.notUploaded,
  pending: styles.pending,
  verified: styles.verified,
  mismatch: styles.mismatch,
  not_found: styles.mismatch,
  unavailable: styles.unavailable,
  error: styles.unavailable,
};

export const GOV_ISSUE_STATUSES = new Set([
  "mismatch",
  "not_found",
  "unavailable",
  "error",
]);
