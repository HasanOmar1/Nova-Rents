/** Database query helpers for activity records.
 * Encapsulates the domain's SQL reads, writes, and result shaping. */
const doQuery = require("../query");
const { queryOnConnection } = require("../withTransaction");

const CREATE_ACTIVITY_SQL = `
  INSERT INTO activity_logs
  (userId, action, description, relatedId)
  VALUES (?, ?, ?, ?)
`;

/** Creates activity.
 * Accepts userId, action, description, and relatedId; returns a promise for the operation result. */
async function createActivity(userId, action, description, relatedId = null) {
  return doQuery(CREATE_ACTIVITY_SQL, [
    userId,
    action,
    description,
    relatedId,
  ]);
}

/** Creates activity on connection.
 * Accepts connection, userId, action, description, and relatedId; returns a promise for the operation result. */
async function createActivityOnConnection(
  connection,
  userId,
  action,
  description,
  relatedId = null,
) {
  return queryOnConnection(connection, CREATE_ACTIVITY_SQL, [
    userId,
    action,
    description,
    relatedId,
  ]);
}

/** Fetches activities by user id.
 * Accepts userId; returns a promise for the requested data. */
async function getActivitiesByUserId(userId) {
  const query = `
    SELECT
      logId,
      userId,
      action,
      description,
      relatedId,
      DATE_FORMAT(createdAt, '%d/%m/%Y %H:%i:%s') AS createdAt
    FROM activity_logs
    WHERE userId = ?
    ORDER BY activity_logs.createdAt DESC, activity_logs.logId DESC
    LIMIT 10
  `;

  return await doQuery(query, [userId]);
}

module.exports = {
  createActivity,
  createActivityOnConnection,
  getActivitiesByUserId,
};
