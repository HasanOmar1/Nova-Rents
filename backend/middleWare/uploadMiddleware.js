const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const STATUS_CODE = require("../constants/statusCodes");
const { clearFailedUploads } = require("../utils/handleUploads");
const {
  UPLOADS_DIR,
  COMPLAINT_EVIDENCE_DIR,
  MAX_IMAGE_BYTES,
  ImageValidationError,
  ensureComplaintEvidenceDir,
  ensureUploadsDir,
  isAllowedDeclaredImage,
  normalizeUploadedImage,
} = require("../utils/imageFile");

ensureUploadsDir();
ensureComplaintEvidenceDir();

const fileFilter = (req, file, cb) => {
  if (!isAllowedDeclaredImage(file.originalname, file.mimetype)) {
    return cb(
      new ImageValidationError(
        "Invalid image type. Upload a JPG, PNG, WebP, or AVIF file.",
      ),
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

function handleImageUploadError(error, _req, res, next) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(STATUS_CODE.PAYLOAD_TOO_LARGE).json({
        message: "Image is too large. Maximum size is 5MB.",
      });
    }

    if (
      error.code === "LIMIT_FILE_COUNT" ||
      (error.code === "LIMIT_UNEXPECTED_FILE" && error.field === "images")
    ) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Upload up to 4 images.",
      });
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Unexpected image upload field.",
      });
    }

    return res.status(STATUS_CODE.BAD_REQUEST).json({
      message: "Image upload failed.",
    });
  }

  if (error instanceof ImageValidationError) {
    return res.status(STATUS_CODE.BAD_REQUEST).json({
      message: error.message,
    });
  }

  return next(error);
}

function storedFileRecord(file, normalized, filename, destination) {
  const storedFile = {
    ...file,
    destination,
    filename,
    path: path.join(destination, filename),
    size: normalized.buffer.length,
    mimetype: normalized.mimetype,
  };
  delete storedFile.buffer;
  return storedFile;
}

function persistUploadedImages(destination) {
  return async function persistImages(req, res, next) {
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
        const fullPath = path.join(destination, filename);
        await fs.promises.writeFile(fullPath, normalized.buffer, { flag: "wx" });
        storedFiles.push(
          storedFileRecord(files[index], normalized, filename, destination),
        );
      }
    } catch (error) {
      clearFailedUploads(storedFiles);
      return next(error);
    }

    if (req.file) req.file = storedFiles[0];
    req.files = storedFiles;
    return next();
  }
}

const validateUploadedImages = persistUploadedImages(UPLOADS_DIR);
const validateComplaintEvidence = persistUploadedImages(
  COMPLAINT_EVIDENCE_DIR,
);

module.exports = {
  upload,
  handleImageUploadError,
  validateUploadedImages,
  validateComplaintEvidence,
};
