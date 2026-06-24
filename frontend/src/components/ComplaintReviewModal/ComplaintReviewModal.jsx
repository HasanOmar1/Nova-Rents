import { useEffect, useRef, useState } from "react";
import styles from "./ComplaintReviewModal.module.css";
import { X, Send, AlertCircle } from "lucide-react";
import { parseImgs } from "../../utils/parseImgs";

const ComplaintReviewModal = ({ isOpen, onClose, complaint, onUpdate }) => {
  const dialogRef = useRef(null);
  const [status, setStatus] = useState("open");
  const [adminNote, setAdminNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && complaint) {
      setStatus(complaint.status || "open");
      setAdminNote(complaint.adminNotes || "");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onUpdate(complaint.complaintId, status, adminNote);
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
          <h3>{complaint.title}</h3>
          <span className={styles.badge}>{complaint.complaintType}</span>

          <div className={styles.descriptionBox}>
            <p>{complaint.description}</p>
          </div>

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
              {/* <option value="closed">Closed</option> */}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="adminNote">Response to User</label>
            <textarea
              id="adminNote"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Write your response to the user here..."
              rows={4}
              disabled={isClosed && complaint.status === "resolved"}
            />
            {isClosed && (
              <p className={styles.warningText}>
                <AlertCircle size={14} /> Resolving this complaint will disable
                further replies from the user.
              </p>
            )}
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
