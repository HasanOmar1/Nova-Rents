const doQuery = require("../query");

async function createActivity(userId, action, description, relatedId = null) {
  const query = `
    INSERT INTO activity_logs
    (userId, action, description, relatedId)
    VALUES (?, ?, ?, ?)
  `;

  return await doQuery(query, [userId, action, description, relatedId]);
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
    ORDER BY createdAt DESC
    LIMIT 10
  `;

  return await doQuery(query, [userId]);
}

module.exports = {
  createActivity,
  getActivitiesByUserId,
};
