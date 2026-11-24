/** Express route definitions for activity endpoints.
 * Maps HTTP requests and access checks to the corresponding controllers. */
express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleWare/authMiddleware");
const activityController = require("../controllers/activityController");

router.get("/my-activity-logs", isAuthenticated, activityController.getActivitiesByUserId_controller);

module.exports = router;
