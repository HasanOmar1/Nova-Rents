const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { clearFailedUploads } = require("../utils/handleUploads");
const {
  UPLOADS_DIR,
  MAX_IMAGE_BYTES,
  ImageValidationError,
  ensureUploadsDir,
  isAllowedDeclaredImage,
  normalizeUploadedImage,
} = require("../utils/imageFile");

ensureUploadsDir();

const fileFilter = (req, file, cb) => {
  if (!isAllowedDeclaredImage(file.originalname, file.mimetype)) {
    return cb(
      new Error("Invalid image type. Upload a JPG, PNG, WebP, or AVIF file."),
      false,
    );
  }

  return cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_IMAGE_BYTES },
});

function storedFileRecord(file, normalized, filename) {
  const storedFile = {
    ...file,
    destination: UPLOADS_DIR,
    filename,
    path: path.join(UPLOADS_DIR, filename),
    size: normalized.buffer.length,
    mimetype: normalized.mimetype,
  };
  delete storedFile.buffer;
  return storedFile;
}

async function validateUploadedImages(req, res, next) {
  const files = Array.isArray(req.files)
    ? req.files
    : req.file
      ? [req.file]
      : [];

  let normalizedFiles;
  try {
    normalizedFiles = [];
    for (const file of files) {
      normalizedFiles.push(await normalizeUploadedImage(file));
    }
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }

  const storedFiles = [];
  try {
    for (let index = 0; index < files.length; index += 1) {
      const normalized = normalizedFiles[index];
      const filename = `${crypto.randomUUID()}${normalized.extension}`;
      const fullPath = path.join(UPLOADS_DIR, filename);
      await fs.promises.writeFile(fullPath, normalized.buffer, { flag: "wx" });
      storedFiles.push(storedFileRecord(files[index], normalized, filename));
    }
  } catch (error) {
    clearFailedUploads(storedFiles);
    return next(error);
  }

  if (req.file) req.file = storedFiles[0];
  req.files = storedFiles;
  return next();
}

module.exports = { upload, validateUploadedImages };
