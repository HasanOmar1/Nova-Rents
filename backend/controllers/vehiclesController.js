// Handlers for vehicle-related database actions (list, add, update, delete)
const doQuery = require("../database/query");
const STATUS_CODE = require("../../constants/statusCodes");
const {
  getVehicleByLicensePlate,
} = require("../database/queries/vehicleQueries");

const {
  validateAndNormalizeVehicleCreate,
  validateAndMergeVehicleUpdate,
  throwErr,
} = require("../../utils/Valids");

// Get all vehicles in the system, newest year first (used on "All Vehicles" page)
const getAllVehicles = async (req, res, next) => {
  try {
    const query = "Select * from vehicles ORDER BY year DESC";
    const result = await doQuery(query);
    res.send(result);
  } catch (error) {
    next(error);
  }
};
// Get only the vehicles that belong to the currently logged-in user
const getUserVehicles = async (req, res, next) => {
  try {
    if (!req.session.user) {
      throwErr(
        STATUS_CODE.UNAUTHORIZED,
        "You must be logged in to see your vehicles",
        res,
      );
    }

    const { userId } = req.session?.user;
    const query = "Select * from vehicles where ownerId = ? ORDER BY year DESC";
    const result = await doQuery(query, [userId]);
    res.send(result);
  } catch (error) {
    next(error);
  }
};
// Add a new vehicle for the logged-in user after validation and duplicate check
const addVehicle = async (req, res, next) => {
  try {
    const { userId, vehicle } = validateAndNormalizeVehicleCreate(req, res);
    const {
      licensePlate,
      make,
      fuelType,
      expirationDate,
      image,
      year,
      km,
      address,
      price,
      color,
    } = vehicle;

    // 5. Duplicate Check (Using the Integer)
    const existingVehicle = await getVehicleByLicensePlate(licensePlate);
    if (existingVehicle) {
      throwErr(
        STATUS_CODE.CONFLICT,
        "A vehicle with this license plate already exists.",
        res,
      );
    }

    // 6. Database Insertion
    const insertQuery = `
      INSERT INTO vehicles (licensePlate, make, fuelType, expirationDate, image, year, km, address, price, color, ownerId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      licensePlate, // Stored as INT in SQL
      make,
      fuelType,
      expirationDate,
      image,
      year,
      km,
      address,
      price,
      color,
      userId,
    ];

    await doQuery(insertQuery, values);

    return res.status(STATUS_CODE.CREATED).json({
      message: "Vehicle added successfully to Rentaro",
      licensePlate: licensePlate,
    });
  } catch (error) {
    next(error);
  }
};
// Get a single vehicle by its license plate
const getVehicleById = async (req, res, next) => {
  try {
    const { licensePlate } = req.params;
    const vehicle = await getVehicleByLicensePlate(licensePlate);

    if (!vehicle) {
      throwErr(
        STATUS_CODE.NOT_FOUND,
        "No vehicle found with this license plate",
        res,
      );
    }

    res.send(vehicle);
  } catch (error) {
    next(error);
  }
};
// Delete a vehicle: only the owner (current user) can delete their own vehicle
const deleteVehicle = async (req, res, next) => {
  try {
    const { licensePlate } = req.params;

    if (!req.session.user) {
      throwErr(
        STATUS_CODE.UNAUTHORIZED,
        "You must be logged in to delete a vehicle",
        res,
      );
    }

    const vehicle = await getVehicleByLicensePlate(licensePlate);

    if (!vehicle) {
      throwErr(
        STATUS_CODE.NOT_FOUND,
        "No vehicle found with this license plate",
        res,
      );
    }

    if (vehicle.ownerId !== req.session.user.userId) {
      throwErr(
        STATUS_CODE.FORBIDDEN,
        "You do not have permission to delete this vehicle",
        res,
      );
    }

    const deleteQuery = "DELETE FROM vehicles WHERE licensePlate = ?";
    await doQuery(deleteQuery, [licensePlate]);

    res.json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    next(error);
  }
};
// Update vehicle details: validates input and ensures only the owner can update
const updateVehicle = async (req, res, next) => {
  try {
    const { licensePlate } = req.params;

    const existingVehicle = await getVehicleByLicensePlate(licensePlate);
    if (!existingVehicle) {
      throwErr(STATUS_CODE.NOT_FOUND, "Vehicle not found", res);
    }

    if (existingVehicle.ownerId !== req.session.user.userId) {
      throwErr(
        STATUS_CODE.FORBIDDEN,
        "You cannot update someone else's car",
        res,
      );
    }

    // Validate and merge updates (with session check inside)
    const mergedData = validateAndMergeVehicleUpdate(
      existingVehicle,
      req.body,
      req,
      res,
    );

    const {
      make,
      fuelType,
      expirationDate,
      image,
      year,
      km,
      address,
      price,
      color,
    } = mergedData;

    const updateQuery = `
      UPDATE vehicles SET make = ? , fuelType = ?, expirationDate = ?, image = ?, year = ?, km = ?, address = ?, price = ?, color = ? 
      WHERE licensePlate = ? 
    `;

    const values = [
      make,
      fuelType,
      expirationDate,
      image,
      year,
      km,
      address,
      price,
      color,
      licensePlate,
    ];

    await doQuery(updateQuery, values);

    const updatedVehicle = await getVehicleByLicensePlate(licensePlate);

    res.status(STATUS_CODE.OK).json({
      message: "Vehicle updated successfully",
      vehicle: updatedVehicle,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllVehicles,
  addVehicle,
  getVehicleById,
  deleteVehicle,
  updateVehicle,
  getUserVehicles,
};
