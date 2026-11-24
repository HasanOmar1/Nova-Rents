/** Database query helpers for document records.
 * Encapsulates the domain's SQL reads, writes, and result shaping. */
const doQuery = require("../query");
const { queryOnConnection } = require("../withTransaction");

/** Fetches owned license plates.
 * Accepts ownerId; returns a promise for the requested data. */
async function getOwnedLicensePlates(ownerId) {
  const rows = await doQuery(
    `SELECT licensePlate FROM vehicles WHERE ownerId = ? ORDER BY createdAt DESC`,
    [ownerId],
  );
  return rows.map(
    /** Transforms one collection item for the surrounding mapping operation.
     * Accepts row; returns the transformed collection value. */
    (row) => row.licensePlate);
}

/** Fetches document by id.
 * Accepts documentId; returns a promise for the requested data. */
async function getDocumentById(documentId) {
  const rows = await doQuery(
    `SELECT * FROM documents WHERE documentId = ? LIMIT 1`,
    [documentId],
  );
  return rows[0];
}

/** Fetches user scoped documents.
 * Accepts userId; returns a promise for the requested data. */
async function getUserScopedDocuments(userId) {
  return doQuery(
    `
      SELECT *
      FROM documents
      WHERE userId = ?
        AND licensePlate IS NULL
      ORDER BY createdAt DESC
    `,
    [userId],
  );
}

/** Fetches vehicle scoped documents for plates.
 * Accepts licensePlates; returns a promise for the requested data. */
async function getVehicleScopedDocumentsForPlates(licensePlates) {
  if (!licensePlates.length) return [];
  const placeholders = licensePlates.map(
    /** Transforms one collection item for the surrounding mapping operation.
     * Accepts no arguments; returns the transformed collection value. */
    () => "?").join(", ");
  return doQuery(
    `
      SELECT *
      FROM documents
      WHERE licensePlate IN (${placeholders})
      ORDER BY createdAt DESC
    `,
    licensePlates,
  );
}

/** Finds user scoped document on connection.
 * Accepts connection, userId, and documentType; returns a promise for the requested data. */
async function findUserScopedDocumentOnConnection(
  connection,
  userId,
  documentType,
) {
  const rows = await queryOnConnection(
    connection,
    `
      SELECT *
      FROM documents
      WHERE userId = ?
        AND documentType = ?
        AND licensePlate IS NULL
      LIMIT 1
      FOR UPDATE
    `,
    [userId, documentType],
  );
  return rows[0];
}

/** Finds vehicle scoped document on connection.
 * Accepts connection, licensePlate, and documentType; returns a promise for the requested data. */
async function findVehicleScopedDocumentOnConnection(
  connection,
  licensePlate,
  documentType,
) {
  const rows = await queryOnConnection(
    connection,
    `
      SELECT *
      FROM documents
      WHERE licensePlate = ?
        AND documentType = ?
      LIMIT 1
      FOR UPDATE
    `,
    [licensePlate, documentType],
  );
  return rows[0];
}

/** Inserts document on connection.
 * Accepts connection and an options object; returns a promise for the operation result. */
async function insertDocumentOnConnection(
  connection,
  {
    userId,
    licensePlate,
    documentType,
    filePath,
    originalFilename,
    mimeType,
    fileSize,
    documentNumber,
    insuranceCompany,
    startDate,
    expirationDate,
  },
) {
  return queryOnConnection(
    connection,
    `
      INSERT INTO documents (
        userId,
        licensePlate,
        documentType,
        filePath,
        originalFilename,
        mimeType,
        fileSize,
        status,
        documentNumber,
        insuranceCompany,
        startDate,
        expirationDate
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?, ?, ?)
    `,
    [
      userId,
      licensePlate,
      documentType,
      filePath,
      originalFilename,
      mimeType,
      fileSize,
      documentNumber,
      insuranceCompany,
      startDate,
      expirationDate,
    ],
  );
}

/** Replaces document file on connection.
 * Accepts connection, documentId, and an options object; returns a promise for the operation result. */
async function replaceDocumentFileOnConnection(
  connection,
  documentId,
  {
    filePath,
    originalFilename,
    mimeType,
    fileSize,
    documentNumber,
    insuranceCompany,
    startDate,
    expirationDate,
    lastVerifiedFilePath,
    lastVerifiedAt,
  },
) {
  return queryOnConnection(
    connection,
    `
      UPDATE documents
      SET filePath = ?,
          originalFilename = ?,
          mimeType = ?,
          fileSize = ?,
          documentNumber = ?,
          insuranceCompany = ?,
          startDate = ?,
          expirationDate = ?,
          status = 'pending_review',
          verificationMethod = NULL,
          reviewedBy = NULL,
          reviewedAt = NULL,
          rejectionCode = NULL,
          rejectionReasonText = NULL,
          lastVerifiedFilePath = ?,
          lastVerifiedAt = ?,
          insuranceReminder7SentAt = NULL,
          insuranceReminder1SentAt = NULL
      WHERE documentId = ?
    `,
    [
      filePath,
      originalFilename,
      mimeType,
      fileSize,
      documentNumber,
      insuranceCompany,
      startDate,
      expirationDate,
      lastVerifiedFilePath,
      lastVerifiedAt,
      documentId,
    ],
  );
}

const ADMIN_DOCUMENT_SELECT = `
  d.documentId,
  d.userId,
  d.licensePlate,
  d.documentType,
  d.originalFilename,
  d.mimeType,
  d.fileSize,
  d.status,
  d.verificationMethod,
  d.documentNumber,
  d.insuranceCompany,
  d.startDate,
  d.expirationDate,
  d.reviewedBy,
  d.reviewedAt,
  d.rejectionCode,
  d.rejectionReasonText,
  d.lastVerifiedFilePath,
  d.lastVerifiedAt,
  d.createdAt,
  d.updatedAt,
  u.firstName AS accountFirstName,
  u.lastName AS accountLastName,
  u.email AS accountEmail,
  u.phone AS accountPhone,
  DATE_FORMAT(u.birthDate, '%Y-%m-%d') AS accountBirthDate,
  reviewer.firstName AS reviewerFirstName,
  reviewer.lastName AS reviewerLastName,
  reviewer.email AS reviewerEmail,
  v.year AS vehicleYear,
  v.color AS vehicleColor,
  v.ownerId AS vehicleOwnerId,
  cb.brandName,
  cm.modelName,
  gov.status AS governmentCheckStatus,
  gov.checkedAt AS governmentCheckedAt
`;

/** Fetches admin documents.
 * Accepts an options object; returns a promise for the requested data. */
async function getAdminDocuments({
  status = "all",
  documentType = null,
  userId = null,
  licensePlate = null,
  limit = 10,
  offset = 0,
} = {}) {
  let whereClause = "WHERE 1=1";
  const values = [];

  if (status && status !== "all") {
    whereClause += " AND d.status = ?";
    values.push(status);
  }
  if (documentType) {
    whereClause += " AND d.documentType = ?";
    values.push(documentType);
  }
  if (userId) {
    whereClause += " AND d.userId = ?";
    values.push(userId);
  }
  if (licensePlate) {
    whereClause += " AND d.licensePlate = ?";
    values.push(licensePlate);
  }

  const rows = await doQuery(
    `
      SELECT ${ADMIN_DOCUMENT_SELECT}
      FROM documents d
      JOIN users u ON u.userId = d.userId
      LEFT JOIN users reviewer ON reviewer.userId = d.reviewedBy
      LEFT JOIN vehicles v ON v.licensePlate = d.licensePlate
      LEFT JOIN carmodels cm ON v.modelId = cm.modelId
      LEFT JOIN carbrands cb ON cm.brandId = cb.brandId
      LEFT JOIN vehicle_government_checks gov ON gov.licensePlate = d.licensePlate
      ${whereClause}
      ORDER BY d.createdAt DESC
      LIMIT ? OFFSET ?
    `,
    [...values, limit, offset],
  );

  const countRows = await doQuery(
    `SELECT COUNT(*) AS total FROM documents d ${whereClause}`,
    values,
  );

  return { rows, total: countRows[0].total };
}

/** Fetches admin document by id.
 * Accepts documentId; returns a promise for the requested data. */
async function getAdminDocumentById(documentId) {
  const rows = await doQuery(
    `
      SELECT ${ADMIN_DOCUMENT_SELECT}
      FROM documents d
      JOIN users u ON u.userId = d.userId
      LEFT JOIN users reviewer ON reviewer.userId = d.reviewedBy
      LEFT JOIN vehicles v ON v.licensePlate = d.licensePlate
      LEFT JOIN carmodels cm ON v.modelId = cm.modelId
      LEFT JOIN carbrands cb ON cm.brandId = cb.brandId
      LEFT JOIN vehicle_government_checks gov ON gov.licensePlate = d.licensePlate
      WHERE d.documentId = ?
      LIMIT 1
    `,
    [documentId],
  );
  return rows[0];
}

/** Fetches user document status summary.
 * Accepts userId; returns a promise for the requested data. */
async function getUserDocumentStatusSummary(userId) {
  return doQuery(
    `
      SELECT documentId, documentType, status, expirationDate
      FROM documents
      WHERE userId = ?
        AND licensePlate IS NULL
    `,
    [userId],
  );
}

/** Locks and returns a document row for transactional review.
 * Accepts connection and documentId; returns a promise for the operation result. */
async function lockDocumentByIdOnConnection(connection, documentId) {
  const rows = await queryOnConnection(
    connection,
    `
      SELECT *
      FROM documents
      WHERE documentId = ?
      LIMIT 1
      FOR UPDATE
    `,
    [documentId],
  );
  return rows[0];
}

/** Stores an administrator's document review decision on the transaction connection.
 * Accepts connection, documentId, and an options object; returns a promise for the operation result. */
async function applyAdminReviewOnConnection(
  connection,
  documentId,
  {
    status,
    verificationMethod,
    reviewedBy,
    rejectionCode,
    rejectionReasonText,
  },
) {
  return queryOnConnection(
    connection,
    `
      UPDATE documents
      SET status = ?,
          verificationMethod = ?,
          reviewedBy = ?,
          reviewedAt = NOW(),
          rejectionCode = ?,
          rejectionReasonText = ?
      WHERE documentId = ?
        AND status = 'pending_review'
    `,
    [
      status,
      verificationMethod,
      reviewedBy,
      rejectionCode,
      rejectionReasonText,
      documentId,
    ],
  );
}

/** Fetches vehicle for government compare.
 * Accepts licensePlate; returns a promise for the requested data. */
async function getVehicleForGovernmentCompare(licensePlate) {
  const rows = await doQuery(
    `
      SELECT
        v.licensePlate,
        v.year,
        v.color,
        v.fuelType,
        v.ownerId,
        cb.brandName,
        cm.modelName
      FROM vehicles v
      LEFT JOIN carmodels cm ON v.modelId = cm.modelId
      LEFT JOIN carbrands cb ON cm.brandId = cb.brandId
      WHERE v.licensePlate = ?
      LIMIT 1
    `,
    [licensePlate],
  );
  return rows[0];
}

/** Fetches vehicle government check.
 * Accepts licensePlate; returns a promise for the requested data. */
async function getVehicleGovernmentCheck(licensePlate) {
  const rows = await doQuery(
    `SELECT * FROM vehicle_government_checks WHERE licensePlate = ? LIMIT 1`,
    [licensePlate],
  );
  return rows[0];
}

/** Fetches vehicle government checks for plates.
 * Accepts licensePlates; returns a promise for the requested data. */
async function getVehicleGovernmentChecksForPlates(licensePlates) {
  if (!licensePlates.length) return [];
  const placeholders = licensePlates.map(
    /** Transforms one collection item for the surrounding mapping operation.
     * Accepts no arguments; returns the transformed collection value. */
    () => "?").join(", ");
  return doQuery(
    `SELECT * FROM vehicle_government_checks WHERE licensePlate IN (${placeholders})`,
    licensePlates,
  );
}

/** Fetches admin document stats.
 * Accepts no arguments; returns a promise for the requested data. */
async function getAdminDocumentStats() {
  const rows = await doQuery(
    `
      SELECT status, COUNT(*) AS total
      FROM documents
      GROUP BY status
    `,
  );
  const stats = {
    total: 0,
    pending_review: 0,
    verified: 0,
    rejected: 0,
    expired: 0,
  };
  for (const row of rows) {
    const count = Number(row.total);
    stats.total += count;
    if (Object.prototype.hasOwnProperty.call(stats, row.status)) {
      stats[row.status] = count;
    }
  }
  return stats;
}

/** Finds documents due for expiration.
 * Accepts no arguments; returns a promise for the requested data. */
async function findDocumentsDueForExpiration() {
  return doQuery(
    `
      SELECT
        d.documentId,
        d.userId,
        d.documentType,
        d.licensePlate,
        d.expirationDate,
        d.status,
        u.email,
        u.firstName,
        u.lastName,
        cb.brandName,
        cm.modelName,
        v.year
      FROM documents d
      JOIN users u ON u.userId = d.userId
      LEFT JOIN vehicles v ON v.licensePlate = d.licensePlate
      LEFT JOIN carmodels cm ON v.modelId = cm.modelId
      LEFT JOIN carbrands cb ON cm.brandId = cb.brandId
      WHERE d.expirationDate IS NOT NULL
        AND d.expirationDate < CURDATE()
        AND d.status IN ('pending_review', 'verified')
    `,
  );
}

/** Marks document expired.
 * Accepts documentId; returns a promise for the operation result. */
async function markDocumentExpired(documentId) {
  return doQuery(
    `
      UPDATE documents
      SET status = 'expired'
      WHERE documentId = ?
        AND status IN ('pending_review', 'verified')
        AND expirationDate IS NOT NULL
        AND expirationDate < CURDATE()
    `,
    [documentId],
  );
}

const INSURANCE_REMINDER_CLAIM_COLUMN = {
  7: "insuranceReminder7SentAt",
  1: "insuranceReminder1SentAt",
};

/** Finds verified insurance due for reminder.
 * Accepts daysBeforeExpiration; returns a promise for the requested data. */
async function findVerifiedInsuranceDueForReminder(daysBeforeExpiration) {
  return doQuery(
    `
      SELECT
        d.documentId,
        d.userId,
        d.licensePlate,
        d.expirationDate,
        u.email,
        u.firstName,
        u.lastName,
        cb.brandName,
        cm.modelName,
        v.year
      FROM documents d
      JOIN users u ON u.userId = d.userId
      JOIN vehicles v ON v.licensePlate = d.licensePlate
      LEFT JOIN carmodels cm ON v.modelId = cm.modelId
      LEFT JOIN carbrands cb ON cm.brandId = cb.brandId
      WHERE d.documentType = 'insurance'
        AND d.status = 'verified'
        AND d.expirationDate IS NOT NULL
        AND DATEDIFF(d.expirationDate, CURDATE()) = ?
    `,
    [daysBeforeExpiration],
  );
}

/** Atomically claims an insurance reminder so the stage is sent only once.
 * Accepts documentId and daysBeforeExpiration; returns a promise for the claim result. */
async function claimInsuranceReminder(documentId, daysBeforeExpiration) {
  const column = INSURANCE_REMINDER_CLAIM_COLUMN[daysBeforeExpiration];
  if (!column) return false;
  const result = await doQuery(
    `
      UPDATE documents
      SET ${column} = NOW()
      WHERE documentId = ?
        AND documentType = 'insurance'
        AND status = 'verified'
        AND expirationDate IS NOT NULL
        AND DATEDIFF(expirationDate, CURDATE()) = ?
        AND ${column} IS NULL
    `,
    [documentId, daysBeforeExpiration],
  );
  return result.affectedRows > 0;
}

/** Creates or updates vehicle government check.
 * Accepts an options object; returns a promise for the operation result. */
async function upsertVehicleGovernmentCheck({
  licensePlate,
  status,
  governmentSource,
  resourceId,
  matchedFields,
  mismatchedFields,
  governmentDataSnapshot,
  errorMessage,
  requestedBy,
}) {
  return doQuery(
    `
      INSERT INTO vehicle_government_checks (
        licensePlate,
        status,
        checkedAt,
        governmentSource,
        resourceId,
        matchedFields,
        mismatchedFields,
        governmentDataSnapshot,
        errorMessage,
        requestedBy
      )
      VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        checkedAt = NOW(),
        governmentSource = VALUES(governmentSource),
        resourceId = VALUES(resourceId),
        matchedFields = VALUES(matchedFields),
        mismatchedFields = VALUES(mismatchedFields),
        governmentDataSnapshot = VALUES(governmentDataSnapshot),
        errorMessage = VALUES(errorMessage),
        requestedBy = VALUES(requestedBy)
    `,
    [
      licensePlate,
      status,
      governmentSource,
      resourceId,
      matchedFields,
      mismatchedFields,
      governmentDataSnapshot,
      errorMessage,
      requestedBy,
    ],
  );
}

module.exports = {
  getOwnedLicensePlates,
  getDocumentById,
  getUserScopedDocuments,
  getVehicleScopedDocumentsForPlates,
  findUserScopedDocumentOnConnection,
  findVehicleScopedDocumentOnConnection,
  insertDocumentOnConnection,
  replaceDocumentFileOnConnection,
  getAdminDocuments,
  getAdminDocumentById,
  getUserDocumentStatusSummary,
  lockDocumentByIdOnConnection,
  applyAdminReviewOnConnection,
  getVehicleForGovernmentCompare,
  getVehicleGovernmentCheck,
  getVehicleGovernmentChecksForPlates,
  upsertVehicleGovernmentCheck,
  getAdminDocumentStats,
  findDocumentsDueForExpiration,
  markDocumentExpired,
  findVerifiedInsuranceDueForReminder,
  claimInsuranceReminder,
};
