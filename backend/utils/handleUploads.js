/** Shared backend utility for handle uploads operations.
 * Normalizes, validates, or transforms values for the surrounding domain. */
const fs = require("fs");
const path = require("path");

const uploadsDir = path.resolve(__dirname, "../uploads");
const complaintEvidenceDir = path.resolve(
  __dirname,
  "../complaint-evidence",
);

/** Checks whether inside directory.
 * Accepts directory and filePath; returns the validation or boolean result. */
function isInsideDirectory(directory, filePath) {
  const relativePath = path.relative(directory, filePath);
  return Boolean(
    relativePath &&
      relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath),
  );
}

/** Resolves a failed upload's safe on-disk cleanup path.
 * Accepts file; returns the safe path or null. */
function failedUploadPath(file) {
  if (!file) return null;

  const candidate = file.path
    ? path.resolve(file.path)
    : typeof file.filename === "string"
      ? path.resolve(uploadsDir, file.filename)
      : null;

  if (
    !candidate ||
    ![uploadsDir, complaintEvidenceDir].some(
      /** Tests whether one collection item satisfies the surrounding condition.
       * Accepts directory; returns a boolean used by the collection operation. */
      (directory) =>
      isInsideDirectory(directory, candidate),
    )
  ) {
    return null;
  }

  return candidate;
}

// Helper function to safely delete images from the disk
/** Deletes images from disk.
 * Accepts imageJsonString; returns no meaningful value after removing safe stored images. */
const deleteImagesFromDisk = (imageJsonString) => {
  if (!imageJsonString) return;

  try {
    const images = JSON.parse(imageJsonString);

    images.forEach(
      /** Processes one collection item for side effects.
       * Accepts filename; returns no meaningful value. */
      (filename) => {
        const filePath = path.join(__dirname, "../uploads", filename);

        // Check if the file exists, then delete it
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
    });
  } catch (error) {
    console.error("Error deleting images from disk:", error);
  }
};

// Helper: Deletes uploaded files if the database insertion fails
/** Clears failed uploads.
 * Accepts files; returns no meaningful value after completing the side effect. */
const clearFailedUploads = (files) => {
  if (!files || files.length === 0) return;

  files.forEach(
    /** Processes one collection item for side effects.
     * Accepts file; returns no meaningful value. */
    (file) => {
      const filePath = failedUploadPath(file);
      if (!filePath) return;

      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error("Failed to delete temp image:", err);
      }
  });
};

module.exports = { deleteImagesFromDisk, clearFailedUploads };
