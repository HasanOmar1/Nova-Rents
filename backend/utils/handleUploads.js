const fs = require("fs");
const path = require("path");

const uploadsDir = path.resolve(__dirname, "../uploads");
const complaintEvidenceDir = path.resolve(
  __dirname,
  "../complaint-evidence",
);

function isInsideDirectory(directory, filePath) {
  const relativePath = path.relative(directory, filePath);
  return Boolean(
    relativePath &&
      relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath),
  );
}

function failedUploadPath(file) {
  if (!file) return null;

  const candidate = file.path
    ? path.resolve(file.path)
    : typeof file.filename === "string"
      ? path.resolve(uploadsDir, file.filename)
      : null;

  if (
    !candidate ||
    ![uploadsDir, complaintEvidenceDir].some((directory) =>
      isInsideDirectory(directory, candidate),
    )
  ) {
    return null;
  }

  return candidate;
}

// Helper function to safely delete images from the disk
const deleteImagesFromDisk = (imageJsonString) => {
  if (!imageJsonString) return;

  try {
    const images = JSON.parse(imageJsonString);

    images.forEach((filename) => {
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
const clearFailedUploads = (files) => {
  if (!files || files.length === 0) return;

  files.forEach((file) => {
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
