const express = require("express");
const router = express.Router();

const reportController = require("../controllers/reportController");
const { isAdmin, isAuthenticated } = require("../middleWare/authMiddleware");

router.get(
  "/system-activity",
  isAdmin,
  reportController.getSystemActivityChart_controller,
);

router.get(
  "/statistics",
  isAdmin,
  reportController.getStatistics_controller,
);

// User-scoped report: any authenticated user, data always scoped to the
// session user inside the controller.
router.get(
  "/user-dashboard",
  isAuthenticated,
  reportController.getUserDashboardReport_controller,
);

module.exports = router;
