/** Express route definitions for reported users endpoints.
 * Maps HTTP requests and access checks to the corresponding controllers. */
const express = require("express");
const { isAdmin } = require("../middleWare/authMiddleware");
const { listReportedUsers, listUserReports, listWarnings, warnUser, removeLatestWarning } = require("../controllers/reportedUsersController");

const router = express.Router();
router.use(isAdmin);
router.get("/", listReportedUsers);
router.get("/:userId/reports", listUserReports);
router.get("/:userId/warnings", listWarnings);
router.post("/:userId/warnings", warnUser);
router.delete("/:userId/warnings/latest", removeLatestWarning);
module.exports = router;
