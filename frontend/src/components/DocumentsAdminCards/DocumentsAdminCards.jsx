import styles from "./DocumentsAdminCards.module.css";
import {
  formatDocumentStatus,
  formatDocumentType,
  formatGovCheckStatus,
} from "../../utils/displayFormat";

const STATUS_CLASS = {
  pending_review: styles.pending,
  verified: styles.verified,
  rejected: styles.rejected,
  expired: styles.expired,
};

const GOV_CLASS = {
  not_checked: styles.notChecked,
  pending: styles.pending,
  verified: styles.verified,
  mismatch: styles.mismatch,
  not_found: styles.mismatch,
  unavailable: styles.notChecked,
  error: styles.notChecked,
};

const DocumentsAdminCards = ({
  documentType,
  account,
  plate,
  status,
  govStatus,
  onReview,
}) => (
  <div className={styles.DocumentsAdminCards}>
    <p className={styles.typeCell} data-label="Type">
      <span className={styles.typeBadge}>{formatDocumentType(documentType)}</span>
    </p>
    <p className={styles.accountCell} data-label="Account" title={account}>
      {account}
    </p>
    <p className={styles.plateCell} data-label="Plate">
      {plate || "—"}
    </p>
    <p className={styles.statusCell} data-label="Status">
      <span className={`${styles.statusBadge} ${STATUS_CLASS[status] || ""}`}>
        {formatDocumentStatus(status)}
      </span>
    </p>
    <p className={styles.govCell} data-label="Government">
      <span className={`${styles.statusBadge} ${GOV_CLASS[govStatus] || ""}`}>
        {formatGovCheckStatus(govStatus)}
      </span>
    </p>
    <button
      type="button"
      className={styles.action}
      onClick={onReview}
      aria-label={`Review ${formatDocumentType(documentType)}`}
    >
      Review
    </button>
  </div>
);

export default DocumentsAdminCards;
