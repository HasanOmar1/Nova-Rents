/** Shared backend utility for document file operations.
 * Normalizes, validates, or transforms values for the surrounding domain. */
const fs = require("fs");
const path = require("path");

const PRIVATE_DOCUMENTS_DIR = path.join(__dirname, "../private-documents");
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

const USER_DOCUMENT_TYPES = [
  "identity_card",
  "passport",
  "driver_license",
];
const VEHICLE_DOCUMENT_TYPES = ["insurance", "vehicle_registration"];
const ALL_DOCUMENT_TYPES = [
  ...USER_DOCUMENT_TYPES,
  ...VEHICLE_DOCUMENT_TYPES,
];

const REJECTION_CODES = [
  "unreadable_document",
  "information_mismatch",
  "expired_document",
  "wrong_vehicle",
  "incomplete_document",
  "invalid_file",
  "other",
];

const ALLOWED_DOCUMENT_STATUSES = [
  "pending_review",
  "verified",
  "rejected",
  "expired",
];

const ALLOWED_UPLOADS = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
};

/** Ensures private documents dir.
 * Accepts no arguments; returns no meaningful value after completing the side effect. */
function ensurePrivateDocumentsDir() {
  if (!fs.existsSync(PRIVATE_DOCUMENTS_DIR)) {
    fs.mkdirSync(PRIVATE_DOCUMENTS_DIR, { recursive: true });
  }
}

/** Checks whether user scoped document type.
 * Accepts documentType; returns the validation or boolean result. */
function isUserScopedDocumentType(documentType) {
  return USER_DOCUMENT_TYPES.includes(documentType);
}

/** Checks whether vehicle scoped document type.
 * Accepts documentType; returns the validation or boolean result. */
function isVehicleScopedDocumentType(documentType) {
  return VEHICLE_DOCUMENT_TYPES.includes(documentType);
}

/** Extracts and lowercases a filename extension.
 * Accepts filename; returns the lowercase extension. */
function extensionOf(filename) {
  return path.extname(String(filename || "")).toLowerCase();
}

/** Checks whether allowed declared type.
 * Accepts originalname and mimetype; returns the validation or boolean result. */
function isAllowedDeclaredType(originalname, mimetype) {
  const ext = extensionOf(originalname);
  const expectedMime = ALLOWED_UPLOADS[ext];
  if (!expectedMime) return false;
  return mimetype === expectedMime;
}

/** Detects magic mime.
 * Accepts buffer; returns the derived value. */
function detectMagicMime(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  const header = buffer.slice(0, 4).toString("ascii");
  if (header === "%PDF") return "application/pdf";
  return null;
}

/** Validates stored document file.
 * Accepts storedFilename and declaredMime; returns the validation or boolean result. */
function validateStoredDocumentFile(storedFilename, declaredMime) {
  const safeName = path.basename(storedFilename);
  const fullPath = path.join(PRIVATE_DOCUMENTS_DIR, safeName);
  if (!fs.existsSync(fullPath)) {
    return { ok: false, message: "Uploaded file could not be stored." };
  }
  const fd = fs.openSync(fullPath, "r");
  try {
    const buffer = Buffer.alloc(8);
    const bytesRead = fs.readSync(fd, buffer, 0, 8, 0);
    const magicMime = detectMagicMime(buffer.slice(0, bytesRead));
    if (!magicMime) {
      return {
        ok: false,
        message: "File type is not allowed. Upload a JPG, PNG, or PDF.",
      };
    }
    if (magicMime !== declaredMime) {
      return {
        ok: false,
        message: "File content does not match the declared file type.",
      };
    }
    return { ok: true, mimeType: magicMime, fullPath };
  } finally {
    fs.closeSync(fd);
  }
}

/** Resolves a stored document filename inside the private directory.
 * Accepts storedFilename; returns the resolved private file path. */
function absolutePrivatePath(storedFilename) {
  const safeName = path.basename(String(storedFilename || ""));
  if (!safeName || safeName !== storedFilename) return null;
  return path.join(PRIVATE_DOCUMENTS_DIR, safeName);
}

/** Deletes private document file.
 * Accepts storedFilename; returns no meaningful value after deleting the stored document. */
function deletePrivateDocumentFile(storedFilename) {
  if (!storedFilename) return;
  const fullPath = absolutePrivatePath(storedFilename);
  if (!fullPath) return;
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

module.exports = {
  PRIVATE_DOCUMENTS_DIR,
  MAX_DOCUMENT_BYTES,
  USER_DOCUMENT_TYPES,
  VEHICLE_DOCUMENT_TYPES,
  ALL_DOCUMENT_TYPES,
  REJECTION_CODES,
  ALLOWED_DOCUMENT_STATUSES,
  ensurePrivateDocumentsDir,
  isUserScopedDocumentType,
  isVehicleScopedDocumentType,
  isAllowedDeclaredType,
  validateStoredDocumentFile,
  absolutePrivatePath,
  deletePrivateDocumentFile,
};
