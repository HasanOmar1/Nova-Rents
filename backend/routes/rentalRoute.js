const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleWare/authMiddleware");
const rentalController = require("../controllers/rentalController");

router.post("/rent", isAuthenticated, rentalController.createRental);
module.exports = router;