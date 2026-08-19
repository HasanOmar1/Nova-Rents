/** Formats project currency values with a dollar prefix and locale separators. */
export const formatCurrency = (value) =>
  `$${(Number(value) || 0).toLocaleString()}`;

/** Converts an event key such as "vehicle_created" to "Vehicle Created". */
export const formatEventLabel = (eventName, customLabels = {}) => {
  if (customLabels[eventName]) return customLabels[eventName];

  return String(eventName || "")
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
};

const COMPLAINT_STATUS_LABELS = {
  open: "Open",
  in_review: "In review",
  resolved: "Resolved",
  closed: "Closed",
};

export const formatComplaintStatus = (status, fallback = "Unknown") =>
  COMPLAINT_STATUS_LABELS[status] || status || fallback;

const DOCUMENT_TYPE_LABELS = {
  identity_card: "Identity Card",
  passport: "Passport",
  driver_license: "Driver License",
  insurance: "Insurance",
  vehicle_registration: "Vehicle Registration",
};

const DOCUMENT_STATUS_LABELS = {
  not_uploaded: "Not uploaded",
  pending_review: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
  expired: "Expired",
};

const GOV_CHECK_STATUS_LABELS = {
  not_checked: "Not checked",
  pending: "Pending",
  verified: "Match",
  mismatch: "Mismatch",
  not_found: "Not found",
  unavailable: "Unavailable",
  error: "Error",
};

const REJECTION_CODE_LABELS = {
  unreadable_document: "Unreadable document",
  information_mismatch: "Information mismatch",
  expired_document: "Expired document",
  wrong_vehicle: "Wrong vehicle",
  incomplete_document: "Incomplete document",
  invalid_file: "Invalid file",
  other: "Other",
};

export const formatDocumentType = (documentType) =>
  DOCUMENT_TYPE_LABELS[documentType] || formatEventLabel(documentType);

export const formatDocumentStatus = (status) =>
  DOCUMENT_STATUS_LABELS[status] || formatEventLabel(status);

export const formatGovCheckStatus = (status) =>
  GOV_CHECK_STATUS_LABELS[status] || formatEventLabel(status);

export const formatRejectionCode = (code) =>
  REJECTION_CODE_LABELS[code] || formatEventLabel(code);

export const REJECTION_CODE_OPTIONS = Object.keys(REJECTION_CODE_LABELS);

/** Masks an identity / policy number for list display. Full value stays in upload form. */
export const maskSensitiveNumber = (value) => {
  const text = String(value || "").trim();
  if (!text) return null;
  if (text.length <= 4) return "••••";
  return `•••• ${text.slice(-4)}`;
};

const RENTER_ELIGIBILITY_MESSAGES = {
  IDENTITY_NOT_UPLOADED:
    "Upload a verified identity document (identity card or passport) before renting.",
  IDENTITY_PENDING_REVIEW:
    "Your identity verification is still pending. You can rent after admin approval.",
  IDENTITY_REJECTED:
    "Your identity document was rejected. Upload a valid identity document before renting.",
  IDENTITY_EXPIRED:
    "Your identity document has expired. Upload a valid identity document before renting.",
  DRIVER_LICENSE_NOT_UPLOADED:
    "Upload a driver license before renting.",
  DRIVER_LICENSE_PENDING_REVIEW:
    "Your driver license is still pending review.",
  DRIVER_LICENSE_REJECTED:
    "Your driver license was rejected. Upload a valid driver license before renting.",
  DRIVER_LICENSE_EXPIRED:
    "Your driver license has expired. Upload a valid driver license before renting.",
};

const VEHICLE_ELIGIBILITY_MESSAGES = {
  OWNER_IDENTITY_NOT_UPLOADED: "Owner identity is not verified.",
  OWNER_IDENTITY_PENDING_REVIEW: "Owner identity verification is pending.",
  OWNER_IDENTITY_REJECTED: "Owner identity verification was rejected.",
  OWNER_IDENTITY_EXPIRED: "Owner identity document has expired.",
  INSURANCE_NOT_UPLOADED: "Insurance is not uploaded.",
  INSURANCE_PENDING_REVIEW: "Insurance is pending review.",
  INSURANCE_REJECTED: "Insurance was rejected.",
  INSURANCE_EXPIRED: "Insurance has expired.",
  INSURANCE_DOES_NOT_COVER_RENTAL_PERIOD:
    "The vehicle's insurance expires before the end of your requested rental period. Please choose different dates or wait for the owner to renew the insurance.",
  VEHICLE_REGISTRATION_NOT_UPLOADED: "Vehicle registration is not uploaded.",
  VEHICLE_REGISTRATION_PENDING_REVIEW: "Vehicle registration is pending review.",
  VEHICLE_REGISTRATION_REJECTED: "Vehicle registration was rejected.",
  VEHICLE_REGISTRATION_EXPIRED: "Vehicle registration has expired.",
  GOVERNMENT_CHECK_NOT_RUN: "Government vehicle check has not been completed.",
  GOVERNMENT_CHECK_MISMATCH:
    "Government records do not match this vehicle. Admin review is required.",
  GOVERNMENT_CHECK_NOT_FOUND:
    "This vehicle was not found in government records.",
  GOVERNMENT_CHECK_UNAVAILABLE:
    "Government check is temporarily unavailable. Retry later.",
  GOVERNMENT_CHECK_ERROR:
    "Government check failed due to a service error. Retry later.",
};

export const formatEligibilityReason = (reason) =>
  RENTER_ELIGIBILITY_MESSAGES[reason] ||
  VEHICLE_ELIGIBILITY_MESSAGES[reason] ||
  formatEventLabel(String(reason || "").toLowerCase());

export const getPrimaryRenterEligibilityMessage = (reasons = []) => {
  const first = reasons.find((reason) => RENTER_ELIGIBILITY_MESSAGES[reason]);
  return first ? RENTER_ELIGIBILITY_MESSAGES[first] : null;
};

export const buildVehicleEligibilitySummary = (rentalEligibility) => {
  if (!rentalEligibility) return null;
  const statuses = rentalEligibility.statuses || {};
  const checks = [
    {
      key: "ownerIdentity",
      label: "Identity verified",
      ok: statuses.ownerIdentity === "verified",
    },
    {
      key: "vehicleRegistration",
      label: "Registration verified",
      ok: statuses.vehicleRegistration === "verified",
    },
    {
      key: "insurance",
      label: "Insurance verified",
      ok: statuses.insurance === "verified",
    },
    {
      key: "governmentCheck",
      label: "Government check",
      ok: statuses.governmentCheck === "verified",
    },
  ];
  return {
    eligible: Boolean(rentalEligibility.eligible),
    checks,
    message:
      rentalEligibility.eligible
        ? null
        : (rentalEligibility.reasons || [])
            .map((reason) => formatEligibilityReason(reason))
            .join(" "),
  };
};
