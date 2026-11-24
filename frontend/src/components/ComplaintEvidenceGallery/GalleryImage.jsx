// Defines the Gallery Image React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import { useState } from "react";
import { ImageOff } from "lucide-react";
import styles from "./ComplaintEvidenceGallery.module.css";

// Renders the Gallery Image interface.
// Accepts an options object and returns rendered JSX.
const GalleryImage = ({ src, alt, compact = false, onUnavailable }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <span
        className={
          compact ? styles.compactUnavailable : styles.imageUnavailable
        }
        role={compact ? undefined : "img"}
        aria-hidden={compact ? "true" : undefined}
        aria-label={compact ? undefined : `${alt}. Evidence image unavailable.`}
      >
        <ImageOff size={compact ? 20 : 34} aria-hidden="true" />
        {!compact && <span>Evidence image unavailable</span>}
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
        () => {
          setHasError(true);
          onUnavailable?.();
        }}
    />
  );
};

export default GalleryImage;
