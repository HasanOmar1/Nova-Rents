const express = require("express");
const router = express.Router();

const reportController = require("../controllers/reportController");
const { isAdmin } = require("../middleWare/authMiddleware");

router.get(
  "/system-activity",
  isAdmin,
  reportController.getSystemActivityChart_controller,
);

module.exports = router;
