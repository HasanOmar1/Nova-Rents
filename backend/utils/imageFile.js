/** Shared backend utility for image file operations.
 * Normalizes, validates, or transforms values for the surrounding domain. */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const UPLOADS_DIR = path.join(__dirname, "../uploads");
const COMPLAINT_EVIDENCE_DIR = path.join(__dirname, "../complaint-evidence");
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;

const EXTENSION_TO_MIME = Object.freeze({
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jfif": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
});

const MIME_TO_STORED_EXTENSION = Object.freeze({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
});

class ImageValidationError extends Error {
  /** Creates an error for rejected image files or validation failures.
   * Accepts a message; returns a named ImageValidationError instance. */
  constructor(message) {
    super(message);
    this.name = "ImageValidationError";
  }
}

/** Ensures uploads dir.
 * Accepts no arguments; returns no meaningful value after completing the side effect. */
function ensureUploadsDir() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/** Ensures complaint evidence dir.
 * Accepts no arguments; returns no meaningful value after completing the side effect. */
function ensureComplaintEvidenceDir() {
  fs.mkdirSync(COMPLAINT_EVIDENCE_DIR, { recursive: true });
}

/** Extracts and lowercases a filename extension.
 * Accepts filename; returns the lowercase extension. */
function extensionOf(filename) {
  return path.extname(String(filename || "")).toLowerCase();
}

/** Normalizes mime.
 * Accepts mimetype; returns the derived value. */
function normalizeMime(mimetype) {
  return String(mimetype || "").trim().toLowerCase();
}

/** Checks whether allowed declared image.
 * Accepts originalname and mimetype; returns the validation or boolean result. */
function isAllowedDeclaredImage(originalname, mimetype) {
  const expectedMime = EXTENSION_TO_MIME[extensionOf(originalname)];
  return Boolean(expectedMime && expectedMime === normalizeMime(mimetype));
}

/** Checks whether safe public image path.
 * Accepts filename; returns the validation or boolean result. */
function isSafePublicImagePath(filename) {
  return Boolean(EXTENSION_TO_MIME[extensionOf(filename)]);
}

/** Checks whether safe stored image name.
 * Accepts filename; returns the validation or boolean result. */
function isSafeStoredImageName(filename) {
  const value = String(filename || "").trim();
  return Boolean(
    value &&
      value === path.basename(value) &&
      /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value) &&
      isSafePublicImagePath(value),
  );
}

/** Parses stored image names.
 * Accepts images; returns the derived value. */
function parseStoredImageNames(images) {
  if (images == null) return [];

  let parsed = Buffer.isBuffer(images) ? images.toString("utf8") : images;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = [parsed];
    }
  }

  const values = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object"
      ? Object.values(parsed)
      : [parsed];
  return [
    ...new Set(
      values
        .filter(
          /** Tests whether one collection item should remain in the filtered result.
           * Accepts value; returns a boolean used by the collection operation. */
          (value) => typeof value === "string")
        .map(
          /** Transforms one collection item for the surrounding mapping operation.
           * Accepts value; returns the transformed collection value. */
          (value) => value.trim().replace(/^\/?uploads\//i, ""))
        .filter(isSafeStoredImageName),
    ),
  ];
}

/** Maps an accepted image MIME type to its storage extension.
 * Accepts mimetype; returns the storage extension. */
function storedExtensionForMime(mimetype) {
  return MIME_TO_STORED_EXTENSION[normalizeMime(mimetype)] || null;
}

/** Checks whether avif header.
 * Accepts buffer; returns the validation or boolean result. */
function isAvifHeader(buffer) {
  if (buffer.length < 12 || buffer.toString("ascii", 4, 8) !== "ftyp") {
    return false;
  }

  const declaredBoxSize = buffer.readUInt32BE(0);
  const boxEnd = Math.min(
    declaredBoxSize >= 12 ? declaredBoxSize : buffer.length,
    buffer.length,
  );

  for (let offset = 8; offset + 4 <= boxEnd; offset += 4) {
    const brand = buffer.toString("ascii", offset, offset + 4);
    if (brand === "avif" || brand === "avis") return true;
  }

  return false;
}

// This is used only to choose a safe Content-Type for legacy stored files.
// Upload acceptance always uses Sharp's full decoder below.
/** Detects image mime.
 * Accepts buffer; returns the derived value. */
function detectImageMime(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  if (isAvifHeader(buffer)) return "image/avif";

  return null;
}

/** Detects a safe response MIME type from a stored image file.
 * Accepts fullPath; returns the detected MIME type or null. */
function safeMimeForStoredFile(fullPath) {
  const extensionMime = EXTENSION_TO_MIME[extensionOf(fullPath)] || null;

  try {
    const fd = fs.openSync(fullPath, "r");
    try {
      const header = Buffer.alloc(64);
      const bytesRead = fs.readSync(fd, header, 0, header.length, 0);
      return detectImageMime(header.subarray(0, bytesRead)) || extensionMime;
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return extensionMime;
  }
}

/** Checks whether decoded image metadata matches the declared MIME type.
 * Accepts metadata and mimetype; returns a boolean match result. */
function metadataMatchesDeclaredMime(metadata, mimetype) {
  if (mimetype === "image/jpeg") return metadata.format === "jpeg";
  if (mimetype === "image/png") return metadata.format === "png";
  if (mimetype === "image/webp") return metadata.format === "webp";
  if (mimetype === "image/avif") {
    return metadata.format === "heif" && metadata.compression === "av1";
  }
  return false;
}

/** Normalizes uploaded image.
 * Accepts file; returns the derived value. */
async function normalizeUploadedImage(file) {
  if (
    !file ||
    !Buffer.isBuffer(file.buffer) ||
    !isAllowedDeclaredImage(file.originalname, file.mimetype)
  ) {
    throw new ImageValidationError(
      "Invalid image type. Upload a JPG, PNG, WebP, or AVIF file.",
    );
  }

  const mimetype = normalizeMime(file.mimetype);
  let image;
  let metadata;

  try {
    image = sharp(file.buffer, {
      failOn: "warning",
      limitInputPixels: MAX_IMAGE_PIXELS,
      limitInputChannels: 4,
      sequentialRead: true,
    });
    metadata = await image.metadata();
  } catch {
    throw new ImageValidationError(
      "Image content is invalid or exceeds the supported dimensions.",
    );
  }

  if (!metadataMatchesDeclaredMime(metadata, mimetype)) {
    throw new ImageValidationError(
      "Image content does not match its declared file type.",
    );
  }

  let outputBuffer;
  try {
    const orientedImage = image.rotate();
    if (mimetype === "image/jpeg") {
      outputBuffer = await orientedImage
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
    } else if (mimetype === "image/png") {
      outputBuffer = await orientedImage
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();
    } else if (mimetype === "image/webp") {
      outputBuffer = await orientedImage
        .webp({ quality: 85, effort: 4 })
        .toBuffer();
    } else {
      outputBuffer = await orientedImage
        .avif({ quality: 60, effort: 4 })
        .toBuffer();
    }
  } catch {
    throw new ImageValidationError("Image could not be safely processed.");
  }

  if (!outputBuffer.length || outputBuffer.length > MAX_IMAGE_BYTES) {
    throw new ImageValidationError(
      "Processed image is too large. Maximum size is 5MB.",
    );
  }

  return {
    buffer: outputBuffer,
    mimetype,
    extension: storedExtensionForMime(mimetype),
  };
}

module.exports = {
  UPLOADS_DIR,
  COMPLAINT_EVIDENCE_DIR,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  EXTENSION_TO_MIME,
  ImageValidationError,
  ensureUploadsDir,
  ensureComplaintEvidenceDir,
  isAllowedDeclaredImage,
  isSafePublicImagePath,
  isSafeStoredImageName,
  parseStoredImageNames,
  storedExtensionForMime,
  detectImageMime,
  safeMimeForStoredFile,
  normalizeUploadedImage,
};
