// Defines the Vehicle Documents Accordion React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  formatDocumentStatus,
  formatGovCheckStatus,
  formatVehicleStatus,
  GOVERNMENT_VEHICLE_TITLE,
  GOVERNMENT_VEHICLE_EXPLANATION,
  getGovernmentCheckGuidance,
} from "../../utils/displayFormat";
import CompactVehicleDocumentRow from "./CompactVehicleDocumentRow";
import { GOV_CLASS } from "./DocumentsCards.constants";
import {
  getVehicleDocSummary,
  getVehicleDocumentsId,
} from "./DocumentsCards.utils";
import styles from "./DocumentsCards.module.css";

// Renders the Vehicle Documents Accordion interface.
// Accepts an options object and returns rendered JSX.
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
  // Top badge = overall vehicle readiness (docs + government check),
  // not government-only. getVehicleDocSummary already treats expired
  // verified docs as not verified via getDocumentDisplayStatus.
  const isVehicleVerified =
    summary.fullyVerified && govStatus === "verified";
  const topBadgeLabel = isVehicleVerified
    ? formatDocumentStatus("verified")
    : formatVehicleStatus("not_validated");
  const topBadgeClass = isVehicleVerified
    ? styles.verified
    : styles.mismatch;
  const accordionId = getVehicleDocumentsId(vehicle.licensePlate);
  const panelId = `${accordionId}-panel`;
  const govGuidance = getGovernmentCheckGuidance(govStatus);

  return (
    <div
      id={accordionId}
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
          <span className={styles.vehiclePlate}>
            Plate {vehicle.licensePlate}
          </span>
          {!isExpanded && (
            <span className={styles.vehicleDocCount}>
              Verified documents: {summary.verifiedCount}/{summary.total}
            </span>
          )}
        </span>
        <span
          className={`${styles.statusBadge} ${styles.vehicleGovBadge} ${topBadgeClass}`}
        >
          {topBadgeLabel}
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
          {documents.map(
            // Transforms one collection entry for the resulting list.
            // Accepts slot and returns the mapped entry.
            (slot) => (
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

export default VehicleDocumentsAccordion;
