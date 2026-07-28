const doQuery = require("../query");

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
  const query = `
    INSERT INTO system_history
    (actorUserId, category, operation, eventName, entityType, entityId, rentalId, vehicleLicensePlate, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  return doQuery(query, [
    actorUserId,
    category,
    operation,
    eventName,
    entityType,
    entityId,
    rentalId,
    vehicleLicensePlate,
    description,
  ]);
}

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
  getSystemActivityChartData,
  getUserActivityChartData,
};
