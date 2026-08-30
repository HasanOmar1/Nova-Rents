const express = require("express");
const router = express.Router();

const complaintsController = require("../controllers/complaintsController");
const { isAuthenticated } = require("../middleWare/authMiddleware");
const {
  upload,
  validateUploadedImages,
} = require("../middleWare/uploadMiddleware");
router.post(
  "/",
  isAuthenticated,
  upload.array("images", 4),
  validateUploadedImages,
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
  "/owner-vehicle-reports/:licensePlate",
  isAuthenticated,
  complaintsController.getOwnerVehicleReportHistory_controller,
);

router.get(
  "/about-me",
  isAuthenticated,
  complaintsController.getComplaintsAboutMe_controller,
);

router.get(
  "/about-my-vehicles",
  isAuthenticated,
  complaintsController.getComplaintsAboutMyVehicles_controller,
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
