// Defines the Compact Vehicle Document Row React component and its supporting UI behavior.
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

// Renders the Compact Vehicle Document Row interface.
// Accepts an options object and returns rendered JSX.
const CompactVehicleDocumentRow = ({
  slot,
  onUpload,
  onView,
  viewingId,
}) => {
  const status = slot.status || "not_uploaded";
  const canView = Boolean(slot.documentId);
  const maskedNumber = maskSensitiveNumber(slot.documentNumber);
  const expirationPassed = isPastDate(slot.expirationDate);
  const fieldLabels = getDocumentDisplayConfig(slot.documentType);
  const actionLabel = getDocumentActionLabel(slot.documentType, status);
  const guidance = getDocumentGuidance(slot.documentType, status);

  return (
    <div className={styles.compactDocRow}>
      <div className={styles.compactDocMain}>
        <div className={styles.compactDocTitleRow}>
          <p className={styles.compactDocTitle}>
            {formatDocumentType(slot.documentType)}
          </p>
          <span
            className={`${styles.statusBadge} ${STATUS_CLASS[status] || ""}`}
          >
            {formatDocumentStatus(status)}
          </span>
        </div>
        {(maskedNumber ||
          slot.expirationDate ||
          status === "rejected" ||
          guidance) && (
          <div className={styles.compactDocMeta}>
            {maskedNumber && (
              <small>
                {fieldLabels.documentNumberLabel} {maskedNumber}
              </small>
            )}
            {slot.expirationDate && (
              <small>
                {fieldLabels.expirationDateLabel}{" "}
                {String(slot.expirationDate).slice(0, 10)}
                {expirationPassed ? " · passed" : ""}
              </small>
            )}
            {status === "rejected" && (
              <small className={styles.rejection}>
                {formatRejectionCode(slot.rejectionCode)}
                {slot.rejectionReasonText
                  ? ` — ${slot.rejectionReasonText}`
                  : ""}
              </small>
            )}
            {guidance && <small className={styles.guidance}>{guidance}</small>}
          </div>
        )}
      </div>
      <div className={styles.compactDocActions}>
        {canView && (
          <button
            type="button"
            className={styles.compactIconBtn}
            onClick={
              // Handles the component's click event.
              // Takes no arguments and returns the handler result.
              () => onView(slot.documentId)}
            disabled={viewingId === slot.documentId}
            aria-label={`View ${formatDocumentType(slot.documentType)}`}
          >
            <Eye size={16} />
          </button>
        )}
        <button
          type="button"
          className={styles.compactUploadBtn}
          onClick={
            // Handles the component's click event.
            // Takes no arguments and returns the handler result.
            () => onUpload(slot)}
        >
          <Upload size={14} />
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

export default CompactVehicleDocumentRow;
