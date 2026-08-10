const doQuery = require("../query");
const { queryOnConnection } = require("../withTransaction");

const ELIGIBLE_VEHICLE_REPORT_SQL = `
  SELECT
    r.rentalId,
    r.renterId,
    r.licensePlate,
    r.status AS rentalStatus,
    r.startDate,
    r.endDate,
    v.ownerId,
    p.paymentId,
    p.status AS paymentStatus,
    p.paidAt
  FROM rentals r
  JOIN vehicles v ON v.licensePlate = r.licensePlate
  JOIN rental_payments p ON p.rentalId = r.rentalId
  WHERE r.rentalId = ?
    AND r.renterId = ?
    AND r.licensePlate = ?
    AND p.status = 'paid'
  LIMIT 1
`;

const ELIGIBLE_OWNER_REPORT_SQL = `
  SELECT
    r.rentalId,
    r.renterId,
    r.licensePlate,
    r.status AS rentalStatus,
    r.startDate,
    r.endDate,
    v.ownerId,
    p.paymentId,
    p.status AS paymentStatus,
    p.paidAt
  FROM rentals r
  JOIN vehicles v ON v.licensePlate = r.licensePlate
  JOIN rental_payments p ON p.rentalId = r.rentalId
  WHERE r.rentalId = ?
    AND r.renterId = ?
    AND v.ownerId = ?
    AND p.status = 'paid'
  LIMIT 1
`;

/**
 * Paid-rental eligibility for a vehicle complaint.
 * Caller must pass renterId from req.session.user.userId (never from the body).
 * Returns one row if this session renter has a paid rental for this rentalId
 * whose licensePlate matches the reported vehicle; otherwise undefined.
 */
async function findEligibleRentalForVehicleReport(
  renterId,
  rentalId,
  licensePlate,
) {
  const rows = await doQuery(ELIGIBLE_VEHICLE_REPORT_SQL, [
    rentalId,
    renterId,
    licensePlate,
  ]);
  return rows[0];
}

async function findEligibleRentalForVehicleReportOnConnection(
  connection,
  renterId,
  rentalId,
  licensePlate,
) {
  const rows = await queryOnConnection(
    connection,
    ELIGIBLE_VEHICLE_REPORT_SQL,
    [rentalId, renterId, licensePlate],
  );
  return rows[0];
}

/**
 * Paid-rental eligibility for an owner complaint.
 * Caller must pass renterId from req.session.user.userId (never from the body).
 * Returns one row if this session renter has a paid rental for this rentalId
 * whose vehicle belongs to the reported ownerId; otherwise undefined.
 */
async function findEligibleRentalForOwnerReport(renterId, rentalId, ownerId) {
  const rows = await doQuery(ELIGIBLE_OWNER_REPORT_SQL, [
    rentalId,
    renterId,
    ownerId,
  ]);
  return rows[0];
}

async function findEligibleRentalForOwnerReportOnConnection(
  connection,
  renterId,
  rentalId,
  ownerId,
) {
  const rows = await queryOnConnection(connection, ELIGIBLE_OWNER_REPORT_SQL, [
    rentalId,
    renterId,
    ownerId,
  ]);
  return rows[0];
}

/** Lock the rental row used as the race-condition sync point. */
async function lockRentalRowForUpdate(connection, rentalId) {
  const rows = await queryOnConnection(
    connection,
    `
      SELECT rentalId, renterId, licensePlate, status
      FROM rentals
      WHERE rentalId = ?
      FOR UPDATE
    `,
    [rentalId],
  );
  return rows[0];
}

/**
 * Active duplicate check — must run after rental FOR UPDATE on the same connection.
 * Active = open or in_review for the same rentalId + complaintType.
 */
async function findActiveComplaintForRentalTypeOnConnection(
  connection,
  rentalId,
  complaintType,
) {
  const rows = await queryOnConnection(
    connection,
    `
      SELECT complaintId, status
      FROM complaints
      WHERE rentalId = ?
        AND complaintType = ?
        AND status IN ('open', 'in_review')
      LIMIT 1
    `,
    [rentalId, complaintType],
  );
  return rows[0];
}

async function createComplaintOnConnection(
  connection,
  userId,
  rentalId,
  complaintType,
  vehicleLicensePlate,
  ownerId,
  title,
  description,
  images,
) {
  return queryOnConnection(
    connection,
    `
      INSERT INTO complaints
      (userId, rentalId, complaintType, vehicleLicensePlate, ownerId, title, description, images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      rentalId,
      complaintType,
      vehicleLicensePlate,
      ownerId,
      title,
      description,
      images,
    ],
  );
}

/**
 * Active vehicle reports for vehicles owned by session user.
 * Never selects reporter identity columns (userId / email / name / phone).
 */
async function getActiveVehicleComplaintsForOwner(ownerId) {
  const query = `
    SELECT
      c.complaintId,
      c.vehicleLicensePlate,
      c.title,
      c.description,
      c.status,
      c.resolutionMessage,
      c.respondedAt,
      c.createdAt,
      c.rentalId,
      cb.brandName,
      cm.modelName
    FROM complaints c
    JOIN vehicles v ON c.vehicleLicensePlate = v.licensePlate
    LEFT JOIN carmodels cm ON v.modelId = cm.modelId
    LEFT JOIN carbrands cb ON cm.brandId = cb.brandId
    WHERE v.ownerId = ?
      AND c.complaintType = 'vehicle'
      AND c.status IN ('open', 'in_review')
    ORDER BY c.createdAt DESC
  `;
  return doQuery(query, [ownerId]);
}

/**
 * Owner-type complaints targeting the session user as reported owner.
 * Never selects reporter identity columns (userId / email / name / phone).
 */
async function getComplaintsAboutOwner(
  ownerId,
  { limit = 5, offset = 0 } = {},
) {
  const query = `
    SELECT
      c.complaintId,
      c.title,
      c.description,
      c.status,
      c.resolutionMessage,
      c.respondedAt,
      c.createdAt,
      c.rentalId
    FROM complaints c
    WHERE c.ownerId = ?
      AND c.complaintType = 'owner'
    ORDER BY c.createdAt DESC
    LIMIT ? OFFSET ?
  `;
  return doQuery(query, [ownerId, limit, offset]);
}

async function countComplaintsAboutOwner(ownerId) {
  const result = await doQuery(
    `
      SELECT COUNT(*) AS totalReports
      FROM complaints
      WHERE ownerId = ?
        AND complaintType = 'owner'
    `,
    [ownerId],
  );

  return Number(result[0]?.totalReports) || 0;
}

/**
 * All vehicle-type complaints targeting vehicles currently owned by the
 * session user. Reporter identity and private admin notes are intentionally
 * excluded from the result.
 */
async function getComplaintsAboutOwnerVehicles(
  ownerId,
  { limit = 5, offset = 0 } = {},
) {
  const query = `
    SELECT
      c.complaintId,
      c.vehicleLicensePlate,
      c.title,
      c.description,
      c.status,
      c.resolutionMessage,
      c.respondedAt,
      c.createdAt,
      cb.brandName,
      cm.modelName
    FROM complaints c
    INNER JOIN vehicles v ON c.vehicleLicensePlate = v.licensePlate
    LEFT JOIN carmodels cm ON v.modelId = cm.modelId
    LEFT JOIN carbrands cb ON cm.brandId = cb.brandId
    WHERE v.ownerId = ?
      AND c.complaintType = 'vehicle'
    ORDER BY c.createdAt DESC, c.complaintId DESC
    LIMIT ? OFFSET ?
  `;

  return doQuery(query, [ownerId, limit, offset]);
}

async function countComplaintsAboutOwnerVehicles(ownerId) {
  const result = await doQuery(
    `
      SELECT COUNT(*) AS totalReports
      FROM complaints c
      INNER JOIN vehicles v ON c.vehicleLicensePlate = v.licensePlate
      WHERE v.ownerId = ?
        AND c.complaintType = 'vehicle'
    `,
    [ownerId],
  );

  return Number(result[0]?.totalReports) || 0;
}

// Personal complaint history for one reporter. Always scoped by userId.
// Optional date/status filters use the same half-open createdAt pattern as
// other reports. LEFT JOINs keep both vehicle and owner complaints visible
// even when a related record is missing. vehicleOwner is separate from the
// targeted owner (c.ownerId) so listed-owner text works for vehicle rows.
async function getComplaintsByUserId(
  userId,
  {
    status = "all",
    startDate = null,
    endDate = null,
    limit = 5,
    offset = 0,
  } = {},
) {
  let whereClause = "WHERE c.userId = ?";
  const values = [userId];

  if (status && status !== "all") {
    whereClause += " AND c.status = ?";
    values.push(status);
  }

  if (startDate && endDate) {
    whereClause +=
      " AND c.createdAt >= ? AND c.createdAt < DATE_ADD(?, INTERVAL 1 DAY)";
    values.push(startDate, endDate);
  }

  const query = `
    SELECT
      c.complaintId,
      c.complaintType,
      c.vehicleLicensePlate,
      c.ownerId,
      c.title,
      c.description,
      c.images,
      c.status,
      c.resolutionMessage,
      c.respondedAt,
      c.createdAt,
      v.modelId,
      cm.modelName,
      cb.brandName,
      u.firstName AS ownerFirstName,
      u.lastName AS ownerLastName,
      u.email AS ownerEmail,
      vehicleOwner.firstName AS vehicleOwnerFirstName,
      vehicleOwner.lastName AS vehicleOwnerLastName,
      vehicleOwner.email AS vehicleOwnerEmail
    FROM complaints c
    LEFT JOIN vehicles v ON c.vehicleLicensePlate = v.licensePlate
    LEFT JOIN carmodels cm ON v.modelId = cm.modelId
    LEFT JOIN carbrands cb ON cm.brandId = cb.brandId
    LEFT JOIN users u ON c.ownerId = u.userId
    LEFT JOIN users vehicleOwner ON v.ownerId = vehicleOwner.userId
    ${whereClause}
    ORDER BY c.createdAt DESC
    LIMIT ? OFFSET ?
  `;

  values.push(limit, offset);
  return doQuery(query, values);
}

async function countComplaintsByUserId(
  userId,
  { status = "all", startDate = null, endDate = null } = {},
) {
  let whereClause = "WHERE userId = ?";
  const values = [userId];

  if (status && status !== "all") {
    whereClause += " AND status = ?";
    values.push(status);
  }

  if (startDate && endDate) {
    whereClause +=
      " AND createdAt >= ? AND createdAt < DATE_ADD(?, INTERVAL 1 DAY)";
    values.push(startDate, endDate);
  }

  const result = await doQuery(
    `SELECT COUNT(*) AS total FROM complaints ${whereClause}`,
    values,
  );
  return result[0].total;
}

// --- UPDATED: Added status filtering, limit, and offset ---
async function getAllComplaints(status, limit, offset) {
  let whereClause = "WHERE 1=1";
  const values = [];

  if (status && status !== "all") {
    whereClause += " AND c.status = ?";
    values.push(status);
  }

  const query = `
    SELECT 
      c.complaintId,
      c.userId,
      c.complaintType,
      c.vehicleLicensePlate,
      c.ownerId,
      c.title,
      c.description,
      c.images,
      c.status,
      c.adminNotes,
      c.resolutionMessage,
      c.createdAt,
      v.modelId,
      cm.modelName,
      cb.brandName,
      u.firstName AS ownerFirstName,
      u.lastName AS ownerLastName,
      u.email AS ownerEmail,
      complainer.firstName AS complainerFirstName,
      complainer.lastName AS complainerLastName,
      complainer.email AS complainerEmail,
      complainer.phone AS complainerPhone,
      vehicleOwner.firstName AS vehicleOwnerFirstName,
      vehicleOwner.lastName AS vehicleOwnerLastName,
      vehicleOwner.email AS vehicleOwnerEmail,
      vehicleOwner.phone AS vehicleOwnerPhone
    FROM complaints c
    LEFT JOIN vehicles v ON c.vehicleLicensePlate = v.licensePlate
    LEFT JOIN carmodels cm ON v.modelId = cm.modelId
    LEFT JOIN carbrands cb ON cm.brandId = cb.brandId
    LEFT JOIN users u ON c.ownerId = u.userId
    LEFT JOIN users complainer ON c.userId = complainer.userId
    LEFT JOIN users vehicleOwner ON v.ownerId = vehicleOwner.userId
    ${whereClause}
    ORDER BY c.createdAt DESC
    LIMIT ? OFFSET ?
  `;

  values.push(limit, offset);
  return doQuery(query, values);
}

//  Gets total count for pagination
async function countAllComplaints(status) {
  let whereClause = "WHERE 1=1";
  const values = [];
  if (status && status !== "all") {
    whereClause += " AND status = ?";
    values.push(status);
  }
  const result = await doQuery(
    `SELECT COUNT(*) as total FROM complaints ${whereClause}`,
    values,
  );
  return result[0].total;
}

//  Gets stats for the top cards
async function getComplaintStats() {
  const query = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
      SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as review,
      SUM(CASE WHEN status = 'resolved'  THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN status = 'closed'  THEN 1 ELSE 0 END) as closed

    FROM complaints
  `;
  const result = await doQuery(query);
  return result[0];
}

async function updateComplaintStatus(
  complaintId,
  status,
  resolutionMessage,
  adminNotes,
) {
  const query = `
    UPDATE complaints
    SET status = ?,
        resolutionMessage = ?,
        adminNotes = ?,
        respondedAt = NOW()
    WHERE complaintId = ?
  `;

  return doQuery(query, [status, resolutionMessage, adminNotes, complaintId]);
}

async function getComplaintReporterById(complaintId) {
  const query = `
    SELECT
      c.complaintId,
      c.complaintType,
      c.title,
      c.status,
      c.respondedAt,
      c.rentalId,
      c.vehicleLicensePlate,
      c.ownerId,
      c.userId AS reporterId,
      u.email AS reporterEmail,
      u.firstName AS reporterFirstName
    FROM complaints c
    INNER JOIN users u ON c.userId = u.userId
    WHERE c.complaintId = ?
  `;

  const result = await doQuery(query, [complaintId]);
  return result[0];
}

// Complaints counted by submission time (createdAt), bucketed with the
// caller's DATE_FORMAT pattern. createdAt is a DATETIME, so the end bound
// uses < DATE_ADD(end, 1 DAY) to include the whole final day.
// An optional status narrows the count to one complaint status.
async function getComplaintTrendsByRange(
  startDate,
  endDate,
  status,
  dateFormat,
) {
  let whereClause = `
    WHERE createdAt >= ?
    AND createdAt < DATE_ADD(?, INTERVAL 1 DAY)
  `;
  const values = [dateFormat, startDate, endDate];

  if (status && status !== "all") {
    whereClause += " AND status = ?";
    values.push(status);
  }

  const query = `
    SELECT
      DATE_FORMAT(createdAt, ?) AS periodKey,
      COUNT(*) AS complaints
    FROM complaints
    ${whereClause}
    GROUP BY periodKey
    ORDER BY periodKey ASC
  `;
  return doQuery(query, values);
}

module.exports = {
  findEligibleRentalForVehicleReport,
  findEligibleRentalForVehicleReportOnConnection,
  findEligibleRentalForOwnerReport,
  findEligibleRentalForOwnerReportOnConnection,
  lockRentalRowForUpdate,
  findActiveComplaintForRentalTypeOnConnection,
  createComplaintOnConnection,
  getActiveVehicleComplaintsForOwner,
  getComplaintsAboutOwner,
  countComplaintsAboutOwner,
  getComplaintsAboutOwnerVehicles,
  countComplaintsAboutOwnerVehicles,
  getComplaintsByUserId,
  countComplaintsByUserId,
  getAllComplaints,
  countAllComplaints,
  getComplaintStats,
  updateComplaintStatus,
  getComplaintReporterById,
  getComplaintTrendsByRange,
};
