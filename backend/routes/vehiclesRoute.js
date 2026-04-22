// Express routes for vehicle actions: list, my vehicles, add, update, delete
const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleWare/authMiddleware");
const vehicleQueries = require("../controllers/vehiclesController");

// router.get("/", vehicleQueries.getAllVehiclesSortedByLatestYear);
// router.get("/myVehicles", isAuthenticated, vehicleQueries.getUserVehicles);
// router.get("/:licensePlate", vehicleQueries.getVehicleById);
// router.delete("/:licensePlate", isAuthenticated, vehicleQueries.deleteVehicle);
// router.post("/add", isAuthenticated, vehicleQueries.addVehicle);
// router.put("/:licensePlate", isAuthenticated, vehicleQueries.updateVehicle);

module.exports = router;
