import { ChevronDown, ChevronRight } from "lucide-react";
import {
  formatGovCheckStatus,
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

export default VehicleDocumentsAccordion;
