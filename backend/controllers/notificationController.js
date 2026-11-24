/** Express controller handlers for notification operations.
 * Validates requests and returns the domain's HTTP responses. */
const STATUS_CODE = require("../constants/statusCodes");
const {
  getNotificationsByUserId,
  markNotificationAsRead,
  getUnreadNotificationsCount,
} = require("../database/queries/notificationQueries");

const { validateAuthenticatedUser } = require("../utils/validsController");

/** Fetches my notifications.
 * Accepts req, res, and next; returns a promise after sending a response or forwarding an error. */
async function getMyNotifications_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const userId = req.session.user.userId;
    const notifications = await getNotificationsByUserId(userId);
    return res
      .status(STATUS_CODE.OK)
      .json({
        message: "Notifications fetched successfully",
          notifications,
          count: notifications.length,
      });
  } catch (error) {
    next(error);
  }
}
/** Fetches unread notifications count.
 * Accepts req, res, and next; returns a promise after sending a response or forwarding an error. */
async function getUnreadNotificationsCount_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const userId = req.session.user.userId;
    const count = await getUnreadNotificationsCount(userId);
    return res.status(STATUS_CODE.OK).json({ message: "Unread notifications count fetched successfully" ,count});
  } catch (error) {
    next(error);
  }
}


/** Marks notification as read.
 * Accepts req, res, and next; returns a promise after sending a response or forwarding an error. */
async function markNotificationAsRead_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const userId = req.session.user.userId;
    const { notificationId } = req.params;
    const result = await markNotificationAsRead(notificationId , userId);
    return res.status(STATUS_CODE.OK).json({ message: "Notification marked as read successfully" ,result});
  } catch (error) {
    next(error);
  }
}


module.exports = { getMyNotifications_controller , getUnreadNotificationsCount_controller , markNotificationAsRead_controller };
