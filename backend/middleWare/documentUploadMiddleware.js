/** Express middleware for document upload concerns.
 * Validates or transforms requests before control reaches route handlers. */
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const STATUS_CODE = require("../constants/statusCodes");
const {
  PRIVATE_DOCUMENTS_DIR,
  MAX_DOCUMENT_BYTES,
  ensurePrivateDocumentsDir,
  isAllowedDeclaredType,
} = require("../utils/documentFile");

ensurePrivateDocumentsDir();

const storage = multer.diskStorage({
  /** Selects the upload destination through Multer's callback.
   * Accepts req, file, and cb; returns no value directly and reports the directory through cb. */
  destination: function (req, file, cb) {
    ensurePrivateDocumentsDir();
    cb(null, PRIVATE_DOCUMENTS_DIR);
  },
  /** Generates a unique stored filename through Multer's callback.
   * Accepts req, file, and cb; returns no value directly and reports the filename through cb. */
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
  },
});

/** Accepts or rejects an upload by its declared filename and MIME type.
 * Accepts req, file, and cb; returns no value directly and reports acceptance through cb. */
const fileFilter = (req, file, cb) => {
  if (isAllowedDeclaredType(file.originalname, file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Upload a JPG, JPEG, PNG, or PDF (max 5MB).",
      ),
      false,
    );
  }
};

const documentUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_DOCUMENT_BYTES },
});

/** Translates document-upload failures into HTTP responses.
 * Accepts err, req, res, and next; returns an HTTP response or delegates to the next middleware. */
function handleDocumentUploadError(err, req, res, next) {
  if (!err) return next();
  if (req.file?.filename) {
    const uploadedPath = path.join(PRIVATE_DOCUMENTS_DIR, req.file.filename);
    if (fs.existsSync(uploadedPath)) {
      fs.unlinkSync(uploadedPath);
    }
  }
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "File is too large. Maximum size is 5MB.",
      });
    }
    return res.status(STATUS_CODE.BAD_REQUEST).json({
      message: "File upload failed.",
    });
  }
  if (err.message) {
    return res.status(STATUS_CODE.BAD_REQUEST).json({ message: err.message });
  }
  return next(err);
}

module.exports = {
  documentUpload,
  handleDocumentUploadError,
};
