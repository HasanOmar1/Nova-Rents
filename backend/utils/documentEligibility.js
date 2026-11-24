/** Shared backend utility for document eligibility operations.
 * Normalizes, validates, or transforms values for the surrounding domain. */
/** Starts of today.
 * Accepts no arguments; returns a Date at the start of the local day. */
function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** Checks whether expiration date past.
 * Accepts expirationDate; returns the validation or boolean result. */
function isExpirationDatePast(expirationDate) {
  if (!expirationDate) return false;
  const date = new Date(expirationDate);
  if (Number.isNaN(date.getTime())) return false;
  date.setHours(0, 0, 0, 0);
  return date < startOfToday();
}

/** Derives a document slot's effective status, including expiration.
 * Accepts doc; returns the effective status string. */
function slotStatus(doc) {
  if (!doc) return "not_uploaded";
  if (doc.status === "verified" && isExpirationDatePast(doc.expirationDate)) {
    return "expired";
  }
  return doc.status;
}

/** Evaluates identity requirement.
 * Accepts documentsByType; returns the derived value. */
function evaluateIdentityRequirement(documentsByType) {
  const identityCard = documentsByType.identity_card;
  const passport = documentsByType.passport;
  const cardStatus = slotStatus(identityCard);
  const passportStatus = slotStatus(passport);

  if (cardStatus === "verified" || passportStatus === "verified") {
    return {
      ok: true,
      status: "verified",
      reasons: [],
    };
  }

  const reasons = [];
  const statuses = [cardStatus, passportStatus].filter(
    /** Tests whether one collection item should remain in the filtered result.
     * Accepts status; returns a boolean used by the collection operation. */
    (status) => status !== "not_uploaded",
  );

  if (
    cardStatus === "pending_review" ||
    passportStatus === "pending_review"
  ) {
    reasons.push("IDENTITY_PENDING_REVIEW");
  } else if (cardStatus === "rejected" || passportStatus === "rejected") {
    reasons.push("IDENTITY_REJECTED");
  } else if (cardStatus === "expired" || passportStatus === "expired") {
    reasons.push("IDENTITY_EXPIRED");
  } else {
    reasons.push("IDENTITY_NOT_UPLOADED");
  }

  return {
    ok: false,
    status:
      statuses.length === 1
        ? statuses[0]
        : cardStatus !== "not_uploaded"
          ? cardStatus
          : passportStatus,
    reasons,
  };
}

/** Evaluates driver license requirement.
 * Accepts documentsByType; returns the derived value. */
function evaluateDriverLicenseRequirement(documentsByType) {
  const driverLicense = documentsByType.driver_license;
  const status = slotStatus(driverLicense);

  if (status === "verified") {
    return {
      ok: true,
      status: "verified",
      reasons: [],
    };
  }

  const reasonByStatus = {
    not_uploaded: "DRIVER_LICENSE_NOT_UPLOADED",
    pending_review: "DRIVER_LICENSE_PENDING_REVIEW",
    rejected: "DRIVER_LICENSE_REJECTED",
    expired: "DRIVER_LICENSE_EXPIRED",
  };

  return {
    ok: false,
    status,
    reasons: [reasonByStatus[status] || "DRIVER_LICENSE_NOT_UPLOADED"],
  };
}

/** Normalizes date only.
 * Accepts value; returns the derived value. */
function normalizeDateOnly(value) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Evaluates insurance covers rental period.
 * Accepts insuranceDoc, rentalEndDate, and licensePlate; returns the derived value. */
function evaluateInsuranceCoversRentalPeriod(
  insuranceDoc,
  rentalEndDate,
  licensePlate = null,
) {
  if (
    licensePlate != null &&
    insuranceDoc?.licensePlate != null &&
    String(insuranceDoc.licensePlate) !== String(licensePlate)
  ) {
    return {
      ok: false,
      status: "not_uploaded",
      reasons: ["INSURANCE_NOT_UPLOADED"],
    };
  }

  const insuranceByType = insuranceDoc ? { insurance: insuranceDoc } : {};
  const base = evaluateVehicleDocumentRequirement(
    insuranceByType,
    "insurance",
    "INSURANCE",
  );
  if (!base.ok) {
    return base;
  }

  const expiration = normalizeDateOnly(insuranceDoc.expirationDate);
  const rentalEnd = normalizeDateOnly(rentalEndDate);
  if (!expiration || !rentalEnd) {
    return {
      ok: true,
      status: "verified",
      reasons: [],
    };
  }

  if (expiration < rentalEnd) {
    return {
      ok: false,
      status: "verified",
      reasons: ["INSURANCE_DOES_NOT_COVER_RENTAL_PERIOD"],
    };
  }

  return {
    ok: true,
    status: "verified",
    reasons: [],
  };
}

/** Evaluates vehicle document requirement.
 * Accepts documentsByType, documentType, and prefix; returns the derived value. */
function evaluateVehicleDocumentRequirement(documentsByType, documentType, prefix) {
  const doc = documentsByType[documentType];
  const status = slotStatus(doc);

  if (status === "verified") {
    return {
      ok: true,
      status: "verified",
      reasons: [],
    };
  }

  const reasonByStatus = {
    not_uploaded: `${prefix}_NOT_UPLOADED`,
    pending_review: `${prefix}_PENDING_REVIEW`,
    rejected: `${prefix}_REJECTED`,
    expired: `${prefix}_EXPIRED`,
  };

  return {
    ok: false,
    status,
    reasons: [reasonByStatus[status] || `${prefix}_NOT_UPLOADED`],
  };
}

/** Evaluates government requirement.
 * Accepts governmentStatus; returns the derived value. */
function evaluateGovernmentRequirement(governmentStatus) {
  const status = governmentStatus || "not_checked";

  if (status === "verified") {
    return {
      ok: true,
      status,
      reasons: [],
    };
  }

  const reasonByStatus = {
    not_checked: "GOVERNMENT_CHECK_NOT_RUN",
    mismatch: "GOVERNMENT_CHECK_MISMATCH",
    not_found: "GOVERNMENT_CHECK_NOT_FOUND",
    unavailable: "GOVERNMENT_CHECK_UNAVAILABLE",
    error: "GOVERNMENT_CHECK_ERROR",
    pending: "GOVERNMENT_CHECK_NOT_RUN",
  };

  return {
    ok: false,
    status,
    reasons: [reasonByStatus[status] || "GOVERNMENT_CHECK_NOT_RUN"],
  };
}

/** Indexes the relevant document rows by document type.
 * Accepts rows and an options object; returns a document-type lookup object. */
function documentsByType(rows, { licensePlate = null } = {}) {
  const map = {};
  for (const row of rows) {
    if (licensePlate != null && String(row.licensePlate) !== String(licensePlate)) {
      continue;
    }
    if (licensePlate == null && row.licensePlate != null) {
      continue;
    }
    map[row.documentType] = row;
  }
  return map;
}

/** Evaluates user rental eligibility.
 * Accepts userDocuments; returns the derived value. */
function evaluateUserRentalEligibility(userDocuments) {
  const byType = documentsByType(userDocuments);
  const identity = evaluateIdentityRequirement(byType);
  const driverLicense = evaluateDriverLicenseRequirement(byType);
  const reasons = [...identity.reasons, ...driverLicense.reasons];

  return {
    eligible: identity.ok && driverLicense.ok,
    reasons,
    statuses: {
      identity: identity.status,
      driverLicense: driverLicense.status,
    },
  };
}

/** Evaluates vehicle rental eligibility.
 * Accepts an options object; returns the derived value. */
function evaluateVehicleRentalEligibility({
  ownerDocuments,
  vehicleDocuments,
  governmentStatus,
  licensePlate = null,
}) {
  const ownerByType = documentsByType(ownerDocuments);
  const scopedPlate =
    licensePlate ??
    vehicleDocuments.find(
      /** Tests whether one collection item is the requested match.
       * Accepts row; returns a boolean used by the collection operation. */
      (row) => row.licensePlate != null)?.licensePlate ??
    null;
  const vehicleByType = documentsByType(vehicleDocuments, {
    licensePlate: scopedPlate,
  });

  const ownerIdentity = evaluateIdentityRequirement(ownerByType);
  const insurance = evaluateVehicleDocumentRequirement(
    vehicleByType,
    "insurance",
    "INSURANCE",
  );
  const registration = evaluateVehicleDocumentRequirement(
    vehicleByType,
    "vehicle_registration",
    "VEHICLE_REGISTRATION",
  );
  const government = evaluateGovernmentRequirement(governmentStatus);

  const ownerReasons = ownerIdentity.reasons.map(
    /** Transforms one collection item for the surrounding mapping operation.
     * Accepts reason; returns the transformed collection value. */
    (reason) =>
    reason.replace(/^IDENTITY_/, "OWNER_IDENTITY_"),
  );

  const reasons = [
    ...ownerReasons,
    ...insurance.reasons,
    ...registration.reasons,
    ...government.reasons,
  ];

  return {
    eligible:
      ownerIdentity.ok &&
      insurance.ok &&
      registration.ok &&
      government.ok,
    reasons,
    statuses: {
      ownerIdentity: ownerIdentity.status,
      insurance: insurance.status,
      vehicleRegistration: registration.status,
      governmentCheck: government.status,
    },
  };
}

module.exports = {
  evaluateUserRentalEligibility,
  evaluateVehicleRentalEligibility,
  evaluateInsuranceCoversRentalPeriod,
};
