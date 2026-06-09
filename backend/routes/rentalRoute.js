const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleWare/authMiddleware");
const rentalController = require("../controllers/rentalController");

router.post("/rent", isAuthenticated, rentalController.createRental);
router.get("/my-rentals", isAuthenticated, rentalController.getMyRentals);
router.get("/requests-for-my-vehicles", isAuthenticated, rentalController.getRequestsForMyVehicles);
router.put("/approve-rental/:rentalId", isAuthenticated, rentalController.approveRental);
router.put("/reject-rental/:rentalId", isAuthenticated, rentalController.rejectRental);
router.put("/cancel-rental/:rentalId", isAuthenticated, rentalController.cancelRental);
router.put("/update-vehicle-status/:licensePlate", isAuthenticated, rentalController.updateVehicleStatus);
module.exports = router;