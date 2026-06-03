const { getVehicleByLicensePlate } = require("../database/queries/vehicleQueries");
const doQuery = require("../database/query");
const STATUS_CODE = require("../constants/statusCodes");
const { validateAuthenticatedUser } = require("../utils/validsController");
async function createRental(req, res, next) {
  try {
    
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!")) return;
    const renterId = req.session.user.userId;
    const { licensePlate, startDate, endDate } = req.body;
    if(!licensePlate || !startDate || !endDate) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({ message: "All fields are required" });
    }
    const vehicle = await getVehicleByLicensePlate(licensePlate);
    if(!vehicle) {
      return res.status(STATUS_CODE.NOT_FOUND).json({ message: "Vehicle not found" });
    }
    if(renterId === vehicle.ownerId) {
      return res.status(STATUS_CODE.FORBIDDEN).json({ message: "You cannot rent your own vehicle" });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if(start >= end) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({ message: "Start date cannot be after end date" });
    }
    if(start < new Date()) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({ message: "Start date cannot be in the past" });
    }
    if(end < new Date()) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({ message: "End date cannot be in the past" });
    }
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalPrice = days * vehicle.price;

    const insertQuery = "INSERT INTO rentals (renterId, licensePlate, startDate, endDate, totalPrice) VALUES (?, ?, ?, ?, ?)";

    const values = [renterId, licensePlate, start, end, totalPrice];
    const result = await doQuery(insertQuery, values);
    if(result.affectedRows === 0) {
      return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({ message: "Failed to create rental" });
    }
    return res.status(STATUS_CODE.CREATED).json({ message: "Rental created successfully" });

  } catch (error) {
    next(error);
  }
}
module.exports = { createRental };