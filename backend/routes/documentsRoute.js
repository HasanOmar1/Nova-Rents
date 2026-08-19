const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin } = require("../middleWare/authMiddleware");
const {
  documentUpload,
  handleDocumentUploadError,
} = require("../middleWare/documentUploadMiddleware");
const documentsController = require("../controllers/documentsController");

router.post(
  "/",
  isAuthenticated,
  (req, res, next) => {
    documentUpload.single("file")(req, res, (err) => {
      if (err) return handleDocumentUploadError(err, req, res, next);
      next();
    });
  },
  documentsController.uploadOrReplaceDocument_controller,
);

router.get(
  "/me",
  isAuthenticated,
  documentsController.getMyDocuments_controller,
);

router.get(
  "/admin",
  isAuthenticated,
  isAdmin,
  documentsController.getAdminDocuments_controller,
);

router.get(
  "/admin/vehicles/:licensePlate/government-check",
  isAuthenticated,
  isAdmin,
  documentsController.getVehicleGovernmentCheck_controller,
);

router.post(
  "/admin/vehicles/:licensePlate/government-check",
  isAuthenticated,
  isAdmin,
  documentsController.runVehicleGovernmentCheck_controller,
);

router.get(
  "/admin/:documentId",
  isAuthenticated,
  isAdmin,
  documentsController.getAdminDocumentById_controller,
);

router.put(
  "/admin/:documentId/verify",
  isAuthenticated,
  isAdmin,
  documentsController.verifyDocument_controller,
);

router.put(
  "/admin/:documentId/reject",
  isAuthenticated,
  isAdmin,
  documentsController.rejectDocument_controller,
);

router.get(
  "/:documentId/file",
  isAuthenticated,
  documentsController.getDocumentFile_controller,
);

router.get(
  "/:documentId",
  isAuthenticated,
  documentsController.getDocumentById_controller,
);

module.exports = router;
