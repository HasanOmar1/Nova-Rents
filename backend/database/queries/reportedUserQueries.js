const doQuery = require("../query");
const { queryOnConnection } = require("../withTransaction");

function buildComplaintFilter(status, startDate, endDate, alias = "c") {
  const conditions = [];
  const values = [];
  if (status !== "all") {
    conditions.push(`${alias}.status = ?`);
    values.push(status);
  }
  if (startDate) {
    conditions.push(`${alias}.createdAt >= ?`);
    values.push(startDate);
  }
  if (endDate) {
    conditions.push(`${alias}.createdAt < DATE_ADD(?, INTERVAL 1 DAY)`);
    values.push(endDate);
  }
  return {
    sql: conditions.length ? ` AND ${conditions.join(" AND ")}` : "",
    values,
  };
}

async function getReportedUsers({ page, limit, search, accountStatus, complaintStatus, startDate, endDate, sortBy }) {
  const offset = (page - 1) * limit;
  const direct = buildComplaintFilter(complaintStatus, startDate, endDate, "c");
  const vehicle = buildComplaintFilter(complaintStatus, startDate, endDate, "c");
  const userWhere = ["u.role <> 'admin'", "(u.firstName LIKE ? OR u.lastName LIKE ? OR u.email LIKE ?)"];
  const searchTerm = `%${search}%`;
  const userValues = [searchTerm, searchTerm, searchTerm];
  if (accountStatus !== "all") {
    userWhere.push("u.status = ?");
    userValues.push(accountStatus);
  }

  const aggregates = `
    LEFT JOIN (
      SELECT c.ownerId AS targetUserId, COUNT(*) AS directReports,
        SUM(c.status = 'open') AS directOpen, SUM(c.status = 'in_review') AS directReview,
        SUM(c.status = 'resolved') AS directResolved, MAX(c.createdAt) AS directLast
      FROM complaints c
      WHERE c.complaintType = 'owner'${direct.sql}
      GROUP BY c.ownerId
    ) d ON d.targetUserId = u.userId
    LEFT JOIN (
      SELECT v.ownerId AS targetUserId, COUNT(*) AS vehicleReports,
        SUM(c.status = 'open') AS vehicleOpen, SUM(c.status = 'in_review') AS vehicleReview,
        SUM(c.status = 'resolved') AS vehicleResolved, MAX(c.createdAt) AS vehicleLast
      FROM complaints c
      INNER JOIN vehicles v ON v.licensePlate = c.vehicleLicensePlate
      WHERE c.complaintType = 'vehicle'${vehicle.sql}
      GROUP BY v.ownerId
    ) vr ON vr.targetUserId = u.userId
    LEFT JOIN (
      SELECT userId, COUNT(*) AS warningCount
      FROM user_warnings
      WHERE removedAt IS NULL
      GROUP BY userId
    ) w ON w.userId = u.userId`;
  const aggregateValues = [...direct.values, ...vehicle.values];
  const where = `WHERE ${userWhere.join(" AND ")}`;
  const orderBy = {
    total_reports: "totalReports DESC, lastReportDate DESC, u.userId DESC",
    recent_report: "lastReportDate DESC, totalReports DESC, u.userId DESC",
    warning_count: "warningCount DESC, totalReports DESC, u.userId DESC",
    open_reports: "openReports DESC, totalReports DESC, u.userId DESC",
    email_asc: "u.email ASC, u.userId DESC",
  }[sortBy] || "totalReports DESC, lastReportDate DESC, u.userId DESC";
  const rows = await doQuery(`
    SELECT u.userId, u.firstName, u.lastName, u.email, u.phone, u.status,
      COALESCE(d.directReports, 0) AS directReports,
      COALESCE(vr.vehicleReports, 0) AS vehicleReports,
      COALESCE(d.directReports, 0) + COALESCE(vr.vehicleReports, 0) AS totalReports,
      COALESCE(d.directOpen, 0) + COALESCE(vr.vehicleOpen, 0) AS openReports,
      COALESCE(d.directReview, 0) + COALESCE(vr.vehicleReview, 0) AS inReviewReports,
      COALESCE(d.directResolved, 0) + COALESCE(vr.vehicleResolved, 0) AS resolvedReports,
      COALESCE(w.warningCount, 0) AS warningCount,
      GREATEST(COALESCE(d.directLast, '1000-01-01'), COALESCE(vr.vehicleLast, '1000-01-01')) AS lastReportDate
    FROM users u ${aggregates} ${where}
    HAVING totalReports > 0
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?`, [...aggregateValues, ...userValues, limit, offset]);

  const count = await doQuery(`
    SELECT COUNT(*) AS total FROM (
      SELECT u.userId, COALESCE(d.directReports, 0) + COALESCE(vr.vehicleReports, 0) AS totalReports
      FROM users u ${aggregates} ${where}
      HAVING totalReports > 0
    ) reported`, [...aggregateValues, ...userValues]);
  return { rows, total: Number(count[0]?.total) || 0 };
}

async function getReportsForUser(userId) {
  return doQuery(`
    SELECT c.complaintId, c.complaintType, c.title, c.description, c.status,
      c.createdAt, c.vehicleLicensePlate, c.adminNotes, c.resolutionMessage
    FROM complaints c
    LEFT JOIN vehicles v ON v.licensePlate = c.vehicleLicensePlate
    WHERE (c.complaintType = 'owner' AND c.ownerId = ?)
       OR (c.complaintType = 'vehicle' AND v.ownerId = ?)
    ORDER BY c.createdAt DESC, c.complaintId DESC`, [userId, userId]);
}

async function getWarningHistory(userId) {
  return doQuery(`
    SELECT w.warningId, w.reason, w.createdAt,
      a.firstName AS adminFirstName, a.lastName AS adminLastName
    FROM user_warnings w INNER JOIN users a ON a.userId = w.adminId
    WHERE w.userId = ? AND w.removedAt IS NULL
    ORDER BY w.createdAt ASC, w.warningId ASC`, [userId]);
}

async function lockTargetUser(connection, userId) {
  const rows = await queryOnConnection(connection,
    "SELECT userId, firstName, email, role, status FROM users WHERE userId = ? FOR UPDATE", [userId]);
  return rows[0];
}

async function countWarningsOnConnection(connection, userId) {
  const rows = await queryOnConnection(connection,
    "SELECT COUNT(*) AS count FROM user_warnings WHERE userId = ? AND removedAt IS NULL", [userId]);
  return Number(rows[0]?.count) || 0;
}

async function insertWarningOnConnection(connection, userId, adminId, reason) {
  return queryOnConnection(connection,
    "INSERT INTO user_warnings (userId, adminId, reason) VALUES (?, ?, ?)", [userId, adminId, reason]);
}

async function blockUserOnConnection(connection, userId) {
  return queryOnConnection(connection, "UPDATE users SET status = 'blocked' WHERE userId = ?", [userId]);
}

async function removeLatestWarningOnConnection(connection, userId, adminId) {
  const warnings = await queryOnConnection(connection, `
    SELECT warningId, reason
    FROM user_warnings
    WHERE userId = ? AND removedAt IS NULL
    ORDER BY createdAt DESC, warningId DESC
    LIMIT 1
    FOR UPDATE`, [userId]);
  const warning = warnings[0];
  if (!warning) return null;
  await queryOnConnection(connection, `
    UPDATE user_warnings
    SET removedAt = NOW(), removedByAdminId = ?
    WHERE warningId = ? AND removedAt IS NULL`, [adminId, warning.warningId]);
  return warning;
}

module.exports = { getReportedUsers, getReportsForUser, getWarningHistory, lockTargetUser,
  countWarningsOnConnection, insertWarningOnConnection, blockUserOnConnection,
  removeLatestWarningOnConnection };
