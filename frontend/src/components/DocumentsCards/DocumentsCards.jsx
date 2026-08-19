import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Eye, Upload } from "lucide-react";
import { useDocumentContext } from "../../context/DocumentContext";
import DocumentUploadModal from "../DocumentUploadModal/DocumentUploadModal";
import {
  formatDocumentStatus,
  formatDocumentType,
  formatGovCheckStatus,
  formatRejectionCode,
  maskSensitiveNumber,
  getPrimaryRenterEligibilityMessage,
  getDocumentDisplayConfig,
  getDocumentActionLabel,
  getDocumentGuidance,
  GOVERNMENT_VEHICLE_TITLE,
  GOVERNMENT_VEHICLE_EXPLANATION,
  getGovernmentCheckGuidance,
} from "../../utils/displayFormat";
import styles from "./DocumentsCards.module.css";
import { useRentContext } from "../../context/RentContext";

const STATUS_CLASS = {
  not_uploaded: styles.notUploaded,
  pending_review: styles.pending,
  verified: styles.verified,
  rejected: styles.rejected,
  expired: styles.expired,
};

const GOV_CLASS = {
  not_checked: styles.notUploaded,
  pending: styles.pending,
  verified: styles.verified,
  mismatch: styles.mismatch,
  not_found: styles.mismatch,
  unavailable: styles.unavailable,
  error: styles.unavailable,
};

const GOV_ISSUE_STATUSES = new Set([
  "mismatch",
  "not_found",
  "unavailable",
  "error",
]);

const isPastDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
};

const getVehicleDocSummary = (documents = []) => {
  const verifiedCount = documents.filter((slot) => slot.status === "verified").length;
  return {
    verifiedCount,
    total: documents.length || 2,
    hasPending: documents.some((slot) => slot.status === "pending_review"),
    needsDocuments: documents.some(
      (slot) => !slot.status || slot.status === "not_uploaded",
    ),
    fullyVerified:
      documents.length >= 2 &&
      documents.every((slot) => slot.status === "verified"),
  };
};

const DocumentSlot = ({
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
    <div className={styles.dataContainer}>
      <div className={styles.data}>
        <div className={styles.slotInfo}>
          <div className={styles.slotTitleRow}>
            <p>{formatDocumentType(slot.documentType)}</p>
            <span className={`${styles.statusBadge} ${STATUS_CLASS[status] || ""}`}>
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
              onClick={() => onView(slot.documentId)}
              disabled={viewingId === slot.documentId}
              aria-label={`View ${formatDocumentType(slot.documentType)}`}
            >
              <Eye size={20} />
            </button>
          )}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => onUpload(slot)}
            aria-label={actionLabel}
          >
            <Upload size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

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
          <span className={`${styles.statusBadge} ${STATUS_CLASS[status] || ""}`}>
            {formatDocumentStatus(status)}
          </span>
        </div>
        {(maskedNumber || slot.expirationDate || status === "rejected" || guidance) && (
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
                {slot.rejectionReasonText ? ` — ${slot.rejectionReasonText}` : ""}
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
            onClick={() => onView(slot.documentId)}
            disabled={viewingId === slot.documentId}
            aria-label={`View ${formatDocumentType(slot.documentType)}`}
          >
            <Eye size={16} />
          </button>
        )}
        <button
          type="button"
          className={styles.compactUploadBtn}
          onClick={() => onUpload(slot)}
        >
          <Upload size={14} />
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

const VehicleDocumentsAccordion = ({
  vehicle,
  isExpanded,
  onToggle,
  onUpload,
  onView,
  viewingId,
}) => {
  const govStatus = vehicle.governmentCheck?.status || "not_checked";
  const documents = vehicle.documents || [];
  const summary = getVehicleDocSummary(documents);
  const panelId = `vehicle-docs-${vehicle.licensePlate}`;
  const govGuidance = getGovernmentCheckGuidance(govStatus);

  return (
    <div
      className={`${styles.vehicleAccordion} ${isExpanded ? styles.vehicleAccordionExpanded : ""}`}
    >
      <button
        type="button"
        className={styles.vehicleAccordionHeader}
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={panelId}
      >
        <span className={styles.vehicleChevron} aria-hidden="true">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
        <span className={styles.vehicleHeaderMain}>
          <span className={styles.vehiclePlate}>Plate {vehicle.licensePlate}</span>
          {!isExpanded && (
            <span className={styles.vehicleDocCount}>
              Verified documents: {summary.verifiedCount}/{summary.total}
            </span>
          )}
        </span>
        <span
          className={`${styles.statusBadge} ${styles.vehicleGovBadge} ${GOV_CLASS[govStatus] || ""}`}
        >
          {formatGovCheckStatus(govStatus)}
        </span>
      </button>

      {isExpanded && (
        <div id={panelId} className={styles.vehicleAccordionBody}>
          <div className={styles.vehicleExpandedMeta}>
            <div className={styles.govCopy}>
              <span className={styles.vehiclePlateInline}>
                {GOVERNMENT_VEHICLE_TITLE}
              </span>
              <small className={styles.govExplanation}>
                {GOVERNMENT_VEHICLE_EXPLANATION}
              </small>
              {govGuidance && (
                <small className={styles.guidance}>{govGuidance}</small>
              )}
            </div>
            <span
              className={`${styles.statusBadge} ${GOV_CLASS[govStatus] || ""}`}
            >
              {formatGovCheckStatus(govStatus)}
            </span>
          </div>
          {documents.map((slot) => (
            <CompactVehicleDocumentRow
              key={`${vehicle.licensePlate}-${slot.documentType}`}
              slot={{
                ...slot,
                licensePlate: slot.licensePlate ?? vehicle.licensePlate,
              }}
              onUpload={onUpload}
              onView={onView}
              viewingId={viewingId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DocumentsCards = () => {
  const {
    overview,
    isLoading,
    isUploading,
    errorMsg,
    setErrorMsg,
    getMyDocuments,
    uploadDocument,
    openDocumentFile,
  } = useDocumentContext();
  const { rentalEligibility, fetchRentalEligibility } = useRentContext();
  const [uploadSlot, setUploadSlot] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [expandedPlate, setExpandedPlate] = useState(null);

  useEffect(() => {
    getMyDocuments();
    fetchRentalEligibility();
  }, [getMyDocuments, fetchRentalEligibility]);

  const handleUpload = useCallback(
    async (payload) => {
      const isSuccess = await uploadDocument(payload);
      if (isSuccess) {
        await fetchRentalEligibility({ force: true });
      }
      return isSuccess;
    },
    [uploadDocument, fetchRentalEligibility],
  );

  const identity = overview?.identity || [];
  const vehicles = overview?.vehicles || [];
  const renterEligibilityMessage = getPrimaryRenterEligibilityMessage(
    rentalEligibility?.reasons,
  );

  const vehiclesSummary = useMemo(() => {
    if (vehicles.length < 2) return null;

    let fullyVerified = 0;
    let needDocuments = 0;
    let pending = 0;
    let governmentIssue = 0;

    for (const vehicle of vehicles) {
      const docSummary = getVehicleDocSummary(vehicle.documents || []);
      const govStatus = vehicle.governmentCheck?.status || "not_checked";

      if (docSummary.fullyVerified) fullyVerified += 1;
      if (docSummary.needsDocuments) needDocuments += 1;
      if (docSummary.hasPending) pending += 1;
      if (GOV_ISSUE_STATUSES.has(govStatus)) governmentIssue += 1;
    }

    const parts = [];
    if (fullyVerified) parts.push(`${fullyVerified} fully verified`);
    if (needDocuments) parts.push(`${needDocuments} need documents`);
    if (pending) parts.push(`${pending} pending`);
    if (governmentIssue) parts.push(`${governmentIssue} government issue`);

    if (!parts.length) return null;
    return parts.join(" · ");
  }, [vehicles]);

  const openUpload = (slot) => {
    setErrorMsg("");
    setUploadSlot(slot);
  };

  const closeUpload = () => {
    setUploadSlot(null);
  };

  const handleView = async (documentId) => {
    setViewingId(documentId);
    await openDocumentFile(documentId);
    setViewingId(null);
  };

  const toggleVehicle = (licensePlate) => {
    setExpandedPlate((current) =>
      current === licensePlate ? null : licensePlate,
    );
  };

  return (
    <div className={styles.DocumentsCards}>
      <h4>Documents</h4>

      {errorMsg && !uploadSlot && <p className={styles.errorMsg}>{errorMsg}</p>}
      {isLoading && <p className={styles.hint}>Loading documents...</p>}

      {!isLoading && (
        <>
          {renterEligibilityMessage && (
            <div className={styles.eligibilityBanner}>
              <p>{renterEligibilityMessage}</p>
              <span>Update the documents below if you need to take action.</span>
            </div>
          )}

          <section className={styles.section}>
            <h5>Identity</h5>
            {identity.length ? (
              identity.map((slot) => (
                <DocumentSlot
                  key={slot.documentType}
                  slot={slot}
                  onUpload={openUpload}
                  onView={handleView}
                  viewingId={viewingId}
                />
              ))
            ) : (
              <p className={styles.hint}>No identity documents to show.</p>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.vehiclesSectionHeader}>
              <h5>Vehicles</h5>
              {vehicles.length > 0 && (
                <span className={styles.vehiclesCount}>
                  {vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"}
                </span>
              )}
            </div>
            {vehiclesSummary && (
              <p className={styles.vehiclesSummary}>{vehiclesSummary}</p>
            )}
            {vehicles.length ? (
              <div className={styles.vehicleAccordionList}>
                {vehicles.map((vehicle) => (
                  <VehicleDocumentsAccordion
                    key={vehicle.licensePlate}
                    vehicle={vehicle}
                    isExpanded={expandedPlate === vehicle.licensePlate}
                    onToggle={() => toggleVehicle(vehicle.licensePlate)}
                    onUpload={openUpload}
                    onView={handleView}
                    viewingId={viewingId}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.hint}>
                Add a vehicle to upload insurance and registration.
              </p>
            )}
          </section>
        </>
      )}

      <DocumentUploadModal
        isOpen={Boolean(uploadSlot)}
        slot={uploadSlot}
        onClose={closeUpload}
        onSubmit={handleUpload}
        isUploading={isUploading}
        errorMsg={uploadSlot ? errorMsg : ""}
      />
    </div>
  );
};

export default DocumentsCards;
