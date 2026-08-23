function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isExpirationDatePast(expirationDate) {
  if (!expirationDate) return false;
  const date = new Date(expirationDate);
  if (Number.isNaN(date.getTime())) return false;
  date.setHours(0, 0, 0, 0);
  return date < startOfToday();
}

function slotStatus(doc) {
  if (!doc) return "not_uploaded";
  if (doc.status === "verified" && isExpirationDatePast(doc.expirationDate)) {
    return "expired";
  }
  return doc.status;
}

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

function normalizeDateOnly(value) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

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

function evaluateVehicleRentalEligibility({
  ownerDocuments,
  vehicleDocuments,
  governmentStatus,
  licensePlate = null,
}) {
  const ownerByType = documentsByType(ownerDocuments);
  const scopedPlate =
    licensePlate ??
    vehicleDocuments.find((row) => row.licensePlate != null)?.licensePlate ??
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

  const ownerReasons = ownerIdentity.reasons.map((reason) =>
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
