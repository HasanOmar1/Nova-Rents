const express = require("express");
const { isAdmin } = require("../middleWare/authMiddleware");
const { listReportedUsers, listUserReports, listWarnings, warnUser } = require("../controllers/reportedUsersController");

const router = express.Router();
router.use(isAdmin);
router.get("/", listReportedUsers);
router.get("/:userId/reports", listUserReports);
router.get("/:userId/warnings", listWarnings);
router.post("/:userId/warnings", warnUser);
module.exports = router;
