import { useState } from "react";
import { Eye, RefreshCw, X } from "lucide-react";
import { useModalDialog } from "../../hooks/useModalDialog";
import AsyncButton from "../AsyncButton/AsyncButton";
import {
  formatDocumentStatus,
  formatDocumentType,
  formatGovCheckStatus,
  formatRejectionCode,
  REJECTION_CODE_OPTIONS,
  getDocumentDisplayConfig,
} from "../../utils/displayFormat";
import styles from "./DocumentReviewModal.module.css";

const DocumentReviewModal = ({
  isOpen,
  detail,
  onClose,
  onVerify,
  onReject,
  onOpenFile,
  onRetryGov,
  isBusy,
  errorMsg,
}) => {
  const document = detail?.document;
  const dialogRef = useModalDialog(isOpen && Boolean(document));
  const documentKey = document?.documentId || "closed";
  const [trackedKey, setTrackedKey] = useState(documentKey);
  const [rejectionCode, setRejectionCode] = useState("unreadable_document");
  const [rejectionReasonText, setRejectionReasonText] = useState("");
  if (trackedKey !== documentKey) {
    setTrackedKey(documentKey);
    setRejectionCode("unreadable_document");
    setRejectionReasonText("");
  }

  const isPending = document?.status === "pending_review";
  const gov = document?.governmentCheck || {};
  const fieldLabels = getDocumentDisplayConfig(document?.documentType, "admin");
  const accountName = `${document?.account?.firstName || ""} ${document?.account?.lastName || ""}`.trim();
  const mismatched = gov.mismatchedFields || [];
  const matched = gov.matchedFields || [];

  return (
    <dialog
      className={styles.DocumentReviewModal}
      ref={dialogRef}
      onClose={onClose}
    >
      {document && (
        <>
      <div className={styles.header}>
        <div>
          <h2>Review {formatDocumentType(document.documentType)}</h2>
          <p>
            #{document.documentId}
            {document.licensePlate ? ` · Plate ${document.licensePlate}` : ""}
          </p>
        </div>
        <button
          type="button"
          className={styles.closeIconBtn}
          onClick={onClose}
          aria-label="Close"
          disabled={isBusy}
        >
          <X size={22} />
        </button>
      </div>

      <div className={styles.content}>
        {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

        <section className={styles.block}>
          <p className={styles.label}>Account</p>
          <p className={styles.value}>{accountName || "—"}</p>
          <p className={styles.meta}>{document.account?.email}</p>
          <p className={styles.meta}>{document.account?.phone || "No phone"}</p>
        </section>

        <section className={styles.block}>
          <p className={styles.label}>Uploaded / stored document information</p>
          <p className={styles.value}>
            {formatDocumentType(document.documentType)} ·{" "}
            {formatDocumentStatus(document.status, "admin")}
            {document.verificationMethod
              ? ` · ${document.verificationMethod}`
              : ""}
          </p>
          {document.documentNumber && (
            <p className={styles.meta}>
              {fieldLabels.documentNumberLabel}: {document.documentNumber}
            </p>
          )}
          {document.insuranceCompany && (
            <p className={styles.meta}>
              {fieldLabels.insuranceCompanyLabel}: {document.insuranceCompany}
            </p>
          )}
          {document.startDate && (
            <p className={styles.meta}>
              {fieldLabels.startDateLabel}: {String(document.startDate).slice(0, 10)}
            </p>
          )}
          {document.expirationDate && (
            <p className={styles.meta}>
              {fieldLabels.expirationDateLabel}:{" "}
              {String(document.expirationDate).slice(0, 10)}
              {document.expirationCheck === "expired" ? " · expired" : ""}
            </p>
          )}
          {document.status === "rejected" && (
            <p className={styles.meta}>
              {formatRejectionCode(document.rejectionCode)}
              {document.rejectionReasonText
                ? ` — ${document.rejectionReasonText}`
                : ""}
            </p>
          )}
          <p className={styles.meta}>
            File {document.originalFilename || "uploaded file"}
          </p>
        </section>

        <section className={styles.block}>
          <p className={styles.label}>Related identity</p>
          <p className={styles.meta}>
            ID / passport:{" "}
            {formatDocumentStatus(detail.related?.identityStatus, "admin")}
          </p>
          <p className={styles.meta}>
            Driver license:{" "}
            {formatDocumentStatus(detail.related?.driverLicenseStatus, "admin")}
          </p>
        </section>

        {document.licensePlate && (
          <section className={styles.block}>
            <div className={styles.govHeader}>
              <p className={styles.label}>Comparison result</p>
              <span className={styles.govBadge}>
                {formatGovCheckStatus(gov.status, "admin")}
              </span>
            </div>
            <p className={styles.meta}>
              Official government vehicle data is compared with stored vehicle
              details. This does not verify the uploaded file, insurance, or
              identity.
            </p>
            {matched.length > 0 && (
              <p className={styles.meta}>
                Matched stored fields: {matched.map((item) => item.field).join(", ")}
              </p>
            )}
            {mismatched.length > 0 && (
              <ul className={styles.mismatchList}>
                {mismatched.map((item) => (
                  <li key={item.field}>
                    {item.field}: stored {item.ours || "—"} / official government{" "}
                    {item.government || "—"}
                  </li>
                ))}
              </ul>
            )}
            {gov.displayOnly?.chassis && (
              <p className={styles.meta}>
                Official chassis (display only) {gov.displayOnly.chassis}
              </p>
            )}
            {gov.errorMessage && (
              <p className={styles.meta}>{gov.errorMessage}</p>
            )}
            <AsyncButton
              type="button"
              className={styles.secondaryBtn}
              onClick={() => onRetryGov(document.licensePlate)}
              loading={isBusy}
              loadingText="Checking..."
            >
              <RefreshCw size={16} />
              Retry official government lookup
            </AsyncButton>
          </section>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => onOpenFile(document.documentId)}
            disabled={isBusy}
          >
            <Eye size={16} />
            Open file
          </button>
        </div>

        {isPending && (
          <form
            className={styles.reviewForm}
            onSubmit={(event) => event.preventDefault()}
          >
            <label className={styles.field}>
              <span>Rejection reason</span>
              <select
                value={rejectionCode}
                onChange={(event) => setRejectionCode(event.target.value)}
              >
                {REJECTION_CODE_OPTIONS.map((code) => (
                  <option key={code} value={code}>
                    {formatRejectionCode(code)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>
                Explanation {rejectionCode === "other" ? "(required)" : "(optional)"}
              </span>
              <textarea
                rows={3}
                value={rejectionReasonText}
                onChange={(event) => setRejectionReasonText(event.target.value)}
              />
            </label>
            <div className={styles.decisionRow}>
              <AsyncButton
                type="button"
                className={styles.rejectBtn}
                loading={isBusy}
                loadingText="Rejecting..."
                onClick={() =>
                  onReject(document.documentId, {
                    rejectionCode,
                    rejectionReasonText,
                  })
                }
              >
                Reject
              </AsyncButton>
              <AsyncButton
                type="button"
                className={styles.verifyBtn}
                loading={isBusy}
                loadingText="Verifying..."
                onClick={() => onVerify(document.documentId)}
              >
                Verify
              </AsyncButton>
            </div>
          </form>
        )}
      </div>
        </>
      )}
    </dialog>
  );
};

export default DocumentReviewModal;
