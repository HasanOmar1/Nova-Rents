import { useEffect, useRef, useState } from "react";
import styles from "./ComplaintReviewModal.module.css";
import { X, Send, AlertCircle } from "lucide-react";
import { parseImgs } from "../../utils/parseImgs";

const ComplaintReviewModal = ({ isOpen, onClose, complaint, onUpdate }) => {
  const dialogRef = useRef(null);
  const [status, setStatus] = useState("open");
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && complaint) {
      setStatus(complaint.status || "open");
      // Prefer resolutionMessage; fall back for any pre-migration rows.
      setResolutionMessage(
        complaint.resolutionMessage || complaint.adminNotes || "",
      );
      setAdminNotes(complaint.adminNotes || "");
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.close();
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen, complaint]);

  if (!complaint) return null;

  const images = complaint.images ? parseImgs(complaint.images, true) : [];
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
    >
      <div className={styles.header}>
        <div>
          <h2>Review Complaint #{complaint.complaintId}</h2>
          <p>
            Reported by:{" "}
            {complaint.complainerEmail || `User ID: ${complaint.userId}`}
          </p>
        </div>
        <button className={styles.closeIconBtn} onClick={onClose} type="button">
          <X size={24} />
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
            className={styles.detailBlock}
            aria-labelledby="complaint-description-label"
          >
            <p
              id="complaint-description-label"
              className={styles.detailLabel}
            >
              Description
            </p>
            <div className={styles.descriptionBox}>
              <p className={styles.descriptionText}>{complaint.description}</p>
            </div>
          </section>

          {images.length > 0 && (
            <div className={styles.imageGallery}>
              {images.map((img, idx) => (
                <img key={idx} src={img} alt={`Evidence ${idx + 1}`} />
              ))}
            </div>
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
