// Express routes for vehicle actions: list, my vehicles, add, update, delete
const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleWare/authMiddleware");
const vehicleQueries = require("../controllers/vehiclesController");
const upload = require("../middleWare/uploadMiddleware");

router.get("/", vehicleQueries.getAllVehicles);
router.get("/brands", vehicleQueries.getAllCarBrands);
router.get("/models", vehicleQueries.getAllCarModels);
router.get("/types", vehicleQueries.getAllCarTypes);
router.get("/myVehicles", isAuthenticated, vehicleQueries.getUserVehicles);
router.get("/:licensePlate", vehicleQueries.getVehicleById);
// router.post("/add", isAuthenticated, vehicleQueries.addVehicle);
router.put("/:licensePlate", isAuthenticated, vehicleQueries.updateVehicle);
router.delete("/:licensePlate", isAuthenticated, vehicleQueries.deleteVehicle);

// accept max 4 images
router.post(
  "/add",
  isAuthenticated,
  upload.array("images", 4),
  vehicleQueries.addVehicle,
);

module.exports = router;
