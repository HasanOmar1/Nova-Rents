// Defines the Owner Vehicle Reports Modal React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import { X } from "lucide-react";
import styles from "./OwnerVehicleReportsModal.module.css";
import { formatComplaintStatus } from "../../utils/displayFormat";
import { useModalDialog } from "../../hooks/useModalDialog";

// Formats date for display.
// Accepts value and returns the computed result.
const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Read-only owner view of active vehicle reports.
 * Never renders reporter identity (userId / email / name / phone).
 */

// Renders the Owner Vehicle Reports Modal interface.
// Accepts an options object and returns rendered JSX.
const OwnerVehicleReportsModal = ({
  isOpen,
  onClose,
  vehicleLabel,
  reports = [],
  heading = "Active reports",
  emptyMessage = "No active reports for this vehicle.",
  isLoading = false,
  errorMessage = "",
}) => {
  const dialogRef = useModalDialog(isOpen);

  return (
    <dialog
      className={styles.OwnerVehicleReportsModal}
      ref={dialogRef}
      onClose={onClose}
      onClick={
        // Handles the component's click event.
        // Accepts e and returns the handler result.
        (e) => e.stopPropagation()}
    >
      <div className={styles.header}>
        <div>
          <h2>{heading}</h2>
          <p>{vehicleLabel || "Your vehicle"}</p>
        </div>
        <button
          className={styles.closeIconBtn}
          onClick={onClose}
          type="button"
          aria-label="Close vehicle reports"
        >
          <X size={24} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <p className={styles.empty} aria-live="polite">
            Loading reports...
          </p>
        ) : errorMessage ? (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        ) : reports.length === 0 ? (
          <p className={styles.empty}>{emptyMessage}</p>
        ) : (
          reports.map(
            // Transforms one collection entry for the resulting list.
            // Accepts report and returns the mapped entry.
            (report) => (
            <article key={report.complaintId} className={styles.reportCard}>
              <section className={styles.detailBlock}>
                <p className={styles.detailLabel}>Title</p>
                <div className={styles.reportTop}>
                  <h3 className={styles.reportTitle}>{report.title}</h3>
                  <span className={styles.badge}>
                    {formatComplaintStatus(report.status, "—")}
                  </span>
                </div>
              </section>

              <p className={styles.meta}>
                Filed {formatDate(report.createdAt)}
              </p>

              <section className={styles.detailBlock}>
                <p className={styles.detailLabel}>Description</p>
                <div className={styles.descriptionBox}>
                  <p className={styles.descriptionText}>{report.description}</p>
                </div>
              </section>

              {report.resolutionMessage ? (
                <div className={styles.adminNotes}>
                  <p className={styles.adminNotesLabel}>Admin response</p>
                  <p>{report.resolutionMessage}</p>
                  {report.respondedAt && (
                    <p className={styles.meta}>
                      Updated {formatDate(report.respondedAt)}
                    </p>
                  )}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </dialog>
  );
};

export default OwnerVehicleReportsModal;
