const doQuery = require("../query");
const {
  evaluateUserRentalEligibility,
  evaluateVehicleRentalEligibility,
  evaluateInsuranceCoversRentalPeriod,
} = require("../../utils/documentEligibility");

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

async function getUserRentalEligibility(userId) {
  const documents = await getUserScopedDocumentsForEligibility(userId);
  return evaluateUserRentalEligibility(documents);
}

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
    )
    AND EXISTS (
      SELECT 1
      FROM vehicle_government_checks vgc
      WHERE vgc.licensePlate = ${v}.licensePlate
        AND vgc.status = 'verified'
    )
  `;
}

async function getVehicleEligibilitySummariesForPlates(platesWithOwners) {
  if (!platesWithOwners.length) return new Map();

  const plates = [...new Set(platesWithOwners.map((row) => String(row.licensePlate)))];
  const ownerIds = [...new Set(platesWithOwners.map((row) => Number(row.ownerId)))];
  const plateParams = plates.map(() => "?").join(", ");
  const ownerParams = ownerIds.map(() => "?").join(", ");

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
    governmentRows.map((row) => [String(row.licensePlate), row.status]),
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
  getUserScopedDocumentsForEligibility,
  getVehicleScopedDocumentsForEligibility,
  getGovernmentCheckStatus,
  getUserRentalEligibility,
  getVehicleRentalEligibility,
  getVehicleRentalEligibilityForNewRental,
  getPublicVerificationEligibilitySql,
  getVehicleEligibilitySummariesForPlates,
};
