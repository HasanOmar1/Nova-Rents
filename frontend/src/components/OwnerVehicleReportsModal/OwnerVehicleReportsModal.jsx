import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import styles from "./OwnerVehicleReportsModal.module.css";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const statusLabel = (status) => {
  if (status === "in_review") return "In review";
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

/**
 * Read-only owner view of active vehicle reports.
 * Never renders reporter identity (userId / email / name / phone).
 */
const OwnerVehicleReportsModal = ({
  isOpen,
  onClose,
  vehicleLabel,
  reports = [],
}) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      document.body.style.overflow = "hidden";
    } else {
      if (dialog.open) dialog.close();
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  return (
    <dialog
      className={styles.OwnerVehicleReportsModal}
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.header}>
        <div>
          <h2>Active reports</h2>
          <p>{vehicleLabel || "Your vehicle"}</p>
        </div>
        <button className={styles.closeIconBtn} onClick={onClose} type="button">
          <X size={24} />
        </button>
      </div>

      <div className={styles.content}>
        {reports.length === 0 ? (
          <p className={styles.empty}>No active reports for this vehicle.</p>
        ) : (
          reports.map((report) => (
            <article key={report.complaintId} className={styles.reportCard}>
              <div className={styles.reportTop}>
                <h3>{report.title}</h3>
                <span className={styles.badge}>{statusLabel(report.status)}</span>
              </div>

              <p className={styles.meta}>Filed {formatDate(report.createdAt)}</p>

              <div className={styles.descriptionBox}>
                <p>{report.description}</p>
              </div>

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
