// Defines the Evidence Image React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import { useState } from "react";
import { ImageOff } from "lucide-react";
import styles from "./ComplaintReviewModal.module.css";

// Renders the Evidence Image interface.
// Accepts an options object and returns rendered JSX.
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
      onError={
        // Handles the component's error event.
        // Takes no arguments and returns the handler result.
        () => setHasError(true)}
    />
  );
};

export default EvidenceImage;
