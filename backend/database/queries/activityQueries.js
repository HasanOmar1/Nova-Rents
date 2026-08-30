const doQuery = require("../query");
const { queryOnConnection } = require("../withTransaction");

const CREATE_ACTIVITY_SQL = `
  INSERT INTO activity_logs
  (userId, action, description, relatedId)
  VALUES (?, ?, ?, ?)
`;

async function createActivity(userId, action, description, relatedId = null) {
  return doQuery(CREATE_ACTIVITY_SQL, [
    userId,
    action,
    description,
    relatedId,
  ]);
}

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
