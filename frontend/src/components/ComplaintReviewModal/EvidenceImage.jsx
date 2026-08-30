import { useState } from "react";
import { ImageOff } from "lucide-react";
import styles from "./ComplaintReviewModal.module.css";

const EvidenceImage = ({ src, alt, isThumbnail = false }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <span
        className={
          isThumbnail ? styles.thumbnailUnavailable : styles.evidenceUnavailable
        }
        role={isThumbnail ? undefined : "img"}
        aria-label={isThumbnail ? undefined : alt}
        aria-hidden={isThumbnail ? "true" : undefined}
      >
        <ImageOff size={isThumbnail ? 18 : 28} aria-hidden="true" />
        {!isThumbnail && <span>Evidence image unavailable</span>}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      crossOrigin="use-credentials"
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
};

export default EvidenceImage;
