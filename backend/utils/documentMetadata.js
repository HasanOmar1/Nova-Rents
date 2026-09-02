/** Shared backend utility for document metadata operations.
 * Normalizes, validates, or transforms values for the surrounding domain. */
const METADATA_FIELDS = [
  "documentNumber",
  "insuranceCompany",
  "startDate",
  "expirationDate",
];

const TEXT_FIELD_MAX_LENGTH = Object.freeze({
  documentNumber: 64,
  insuranceCompany: 100,
});

const DATE_FIELDS = new Set(["startDate", "expirationDate"]);

/** Creates rule.
 * Accepts an options object; returns the derived value. */
const makeRule = ({ allowedFields, requiredFields, labels }) =>
  Object.freeze({
    allowedFields: Object.freeze(allowedFields),
    requiredFields: Object.freeze(requiredFields),
    labels: Object.freeze(labels),
  });

const DOCUMENT_METADATA_RULES = Object.freeze({
  identity_card: makeRule({
    allowedFields: ["documentNumber", "expirationDate"],
    requiredFields: ["documentNumber", "expirationDate"],
    labels: {
      documentNumber: "ID number",
      expirationDate: "ID expiration date",
    },
  }),
  passport: makeRule({
    allowedFields: ["documentNumber", "expirationDate"],
    requiredFields: ["documentNumber", "expirationDate"],
    labels: {
      documentNumber: "Passport number",
      expirationDate: "Passport expiration date",
    },
  }),
  driver_license: makeRule({
    allowedFields: ["documentNumber", "expirationDate"],
    requiredFields: ["documentNumber", "expirationDate"],
    labels: {
      documentNumber: "Driver license number",
      expirationDate: "Driver license expiration date",
    },
  }),
  insurance: makeRule({
    allowedFields: [
      "documentNumber",
      "insuranceCompany",
      "startDate",
      "expirationDate",
    ],
    requiredFields: [
      "documentNumber",
      "insuranceCompany",
      "startDate",
      "expirationDate",
    ],
    labels: {
      documentNumber: "Policy number",
      insuranceCompany: "Insurance company",
      startDate: "Coverage start date",
      expirationDate: "Coverage end date",
    },
  }),
  vehicle_registration: makeRule({
    allowedFields: ["expirationDate"],
    requiredFields: ["expirationDate"],
    labels: {
      expirationDate: "Vehicle registration expiration date",
    },
  }),
});

/** Checks whether real iso calendar date.
 * Accepts value; returns the validation or boolean result. */
function isRealIsoCalendarDate(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1000 || month < 1 || month > 12 || day < 1) return false;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

/** Converts a supported date value to an ISO date string.
 * Accepts value; returns the ISO date string or null. */
function dateToIso(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Normalizes text.
 * Accepts value and maxLength; returns the derived value. */
function normalizeText(value, maxLength) {
  if (value == null || value === "") return { value: null };
  if (typeof value === "object") {
    return { error: "must be text" };
  }

  const text = String(value).trim();
  if (!text) return { value: null };
  if (text.length > maxLength) {
    return { error: `must be ${maxLength} characters or fewer` };
  }
  return { value: text };
}

/** Normalizes date.
 * Accepts value; returns the derived value. */
function normalizeDate(value) {
  if (value == null || value === "") return { value: null };
  const isDateObject = value instanceof Date;
  const text = isDateObject ? dateToIso(value) : String(value).trim();
  if (!isDateObject && !text) return { value: null };
  if (!text || !isRealIsoCalendarDate(text)) {
    return { error: "must be a real date in YYYY-MM-DD format" };
  }
  return { value: text };
}

/** Builds a structured document-metadata validation error.
 * Accepts field, code, and message; returns the structured error object. */
function metadataError(field, code, message) {
  return { field, code, message };
}

/** Validates document metadata.
 * Accepts documentType and input; returns the validation or boolean result. */
function validateDocumentMetadata(documentType, input = {}) {
  const rule = DOCUMENT_METADATA_RULES[documentType];
  if (!rule) {
    const error = metadataError(
      "documentType",
      "invalid_document_type",
      "Invalid document type.",
    );
    return {
      ok: false,
      message: error.message,
      field: error.field,
      errors: [error],
    };
  }

  const source = input && typeof input === "object" ? input : {};
  const allowed = new Set(rule.allowedFields);
  const normalized = Object.fromEntries(
    METADATA_FIELDS.map(
      /** Transforms one collection item for the surrounding mapping operation.
       * Accepts field; returns the transformed collection value. */
      (field) => [field, null]),
  );
  const errors = [];

  for (const field of rule.allowedFields) {
    const parsed = DATE_FIELDS.has(field)
      ? normalizeDate(source[field])
      : normalizeText(source[field], TEXT_FIELD_MAX_LENGTH[field]);
    const label = rule.labels[field] || field;
    if (parsed.error) {
      errors.push(
        metadataError(field, "invalid", `${label} ${parsed.error}.`),
      );
      continue;
    }
    normalized[field] = parsed.value;
  }

  for (const field of rule.requiredFields) {
    if (
      normalized[field] == null &&
      !errors.some(
        /** Tests whether one collection item satisfies the surrounding condition.
         * Accepts error; returns a boolean used by the collection operation. */
        (error) => error.field === field)
    ) {
      const label = rule.labels[field] || field;
      errors.push(metadataError(field, "required", `${label} is required.`));
    }
  }

  if (
    documentType === "insurance" &&
    normalized.startDate &&
    normalized.expirationDate &&
    normalized.startDate > normalized.expirationDate
  ) {
    errors.push(
      metadataError(
        "expirationDate",
        "invalid_date_range",
        "Coverage end date must be on or after the coverage start date.",
      ),
    );
  }

  // Values outside the type's allow-list are intentionally discarded rather
  // than persisted as unrelated metadata.
  for (const field of METADATA_FIELDS) {
    if (!allowed.has(field)) normalized[field] = null;
  }

  if (errors.length) {
    return {
      ok: false,
      message: errors[0].message,
      field: errors[0].field,
      errors,
    };
  }

  return { ok: true, metadata: normalized };
}

module.exports = {
  validateDocumentMetadata,
};
