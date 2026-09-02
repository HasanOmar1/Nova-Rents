// Defines the Document Slot React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import { Eye, Upload } from "lucide-react";
import {
  formatDocumentStatus,
  formatDocumentType,
  formatRejectionCode,
  maskSensitiveNumber,
  getDocumentDisplayConfig,
  getDocumentActionLabel,
  getDocumentGuidance,
} from "../../utils/displayFormat";
import { STATUS_CLASS } from "./DocumentsCards.constants";
import { isPastDate } from "./DocumentsCards.utils";
import styles from "./DocumentsCards.module.css";

// Renders the Document Slot interface.
// Accepts an options object and returns rendered JSX.
const DocumentSlot = ({ slot, onUpload, onView, viewingId }) => {
  const status = slot.status || "not_uploaded";
  const canView = Boolean(slot.documentId);
  const maskedNumber = maskSensitiveNumber(slot.documentNumber);
  const expirationPassed = isPastDate(slot.expirationDate);
  const fieldLabels = getDocumentDisplayConfig(slot.documentType);
  const actionLabel = getDocumentActionLabel(slot.documentType, status);
  const guidance = getDocumentGuidance(slot.documentType, status);

  return (
    <div className={styles.dataContainer}>
      <div className={styles.data}>
        <div className={styles.slotInfo}>
          <div className={styles.slotTitleRow}>
            <p>{formatDocumentType(slot.documentType)}</p>
            <span
              className={`${styles.statusBadge} ${STATUS_CLASS[status] || ""}`}
            >
              {formatDocumentStatus(status)}
            </span>
          </div>
          {maskedNumber && (
            <small className={styles.meta}>
              {fieldLabels.documentNumberLabel} {maskedNumber}
            </small>
          )}
          {slot.expirationDate && (
            <small className={styles.meta}>
              {fieldLabels.expirationDateLabel}{" "}
              {String(slot.expirationDate).slice(0, 10)}
              {expirationPassed ? " · date has passed" : ""}
            </small>
          )}
          {status === "rejected" && (
            <small className={styles.rejection}>
              {formatRejectionCode(slot.rejectionCode)}
              {slot.rejectionReasonText ? ` — ${slot.rejectionReasonText}` : ""}
            </small>
          )}
          {guidance && <small className={styles.guidance}>{guidance}</small>}
        </div>
        <div className={styles.slotActions}>
          {canView && (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={
                // Handles the component's click event.
                // Takes no arguments and returns the handler result.
                () => onView(slot.documentId)}
              disabled={viewingId === slot.documentId}
              aria-label={`View ${formatDocumentType(slot.documentType)}`}
            >
              <Eye size={20} />
            </button>
          )}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={
              // Handles the component's click event.
              // Takes no arguments and returns the handler result.
              () => onUpload(slot)}
            aria-label={actionLabel}
          >
            <Upload size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentSlot;
