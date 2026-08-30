import { useEffect, useId, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ImageOff,
  Maximize2,
  X,
} from "lucide-react";
import { useModalDialog } from "../../hooks/useModalDialog";
import { parseComplaintImgs } from "../../utils/parseImgs";
import styles from "./ComplaintEvidenceGallery.module.css";
import GalleryImage from "./GalleryImage";

const ComplaintEvidenceGallery = ({ images, complaintId, complaintTitle }) => {
  const imageUrls = useMemo(
    () => parseComplaintImgs(images, complaintId, true),
    [complaintId, images],
  );
  const [activeImageIndex, setActiveImageIndex] = useState(null);
  const [unavailableImages, setUnavailableImages] = useState(() => new Set());
  const galleryTitleId = useId();
  const dialogTitleId = useId();
  const activeImage =
    activeImageIndex === null ? null : imageUrls[activeImageIndex];
  const isLightboxOpen = Boolean(activeImage);
  const dialogRef = useModalDialog(isLightboxOpen);
  const imageCount = imageUrls.length;
  const imageCountLabel = `${imageCount} ${imageCount === 1 ? "image" : "images"}`;

  const markImageUnavailable = (imageUrl) => {
    setUnavailableImages((current) => {
      if (current.has(imageUrl)) return current;
      return new Set([...current, imageUrl]);
    });
  };

  useEffect(() => {
    if (!isLightboxOpen || imageCount < 2) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveImageIndex((current) =>
          current === 0 ? imageCount - 1 : current - 1,
        );
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveImageIndex((current) =>
          current === imageCount - 1 ? 0 : current + 1,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imageCount, isLightboxOpen]);

  if (imageCount === 0) return null;

  const showPreviousImage = () => {
    setActiveImageIndex((current) =>
      current === 0 ? imageCount - 1 : current - 1,
    );
  };

  const showNextImage = () => {
    setActiveImageIndex((current) =>
      current === imageCount - 1 ? 0 : current + 1,
    );
  };

  const closeLightbox = () => setActiveImageIndex(null);

  return (
    <section className={styles.gallery} aria-labelledby={galleryTitleId}>
      <div className={styles.galleryHeading}>
        <p id={galleryTitleId} className={styles.galleryLabel}>
          <ImageIcon size={15} aria-hidden="true" />
          Your uploaded evidence
        </p>
        <span className={styles.imageCount}>{imageCountLabel}</span>
      </div>

      <div className={styles.thumbnailStrip}>
        {imageUrls.map((imageUrl, index) => (
          <button
            key={`${imageUrl}-${index}`}
            type="button"
            className={styles.thumbnailButton}
            onClick={() => {
              if (!unavailableImages.has(imageUrl)) setActiveImageIndex(index);
            }}
            aria-disabled={unavailableImages.has(imageUrl)}
            aria-label={
              unavailableImages.has(imageUrl)
                ? `Uploaded evidence image ${index + 1} of ${imageCount} is unavailable`
                : `View uploaded evidence image ${index + 1} of ${imageCount}`
            }
          >
            <GalleryImage
              src={imageUrl}
              alt={`Uploaded complaint evidence ${index + 1} of ${imageCount}`}
              compact
              onUnavailable={() => markImageUnavailable(imageUrl)}
            />
            <span className={styles.viewCue} aria-hidden="true">
              {unavailableImages.has(imageUrl) ? (
                <ImageOff size={13} />
              ) : (
                <Maximize2 size={13} />
              )}
              {unavailableImages.has(imageUrl) ? "Unavailable" : "View"}
            </span>
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className={styles.evidenceDialog}
        onClose={closeLightbox}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeLightbox();
        }}
        aria-labelledby={dialogTitleId}
      >
        <div className={styles.dialogShell}>
          <header className={styles.dialogHeader}>
            <div className={styles.dialogHeading}>
              <p className={styles.dialogEyebrow}>Complaint attachment</p>
              <h3 id={dialogTitleId}>Uploaded evidence</h3>
              <p className={styles.dialogComplaintTitle}>{complaintTitle}</p>
            </div>

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.closeButton}
                onClick={closeLightbox}
                aria-label="Close evidence viewer"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className={styles.viewerStage}>
            {imageCount > 1 && (
              <button
                type="button"
                className={`${styles.navigationButton} ${styles.previousButton}`}
                onClick={showPreviousImage}
                aria-label="Show previous evidence image"
              >
                <ChevronLeft size={25} aria-hidden="true" />
              </button>
            )}

            {activeImage && (
              <GalleryImage
                key={`${activeImage}-${activeImageIndex}`}
                src={activeImage}
                alt={`Uploaded complaint evidence ${activeImageIndex + 1} of ${imageCount}`}
                onUnavailable={() => markImageUnavailable(activeImage)}
              />
            )}

            {imageCount > 1 && (
              <button
                type="button"
                className={`${styles.navigationButton} ${styles.nextButton}`}
                onClick={showNextImage}
                aria-label="Show next evidence image"
              >
                <ChevronRight size={25} aria-hidden="true" />
              </button>
            )}

            <span className={styles.positionBadge} aria-live="polite">
              {activeImageIndex + 1} / {imageCount}
            </span>
          </div>

          {imageCount > 1 && (
            <div
              className={styles.dialogThumbnails}
              role="group"
              aria-label="Choose an evidence image"
            >
              {imageUrls.map((imageUrl, index) => (
                <button
                  key={`${imageUrl}-dialog-${index}`}
                  type="button"
                  className={`${styles.dialogThumbnailButton} ${
                    activeImageIndex === index ? styles.activeThumbnail : ""
                  }`}
                  onClick={() => {
                    if (!unavailableImages.has(imageUrl)) {
                      setActiveImageIndex(index);
                    }
                  }}
                  aria-disabled={unavailableImages.has(imageUrl)}
                  aria-label={
                    unavailableImages.has(imageUrl)
                      ? `Evidence image ${index + 1} of ${imageCount} is unavailable`
                      : `Show evidence image ${index + 1} of ${imageCount}`
                  }
                  aria-pressed={activeImageIndex === index}
                >
                  <GalleryImage
                    src={imageUrl}
                    alt=""
                    compact
                    onUnavailable={() => markImageUnavailable(imageUrl)}
                  />
                </button>
              ))}
            </div>
          )}

          {imageCount > 1 && (
            <p className={styles.keyboardHint}>
              Use the arrow keys to move between images.
            </p>
          )}
        </div>
      </dialog>
    </section>
  );
};

export default ComplaintEvidenceGallery;
