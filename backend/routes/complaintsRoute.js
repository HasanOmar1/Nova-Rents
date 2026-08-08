const express = require("express");
const router = express.Router();

const complaintsController = require("../controllers/complaintsController");
const { isAuthenticated } = require("../middleWare/authMiddleware");
const upload = require("../middleWare/uploadMiddleware");
router.post(
  "/",
  isAuthenticated,
  upload.array("images", 4),
  complaintsController.createComplaint_controller,
);

router.get(
  "/my",
  isAuthenticated,
  complaintsController.getMyComplaints_controller,
);

router.get(
  "/owner-vehicle-reports",
  isAuthenticated,
  complaintsController.getOwnerVehicleReports_controller,
);

router.get(
  "/about-me",
  isAuthenticated,
  complaintsController.getComplaintsAboutMe_controller,
);

router.get(
  "/trends",
  isAuthenticated,
  complaintsController.getComplaintTrends_controller,
);

router.get(
  "/",
  isAuthenticated,
  complaintsController.getAllComplaints_controller,
);

router.put(
  "/:complaintId/status",
  isAuthenticated,
  complaintsController.updateComplaintStatus_controller,
);

module.exports = router;
