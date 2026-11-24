/** Database query helpers for system history records.
 * Encapsulates the domain's SQL reads, writes, and result shaping. */
const doQuery = require("../query");
const { queryOnConnection } = require("../withTransaction");

const CREATE_SYSTEM_HISTORY_SQL = `
  INSERT INTO system_history
  (actorUserId, category, operation, eventName, entityType, entityId, rentalId, vehicleLicensePlate, description)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

/** Orders system-history fields into the SQL parameter array.
 * Accepts actorUserId, category, operation, eventName, entityType, entityId, rentalId, vehicleLicensePlate, and description; returns the ordered SQL parameter array. */
function systemHistoryValues(
  actorUserId,
  category,
  operation,
  eventName,
  entityType,
  entityId,
  rentalId,
  vehicleLicensePlate,
  description,
) {
  return [
    actorUserId,
    category,
    operation,
    eventName,
    entityType,
    entityId,
    rentalId,
    vehicleLicensePlate,
    description,
  ];
}

/** Creates system history.
 * Accepts actorUserId, category, operation, eventName, entityType, entityId, rentalId, vehicleLicensePlate, and description; returns a promise for the operation result. */
async function createSystemHistory(
  actorUserId,
  category,
  operation,
  eventName,
  entityType,
  entityId = null,
  rentalId = null,
  vehicleLicensePlate = null,
  description = null,
) {
  return doQuery(
    CREATE_SYSTEM_HISTORY_SQL,
    systemHistoryValues(
      actorUserId,
      category,
      operation,
      eventName,
      entityType,
      entityId,
      rentalId,
      vehicleLicensePlate,
      description,
    ),
  );
}

/** Creates system history on connection.
 * Accepts connection, actorUserId, category, operation, eventName, entityType, entityId, rentalId, vehicleLicensePlate, and description; returns a promise for the operation result. */
async function createSystemHistoryOnConnection(
  connection,
  actorUserId,
  category,
  operation,
  eventName,
  entityType,
  entityId = null,
  rentalId = null,
  vehicleLicensePlate = null,
  description = null,
) {
  return queryOnConnection(
    connection,
    CREATE_SYSTEM_HISTORY_SQL,
    systemHistoryValues(
      actorUserId,
      category,
      operation,
      eventName,
      entityType,
      entityId,
      rentalId,
      vehicleLicensePlate,
      description,
    ),
  );
}

/** Fetches system activity chart data.
 * Accepts startDate, endDate, and dateFormat; returns a promise for the requested data. */
async function getSystemActivityChartData(startDate, endDate, dateFormat) {
  const query = `
    SELECT 
      DATE_FORMAT(createdAt, ?) as periodKey,
      category,
      operation,
      eventName,
      COUNT(*) as operations
    FROM system_history
    WHERE createdAt >= ? AND createdAt <= ?
    GROUP BY periodKey, category, operation, eventName
    ORDER BY periodKey ASC
  `;
  return doQuery(query, [dateFormat, startDate, endDate]);
}

// One user's own actions (actorUserId) bucketed with the caller's
// DATE_FORMAT pattern — same row shape as getSystemActivityChartData so the
// personal Platform Usage chart matches the admin System Activity contract.
/** Fetches user activity chart data.
 * Accepts actorUserId, startDate, endDate, and dateFormat; returns a promise for the requested data. */
async function getUserActivityChartData(
  actorUserId,
  startDate,
  endDate,
  dateFormat,
) {
  const query = `
    SELECT
      DATE_FORMAT(createdAt, ?) AS periodKey,
      category,
      operation,
      eventName,
      COUNT(*) AS operations
    FROM system_history
    WHERE actorUserId = ?
    AND createdAt >= ?
    AND createdAt < DATE_ADD(?, INTERVAL 1 DAY)
    GROUP BY periodKey, category, operation, eventName
    ORDER BY periodKey ASC
  `;
  return doQuery(query, [dateFormat, actorUserId, startDate, endDate]);
}

module.exports = {
  createSystemHistory,
  createSystemHistoryOnConnection,
  getSystemActivityChartData,
  getUserActivityChartData,
};
