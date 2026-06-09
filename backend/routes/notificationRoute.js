const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleWare/authMiddleware");
const notificationController = require("../controllers/notificationController");


router.get("/my-notifications", isAuthenticated, notificationController.getMyNotifications_controller);
router.get("/unread-notifications-count", isAuthenticated, notificationController.getUnreadNotificationsCount_controller);
router.put("/mark-notification-as-read/:notificationId", isAuthenticated, notificationController.markNotificationAsRead_controller);


module.exports = router;