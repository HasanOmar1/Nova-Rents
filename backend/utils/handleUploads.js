const fs = require("fs");
const path = require("path");

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
    const filePath = path.join(__dirname, "../uploads", file.filename);
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
