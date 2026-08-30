import styles from "./ComplaintsHistoryCards.module.css";
import { formatComplaintStatus } from "../../utils/displayFormat";
import ComplaintEvidenceGallery from "../ComplaintEvidenceGallery/ComplaintEvidenceGallery";

const statusClassName = (status) => {
  if (status === "open") return styles.open;
  if (status === "in_review") return styles.inReview;
  if (status === "resolved") return styles.resolved;
  if (status === "closed") return styles.closed;
  return "";
};

const ComplaintsHistoryCards = ({
  title,
  status,
  targetLabel,
  targetValue,
  referenceValue,
  listedOwner,
  submittedDate,
  description,
  images,
  complaintId,
  adminResponse,
}) => {
  return (
    <div className={styles.ComplaintsHistoryCards}>
      <div className={styles.titleAndStatusContainer}>
        <h5>{title}</h5>
        <p className={`${styles.status} ${statusClassName(status)}`}>
          {formatComplaintStatus(status)}
        </p>
      </div>

      <p>
        <span className={styles.metaLabel}>{targetLabel}:</span> {targetValue}
      </p>

      {referenceValue && (
        <p>
          <span className={styles.metaLabel}>Reference:</span> {referenceValue}
        </p>
      )}

      {listedOwner && (
        <p>
          <span className={styles.metaLabel}>Listed owner:</span> {listedOwner}
        </p>
      )}

      <p>
        <span className={styles.metaLabel}>Submitted:</span> {submittedDate}
      </p>

      <p className={styles.description}>Description: {description}</p>

      <ComplaintEvidenceGallery
        images={images}
        complaintId={complaintId}
        complaintTitle={title}
      />

      {adminResponse && (
        <div className={styles.responseBlock}>
          <p className={styles.responseLabel}>Admin response</p>
          <p className={styles.responseText}>{adminResponse}</p>
        </div>
      )}
    </div>
  );
};

export default ComplaintsHistoryCards;
