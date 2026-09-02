/** Database query helpers for eligibility records.
 * Encapsulates the domain's SQL reads, writes, and result shaping. */
const doQuery = require("../query");
const {
  evaluateUserRentalEligibility,
  evaluateVehicleRentalEligibility,
  evaluateInsuranceCoversRentalPeriod,
} = require("../../utils/documentEligibility");

/** Fetches user scoped documents for eligibility.
 * Accepts userId; returns a promise for the requested data. */
async function getUserScopedDocumentsForEligibility(userId) {
  return doQuery(
    `
      SELECT documentId, userId, documentType, status, expirationDate, licensePlate
      FROM documents
      WHERE userId = ?
        AND licensePlate IS NULL
    `,
    [userId],
  );
}

/** Fetches vehicle scoped documents for eligibility.
 * Accepts licensePlate; returns a promise for the requested data. */
async function getVehicleScopedDocumentsForEligibility(licensePlate) {
  return doQuery(
    `
      SELECT documentId, userId, documentType, status, expirationDate, licensePlate
      FROM documents
      WHERE licensePlate = ?
        AND documentType IN ('insurance', 'vehicle_registration')
    `,
    [licensePlate],
  );
}

/** Fetches government check status.
 * Accepts licensePlate; returns a promise for the requested data. */
async function getGovernmentCheckStatus(licensePlate) {
  const rows = await doQuery(
    `
      SELECT status
      FROM vehicle_government_checks
      WHERE licensePlate = ?
      LIMIT 1
    `,
    [licensePlate],
  );
  return rows[0]?.status || "not_checked";
}

/** Fetches user rental eligibility.
 * Accepts userId; returns a promise for the requested data. */
async function getUserRentalEligibility(userId) {
  const documents = await getUserScopedDocumentsForEligibility(userId);
  return evaluateUserRentalEligibility(documents);
}

/** Fetches vehicle rental eligibility.
 * Accepts licensePlate and ownerId; returns a promise for the requested data. */
async function getVehicleRentalEligibility(licensePlate, ownerId) {
  const [ownerDocuments, vehicleDocuments, governmentStatus] = await Promise.all([
    getUserScopedDocumentsForEligibility(ownerId),
    getVehicleScopedDocumentsForEligibility(licensePlate),
    getGovernmentCheckStatus(licensePlate),
  ]);

  return evaluateVehicleRentalEligibility({
    ownerDocuments,
    vehicleDocuments,
    governmentStatus,
    licensePlate,
  });
}

/** Fetches vehicle rental eligibility for new rental.
 * Accepts licensePlate, ownerId, and rentalEndDate; returns a promise for the requested data. */
async function getVehicleRentalEligibilityForNewRental(
  licensePlate,
  ownerId,
  rentalEndDate,
) {
  const base = await getVehicleRentalEligibility(licensePlate, ownerId);
  if (!base.eligible) {
    return base;
  }

  const vehicleDocuments = await getVehicleScopedDocumentsForEligibility(
    licensePlate,
  );
  const insurance = vehicleDocuments.find(
    /** Tests whether one collection item is the requested match.
     * Accepts row; returns a boolean used by the collection operation. */
    (row) => row.documentType === "insurance",
  );
  const period = evaluateInsuranceCoversRentalPeriod(
    insurance,
    rentalEndDate,
    licensePlate,
  );

  if (period.ok) {
    return base;
  }

  return {
    eligible: false,
    reasons: period.reasons,
    statuses: {
      ...base.statuses,
      insurance: period.status,
    },
  };
}

/**
 * SQL fragments for public vehicle browse: operational filters remain in the
 * controller; these conditions gate verification eligibility centrally.
 */
/** Fetches public verification eligibility sql.
 * Accepts an options object; returns the requested data. */
function getPublicVerificationEligibilitySql({ vehicleAlias = "v" } = {}) {
  const v = vehicleAlias;
  return `
    EXISTS (
      SELECT 1
      FROM documents d
      WHERE d.userId = ${v}.ownerId
        AND d.licensePlate IS NULL
        AND d.documentType IN ('identity_card', 'passport')
        AND d.status = 'verified'
        AND (d.expirationDate IS NULL OR d.expirationDate >= CURDATE())
    )
    AND EXISTS (
      SELECT 1
      FROM documents d
      WHERE d.licensePlate = ${v}.licensePlate
        AND d.documentType = 'insurance'
        AND d.status = 'verified'
        AND (d.expirationDate IS NULL OR d.expirationDate >= CURDATE())
    )
    AND EXISTS (
      SELECT 1
      FROM documents d
      WHERE d.licensePlate = ${v}.licensePlate
        AND d.documentType = 'vehicle_registration'
        AND d.status = 'verified'
        AND (d.expirationDate IS NULL OR d.expirationDate >= CURDATE())
    )
    AND EXISTS (
      SELECT 1
      FROM vehicle_government_checks vgc
      WHERE vgc.licensePlate = ${v}.licensePlate
        AND vgc.status = 'verified'
    )
  `;
}

/** Fetches effective vehicle status sql.
 * Accepts an options object; returns the requested data. */
function getEffectiveVehicleStatusSql({
  vehicleAlias = "v",
  ownerAlias = "u",
} = {}) {
  const verificationSql = getPublicVerificationEligibilitySql({
    vehicleAlias,
  });

  return `
    CASE
      WHEN ${ownerAlias}.status = 'blocked' THEN 'unavailable'
      WHEN ${vehicleAlias}.status IN ('maintenance', 'inactive')
        THEN ${vehicleAlias}.status
      WHEN EXISTS (
        SELECT 1
        FROM rentals active_rental
        WHERE active_rental.licensePlate = ${vehicleAlias}.licensePlate
          AND active_rental.status = 'approved'
          AND active_rental.startDate <= CURRENT_DATE()
          AND active_rental.endDate >= CURRENT_DATE()
      ) THEN 'rented'
      WHEN NOT (${verificationSql}) THEN 'not_validated'
      ELSE 'available'
    END
  `;
}

/** Derives effective vehicle status.
 * Accepts an options object; returns the derived value. */
function deriveEffectiveVehicleStatus({
  status,
  ownerStatus,
  rentalEligibility,
  hasActiveRental = false,
}) {
  if (String(ownerStatus || "").toLowerCase() === "blocked") {
    return "unavailable";
  }

  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus === "maintenance" || normalizedStatus === "inactive") {
    return normalizedStatus;
  }

  if (hasActiveRental) {
    return "rented";
  }

  if (!rentalEligibility?.eligible) {
    return "not_validated";
  }

  return "available";
}

/** Fetches vehicle eligibility summaries for plates.
 * Accepts platesWithOwners; returns a promise for the requested data. */
async function getVehicleEligibilitySummariesForPlates(platesWithOwners) {
  if (!platesWithOwners.length) return new Map();

  const plates = [...new Set(platesWithOwners.map(
    /** Transforms one collection item for the surrounding mapping operation.
     * Accepts row; returns the transformed collection value. */
    (row) => String(row.licensePlate)))];
  const ownerIds = [...new Set(platesWithOwners.map(
    /** Transforms one collection item for the surrounding mapping operation.
     * Accepts row; returns the transformed collection value. */
    (row) => Number(row.ownerId)))];
  const plateParams = plates.map(
    /** Transforms one collection item for the surrounding mapping operation.
     * Accepts no arguments; returns the transformed collection value. */
    () => "?").join(", ");
  const ownerParams = ownerIds.map(
    /** Transforms one collection item for the surrounding mapping operation.
     * Accepts no arguments; returns the transformed collection value. */
    () => "?").join(", ");

  const [ownerDocuments, vehicleDocuments, governmentRows] = await Promise.all([
    doQuery(
      `
        SELECT documentId, userId, documentType, status, expirationDate, licensePlate
        FROM documents
        WHERE userId IN (${ownerParams})
          AND licensePlate IS NULL
      `,
      ownerIds,
    ),
    doQuery(
      `
        SELECT documentId, userId, documentType, status, expirationDate, licensePlate
        FROM documents
        WHERE licensePlate IN (${plateParams})
          AND documentType IN ('insurance', 'vehicle_registration')
      `,
      plates,
    ),
    doQuery(
      `
        SELECT licensePlate, status
        FROM vehicle_government_checks
        WHERE licensePlate IN (${plateParams})
      `,
      plates,
    ),
  ]);

  const ownerDocsByUserId = new Map();
  for (const row of ownerDocuments) {
    const key = Number(row.userId);
    if (!ownerDocsByUserId.has(key)) ownerDocsByUserId.set(key, []);
    ownerDocsByUserId.get(key).push(row);
  }

  const vehicleDocsByPlate = new Map();
  for (const row of vehicleDocuments) {
    const key = String(row.licensePlate);
    if (!vehicleDocsByPlate.has(key)) vehicleDocsByPlate.set(key, []);
    vehicleDocsByPlate.get(key).push(row);
  }

  const govByPlate = new Map(
    governmentRows.map(
      /** Transforms one collection item for the surrounding mapping operation.
       * Accepts row; returns the transformed collection value. */
      (row) => [String(row.licensePlate), row.status]),
  );

  const summaries = new Map();
  for (const { licensePlate, ownerId } of platesWithOwners) {
    const plateKey = String(licensePlate);
    summaries.set(
      plateKey,
      evaluateVehicleRentalEligibility({
        ownerDocuments: ownerDocsByUserId.get(Number(ownerId)) || [],
        vehicleDocuments: vehicleDocsByPlate.get(plateKey) || [],
        governmentStatus: govByPlate.get(plateKey) || "not_checked",
        licensePlate: plateKey,
      }),
    );
  }

  return summaries;
}

module.exports = {
  getUserRentalEligibility,
  getVehicleRentalEligibility,
  getVehicleRentalEligibilityForNewRental,
  getPublicVerificationEligibilitySql,
  getEffectiveVehicleStatusSql,
  deriveEffectiveVehicleStatus,
  getVehicleEligibilitySummariesForPlates,
};
