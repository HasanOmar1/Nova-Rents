const doQuery = require("../query");

async function createNotification(userId, rentalId, type, title, message) {
  const createNotification = `INSERT INTO notifications (userId , rentalId , type ,title ,message) VALUES (?, ?, ?, ?, ?)`;
  const valuesOfcreateNotification = [userId, rentalId, type, title, message];
  const result = await doQuery(createNotification, valuesOfcreateNotification);
  return result;
}

async function getNotificationsByUserId(userId) {
  const getNotificationsByUserId = `
    SELECT
      n.notificationId,
      n.userId,
      n.rentalId,
      n.type,
      n.title,
      n.message,
      n.isRead,
      DATE_FORMAT(n.createdAt, '%d/%m/%Y %H:%i:%s') AS createdAt
    FROM notifications n
    WHERE n.userId = ?
    ORDER BY n.createdAt DESC, n.notificationId DESC
  `;
  const valuesOfgetNotificationsByUserId = [userId];
  const result = await doQuery(
    getNotificationsByUserId,
    valuesOfgetNotificationsByUserId,
  );
  return result;
}

async function markNotificationAsRead(notificationId, userId) {
  const query = `UPDATE notifications SET isRead = 1 WHERE notificationId = ? and userId = ?`;
  const valuesOfquery = [notificationId, userId];
  const result = await doQuery(query, valuesOfquery);
  return result;
}

async function getUnreadNotificationsCount(userId) {
  const query = `SELECT COUNT(*)  AS unreadCount FROM notifications WHERE userId = ? AND isRead = 0`;
  const valuesOfquery = [userId];
  const result = await doQuery(query, valuesOfquery);
  return result[0];
}

async function checkIfNotificationExists(userId, rentalId, type) {
  const query = `
    SELECT notificationId
    FROM notifications
    WHERE userId = ?
    AND rentalId = ?
    AND type = ?
  `;
  const valuesOfquery = [userId, rentalId, type];
  const result = await doQuery(query, valuesOfquery);
  return result.length > 0;
}

module.exports = {
  createNotification,
  getNotificationsByUserId,
  markNotificationAsRead,
  getUnreadNotificationsCount,
  checkIfNotificationExists,
};
