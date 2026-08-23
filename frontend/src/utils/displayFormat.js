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

const VEHICLE_STATUS_LABELS = {
  available: "Available",
  unavailable: "Unavailable",
  not_validated: "Not validated",
  rented: "Rented",
  maintenance: "Maintenance",
  inactive: "Inactive",
};

const normalizeVehicleStatus = (status) =>
  String(status || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();

const isExplicitlyFalse = (value) =>
  value === false || value === 0 || value === "false" || value === "0";

/**
 * Returns the status people can actually act on while preserving the raw
 * operational status in `vehicle.status` for editing and rental workflows.
 */
export const getVehicleDisplayStatus = (vehicle) => {
  const effectiveStatus = normalizeVehicleStatus(vehicle?.effectiveStatus);
  if (effectiveStatus) return effectiveStatus;

  if (normalizeVehicleStatus(vehicle?.ownerStatus) === "blocked") {
    return "unavailable";
  }

  const rawStatus = normalizeVehicleStatus(vehicle?.status);
  const rentalEligible =
    vehicle?.rentalEligibility?.eligible ?? vehicle?.rentalEligible;

  if (rawStatus === "available" && isExplicitlyFalse(rentalEligible)) {
    return "not_validated";
  }

  return rawStatus || "unknown";
};

export const formatVehicleStatus = (status, fallback = "Unknown") => {
  const normalizedStatus = normalizeVehicleStatus(status);
  return (
    VEHICLE_STATUS_LABELS[normalizedStatus] ||
    formatEventLabel(normalizedStatus) ||
    fallback
  );
};

const DOCUMENT_DISPLAY_CONFIG = {
  identity_card: {
    title: "Identity Card",
    documentNumberLabel: "ID Number",
    documentNumberPlaceholder: "Enter the number shown on your ID",
    documentNumberRequired: true,
    expirationDateLabel: "ID Expiration Date",
    expirationDateRequired: true,
    showStartDate: false,
    firstUploadButton: "Upload Document",
    nextStepByStatus: {
      not_uploaded: "Upload a photo of your identity card.",
      pending_review:
        "Your identity card was uploaded successfully. An administrator will review it.",
      rejected:
        "We could not verify this document. Review the reason below and upload a corrected document.",
      expired: "This identity card has expired. Upload a valid identity card.",
    },
    actionByStatus: {
      not_uploaded: "Upload Document",
      pending_review: "Upload New Version",
      verified: "Upload New Version",
      rejected: "Upload Corrected Document",
      expired: "Upload New Version",
    },
  },
  passport: {
    title: "Passport",
    documentNumberLabel: "Passport Number",
    documentNumberPlaceholder: "Enter your passport number",
    documentNumberRequired: true,
    expirationDateLabel: "Passport Expiration Date",
    expirationDateRequired: true,
    showStartDate: false,
    firstUploadButton: "Upload Document",
    nextStepByStatus: {
      not_uploaded: "Upload a photo of your passport.",
      pending_review:
        "Your passport was uploaded successfully. An administrator will review it.",
      rejected:
        "We could not verify this document. Review the reason below and upload a corrected document.",
      expired: "This passport has expired. Upload a valid passport.",
    },
    actionByStatus: {
      not_uploaded: "Upload Document",
      pending_review: "Upload New Version",
      verified: "Upload New Version",
      rejected: "Upload Corrected Document",
      expired: "Upload New Version",
    },
  },
  driver_license: {
    title: "Driver License",
    documentNumberLabel: "Driver License Number",
    documentNumberPlaceholder: "Enter the number shown on your driver license",
    documentNumberHelp: "Enter the number shown on your driver license.",
    documentNumberRequired: true,
    expirationDateLabel: "Driver License Expiration Date",
    expirationDateRequired: true,
    showStartDate: false,
    firstUploadButton: "Upload Document",
    nextStepByStatus: {
      not_uploaded: "Upload a photo of your driver license.",
      pending_review:
        "Your driver license was uploaded successfully. An administrator will review it.",
      rejected:
        "We could not verify this document. Review the reason below and upload a corrected document.",
      expired:
        "Your driver license has expired. Upload a valid driver license before renting.",
    },
    actionByStatus: {
      not_uploaded: "Upload Document",
      pending_review: "Upload New Version",
      verified: "Upload New Version",
      rejected: "Upload Corrected Document",
      expired: "Upload New Version",
    },
  },
  insurance: {
    title: "Insurance",
    documentNumberLabel: "Policy Number",
    documentNumberPlaceholder: "Enter insurance policy number",
    documentNumberHelp: "Found on your insurance policy.",
    documentNumberRequired: true,
    insuranceCompanyLabel: "Insurance Company",
    insuranceCompanyRequired: true,
    startDateLabel: "Coverage Start Date",
    startDateHelp: "The date your insurance coverage begins.",
    startDateRequired: true,
    expirationDateLabel: "Coverage End Date",
    expirationDateHelp: "The date your insurance coverage expires.",
    expirationDateRequired: true,
    adminStartDateLabel: "Insurance Coverage Start",
    adminExpirationDateLabel: "Insurance Coverage End",
    showStartDate: true,
    firstUploadButton: "Upload Document",
    nextStepByStatus: {
      not_uploaded: "Upload your vehicle insurance policy.",
      pending_review:
        "Your insurance was uploaded successfully. An administrator will review it.",
      rejected:
        "We could not verify this document. Review the reason below and upload a corrected document.",
      expired:
        "Your insurance coverage has expired. Upload renewed insurance before accepting new rentals.",
    },
    actionByStatus: {
      not_uploaded: "Upload Document",
      pending_review: "Upload New Version",
      verified: "Upload New Version",
      rejected: "Upload Corrected Document",
      expired: "Upload Renewed Insurance",
    },
  },
  vehicle_registration: {
    title: "Vehicle Registration",
    documentNumberLabel: "Vehicle Registration Number",
    documentNumberPlaceholder: "Enter vehicle registration number",
    documentNumberRequired: false,
    expirationDateLabel: "Vehicle Registration Valid Until",
    expirationDateRequired: true,
    showStartDate: false,
    firstUploadButton: "Upload Document",
    nextStepByStatus: {
      not_uploaded: "Upload your vehicle registration document.",
      pending_review:
        "Your vehicle registration was uploaded successfully. An administrator will review it.",
      rejected:
        "We could not verify this document. Review the reason below and upload a corrected document.",
      expired:
        "This vehicle registration is no longer valid. Upload an updated registration.",
    },
    actionByStatus: {
      not_uploaded: "Upload Document",
      pending_review: "Upload New Version",
      verified: "Upload New Version",
      rejected: "Upload Corrected Document",
      expired: "Upload New Version",
    },
  },
};

const FALLBACK_DOCUMENT_DISPLAY = {
  title: "Document",
  documentNumberLabel: "Document Number",
  documentNumberPlaceholder: "Enter document number",
  documentNumberRequired: false,
  expirationDateLabel: "Expiration Date",
  expirationDateRequired: false,
  startDateLabel: "Start date",
  startDateRequired: false,
  insuranceCompanyLabel: "Insurance Company",
  insuranceCompanyRequired: false,
  showStartDate: false,
  firstUploadButton: "Upload Document",
  nextStepByStatus: {},
  actionByStatus: {
    not_uploaded: "Upload Document",
    pending_review: "Upload New Version",
    verified: "Upload New Version",
    rejected: "Upload Corrected Document",
    expired: "Upload New Version",
  },
};

export const getDocumentDisplayConfig = (documentType, audience = "user") => {
  const config = DOCUMENT_DISPLAY_CONFIG[documentType] || {
    ...FALLBACK_DOCUMENT_DISPLAY,
    title: formatEventLabel(documentType) || FALLBACK_DOCUMENT_DISPLAY.title,
  };
  if (audience !== "admin") return config;
  return {
    ...config,
    startDateLabel: config.adminStartDateLabel || config.startDateLabel,
    expirationDateLabel:
      config.adminExpirationDateLabel || config.expirationDateLabel,
  };
};

export const getDocumentActionLabel = (documentType, status) => {
  const config = getDocumentDisplayConfig(documentType);
  return (
    config.actionByStatus?.[status] ||
    (status === "not_uploaded" || !status
      ? config.firstUploadButton
      : "Upload New Version")
  );
};

export const getDocumentGuidance = (documentType, status) => {
  const config = getDocumentDisplayConfig(documentType);
  return config.nextStepByStatus?.[status] || null;
};

export const getDocumentUploadCopy = (documentType, status, isReplace) => {
  const config = getDocumentDisplayConfig(documentType);
  const action = getDocumentActionLabel(documentType, status);
  return {
    title: isReplace ? action : `Upload ${config.title}`,
    submitLabel: action,
    verifiedWarning:
      "Uploading a new version of a verified document sends it back for review.",
  };
};

export const GOVERNMENT_VEHICLE_TITLE = "Government Vehicle Verification";
export const GOVERNMENT_VEHICLE_EXPLANATION =
  "We compare your vehicle details with official government vehicle records. This does not verify the uploaded file, insurance, or your identity.";

const USER_GOV_STATUS_GUIDANCE = {
  not_checked:
    "This vehicle has not been compared with government records yet.",
  mismatch:
    "The vehicle details in our system do not match official government records.",
  not_found: "This vehicle was not found in official government records.",
  unavailable:
    "We couldn't verify the vehicle right now because the government service is unavailable. Please try again later.",
  error: "Vehicle verification could not be completed. Please try again later.",
};

export const getGovernmentCheckGuidance = (status) =>
  USER_GOV_STATUS_GUIDANCE[status] || null;

const USER_DOCUMENT_STATUS_LABELS = {
  not_uploaded: "Not Uploaded",
  pending_review: "Waiting for Review",
  verified: "Verified",
  rejected: "Needs Attention",
  expired: "Expired",
};

const ADMIN_DOCUMENT_STATUS_LABELS = {
  not_uploaded: "Not uploaded",
  pending_review: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
  expired: "Expired",
};

const USER_GOV_CHECK_STATUS_LABELS = {
  not_checked: "Not Checked Yet",
  pending: "Check In Progress",
  verified: "Vehicle Details Verified",
  mismatch: "Vehicle Details Don't Match",
  not_found: "Vehicle Not Found",
  unavailable: "Government Service Temporarily Unavailable",
  error: "Verification Could Not Be Completed",
};

const ADMIN_GOV_CHECK_STATUS_LABELS = {
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
  DOCUMENT_DISPLAY_CONFIG[documentType]?.title ||
  formatEventLabel(documentType);

export const formatDocumentStatus = (status, audience = "user") => {
  const labels =
    audience === "admin"
      ? ADMIN_DOCUMENT_STATUS_LABELS
      : USER_DOCUMENT_STATUS_LABELS;
  return labels[status] || formatEventLabel(status);
};

export const formatGovCheckStatus = (status, audience = "user") => {
  const labels =
    audience === "admin"
      ? ADMIN_GOV_CHECK_STATUS_LABELS
      : USER_GOV_CHECK_STATUS_LABELS;
  return labels[status] || formatEventLabel(status);
};

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
    "Upload a verified identity card or passport before renting.",
  IDENTITY_PENDING_REVIEW:
    "Your identity document is waiting for review. You can rent after it is verified.",
  IDENTITY_REJECTED:
    "Your identity document needs attention. Upload a corrected document before renting.",
  IDENTITY_EXPIRED:
    "Your identity document has expired. Upload a valid identity card or passport before renting.",
  DRIVER_LICENSE_NOT_UPLOADED: "Upload a driver license before renting.",
  DRIVER_LICENSE_PENDING_REVIEW:
    "Your driver license is waiting for review. You can rent after it is verified.",
  DRIVER_LICENSE_REJECTED:
    "Your driver license needs attention. Upload a corrected document before renting.",
  DRIVER_LICENSE_EXPIRED:
    "Your driver license has expired. Upload a valid driver license before renting.",
};

const VEHICLE_ELIGIBILITY_MESSAGES = {
  OWNER_IDENTITY_NOT_UPLOADED: "The owner's identity document is not uploaded.",
  OWNER_IDENTITY_PENDING_REVIEW:
    "The owner's identity document is waiting for review.",
  OWNER_IDENTITY_REJECTED: "The owner's identity document needs attention.",
  OWNER_IDENTITY_EXPIRED: "The owner's identity document has expired.",
  INSURANCE_NOT_UPLOADED: "Vehicle insurance is not uploaded.",
  INSURANCE_PENDING_REVIEW: "Vehicle insurance is waiting for review.",
  INSURANCE_REJECTED: "Vehicle insurance needs attention.",
  INSURANCE_EXPIRED: "Vehicle insurance coverage has expired.",
  INSURANCE_DOES_NOT_COVER_RENTAL_PERIOD:
    "The vehicle's insurance coverage ends before this rental. Choose different dates or wait for the owner to renew insurance.",
  VEHICLE_REGISTRATION_NOT_UPLOADED: "Vehicle registration is not uploaded.",
  VEHICLE_REGISTRATION_PENDING_REVIEW:
    "Vehicle registration is waiting for review.",
  VEHICLE_REGISTRATION_REJECTED: "Vehicle registration needs attention.",
  VEHICLE_REGISTRATION_EXPIRED: "Vehicle registration is no longer valid.",
  GOVERNMENT_CHECK_NOT_RUN:
    "This vehicle has not been compared with government records yet.",
  GOVERNMENT_CHECK_MISMATCH:
    "This vehicle's details do not match official government records.",
  GOVERNMENT_CHECK_NOT_FOUND:
    "This vehicle was not found in official government records.",
  GOVERNMENT_CHECK_UNAVAILABLE:
    "We couldn't verify the vehicle right now because the government service is unavailable. Please try again later.",
  GOVERNMENT_CHECK_ERROR:
    "Vehicle verification could not be completed. Please try again later.",
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
      label: "Government vehicle verification",
      ok: statuses.governmentCheck === "verified",
    },
  ];
  return {
    eligible: Boolean(rentalEligibility.eligible),
    checks,
    message: rentalEligibility.eligible
      ? null
      : (rentalEligibility.reasons || [])
          .map((reason) => formatEligibilityReason(reason))
          .join(" "),
  };
};
