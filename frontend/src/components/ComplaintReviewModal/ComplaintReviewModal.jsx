import { useEffect, useState } from "react";
import styles from "./ComplaintReviewModal.module.css";
import {
  AlertCircle,
  Car,
  Image as ImageIcon,
  Mail,
  Send,
  User,
  X,
} from "lucide-react";
import { parseComplaintImgs } from "../../utils/parseImgs";
import { useModalDialog } from "../../hooks/useModalDialog";
import EvidenceImage from "./EvidenceImage";

const ComplaintReviewModal = ({ isOpen, onClose, complaint, onUpdate }) => {
  const dialogRef = useModalDialog(isOpen && Boolean(complaint));
  const [status, setStatus] = useState("open");
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!isOpen || !complaint) return;

    setStatus(complaint.status || "open");
    setResolutionMessage(complaint.resolutionMessage ?? "");
    setAdminNotes(complaint.adminNotes || "");
    setActiveImageIndex(0);
  }, [isOpen, complaint]);

  if (!complaint) return null;

  const images = complaint.images
    ? parseComplaintImgs(complaint.images, complaint.complaintId, true)
    : [];
  const activeImage = images[activeImageIndex] || images[0];
  const isVehicleComplaint = complaint.complaintType === "vehicle";
  const reportedUserEmail = isVehicleComplaint
    ? complaint.vehicleOwnerEmail
    : complaint.ownerEmail;
  const reportedUserName = isVehicleComplaint
    ? `${complaint.vehicleOwnerFirstName || ""} ${complaint.vehicleOwnerLastName || ""}`.trim()
    : `${complaint.ownerFirstName || ""} ${complaint.ownerLastName || ""}`.trim();
  const reportedVehicleName =
    `${complaint.brandName || ""} ${complaint.modelName || ""}`.trim();
  const reportedTargetName = isVehicleComplaint
    ? reportedVehicleName || "Reported vehicle"
    : reportedUserName ||
      reportedUserEmail ||
      (complaint.ownerId
        ? `User ID: ${complaint.ownerId}`
        : "Reported user unavailable");
  const isClosed = status === "resolved" || status === "closed";
  const resolutionRequired = status === "resolved" || status === "closed";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (resolutionRequired && !resolutionMessage.trim()) {
      return;
    }
    setIsSubmitting(true);
    await onUpdate(complaint.complaintId, status, {
      resolutionMessage,
      adminNotes,
    });
    setIsSubmitting(false);
  };

  return (
    <dialog
      className={styles.ComplaintReviewModal}
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => e.stopPropagation()}
      aria-labelledby="complaint-review-title"
    >
      <div className={styles.header}>
        <div>
          <h2 id="complaint-review-title">
            Review Complaint #{complaint.complaintId}
          </h2>
          <p>
            Reported by:{" "}
            {complaint.complainerEmail || `User ID: ${complaint.userId}`}
          </p>
        </div>
        <button
          className={styles.closeIconBtn}
          onClick={onClose}
          type="button"
          aria-label="Close complaint review"
        >
          <X size={24} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.detailsSection}>
          <section
            className={styles.detailBlock}
            aria-labelledby="complaint-title-label"
          >
            <p id="complaint-title-label" className={styles.detailLabel}>
              Title
            </p>
            <h3 className={styles.complaintTitle}>{complaint.title}</h3>
          </section>

          <span className={styles.badge}>{complaint.complaintType}</span>

          <section
            className={styles.reportTargetSection}
            aria-labelledby="reported-against-label"
          >
            <p id="reported-against-label" className={styles.detailLabel}>
              Reported against
            </p>
            <div className={styles.reportTargetCard}>
              <div className={styles.targetIcon} aria-hidden="true">
                {isVehicleComplaint ? <Car size={22} /> : <User size={22} />}
              </div>

              <div className={styles.targetDetails}>
                <p className={styles.targetName}>{reportedTargetName}</p>
                <p className={styles.targetMeta}>
                  {isVehicleComplaint
                    ? `Vehicle plate: ${complaint.vehicleLicensePlate || "Unavailable"}`
                    : "User account"}
                </p>

                {isVehicleComplaint && (
                  <p className={styles.targetOwner}>
                    <span>Vehicle owner</span>
                    {reportedUserName || "Name unavailable"}
                  </p>
                )}

                {reportedUserEmail ? (
                  <p className={styles.targetEmail}>
                    <Mail size={15} aria-hidden="true" />
                    <span>{reportedUserEmail}</span>
                  </p>
                ) : (
                  <p className={styles.targetEmailUnavailable}>
                    <Mail size={15} aria-hidden="true" /> Email unavailable
                  </p>
                )}
              </div>
            </div>
          </section>

          <section
            className={styles.detailBlock}
            aria-labelledby="complaint-description-label"
          >
            <p id="complaint-description-label" className={styles.detailLabel}>
              Description
            </p>
            <div className={styles.descriptionBox}>
              <p className={styles.descriptionText}>{complaint.description}</p>
            </div>
          </section>

          {activeImage && (
            <section
              className={styles.evidenceSection}
              aria-labelledby="complaint-evidence-label"
            >
              <div className={styles.evidenceHeading}>
                <p id="complaint-evidence-label" className={styles.detailLabel}>
                  Evidence
                </p>
                <span className={styles.evidenceCount}>
                  <ImageIcon size={14} aria-hidden="true" />
                  {images.length} {images.length === 1 ? "image" : "images"}
                </span>
              </div>

              <div className={styles.evidencePreview}>
                <EvidenceImage
                  key={`${activeImage}-${activeImageIndex}`}
                  src={activeImage}
                  alt={`Complaint evidence ${activeImageIndex + 1} of ${images.length}`}
                />
                <span className={styles.imagePosition}>
                  Image {activeImageIndex + 1} of {images.length}
                </span>
              </div>

              {images.length > 1 && (
                <div
                  className={styles.evidenceThumbnails}
                  role="group"
                  aria-label="Choose complaint evidence image"
                >
                  {images.map((img, idx) => (
                    <button
                      key={`${img}-${idx}`}
                      type="button"
                      className={`${styles.thumbnailButton} ${
                        idx === activeImageIndex ? styles.activeThumbnail : ""
                      }`}
                      onClick={() => setActiveImageIndex(idx)}
                      aria-label={`Show complaint evidence ${idx + 1} of ${images.length}`}
                      aria-pressed={idx === activeImageIndex}
                    >
                      <EvidenceImage src={img} alt="" isThumbnail />
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <hr className={styles.divider} />

        <form onSubmit={handleSubmit} className={styles.actionSection}>
          <div className={styles.inputGroup}>
            <label htmlFor="status">Update Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={styles.statusSelect}
            >
              <option value="open">Open</option>
              <option value="in_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="resolutionMessage">
              Response to User / Resolution
            </label>
            <textarea
              id="resolutionMessage"
              value={resolutionMessage}
              onChange={(e) => setResolutionMessage(e.target.value)}
              placeholder={
                resolutionRequired
                  ? "Public decision shown to the reporter and affected parties, and included in email."
                  : "Optional note for the reporter (can be left blank while under review)."
              }
              rows={4}
              disabled={isClosed && complaint.status === "resolved"}
              required={resolutionRequired}
            />
            <p className={styles.helperText}>
              {resolutionRequired
                ? "Required when resolving or closing. Visible to the reporter and affected owner when appropriate. Sent in status emails."
                : "Optional for Open / Under Review. Visible to the reporter and affected owner when provided."}
            </p>
            {isClosed && (
              <p className={styles.warningText}>
                <AlertCircle size={14} /> Resolving or closing this complaint
                ends the active case for the reporter and owners.
              </p>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="adminNotes">Internal Admin Notes</label>
            <textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Private notes for Nova Rents administrators only..."
              rows={3}
            />
            <p className={styles.helperText}>
              Only Nova Rents administrators can see this. Never emailed.
            </p>
          </div>

          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save & Send Response"}{" "}
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};

export default ComplaintReviewModal;
