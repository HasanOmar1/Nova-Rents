// Handlers for vehicle-related database actions (list, add, update, delete)
const doQuery = require("../database/query");
const STATUS_CODE = require("../constants/statusCodes");
const {
  getVehicleByLicensePlate,
} = require("../database/queries/vehicleQueries");
const {
  validateAndNormalizeVehicleCreate,
  validateAndMergeVehicleUpdate,
  validateAuthenticatedUser,
} = require("../utils/validsController");

const getAllVehiclesSortedByLatestYear = async (req, res, next) => {
  try {
    const query = "Select * from vehicles ORDER BY year DESC";
    const result = await doQuery(query);
    res.send(result);
  } catch (error) {
    next(error);
  }
};

const getUserVehicles = async (req, res, next) => {
  try {
    if (!validateAuthenticatedUser(req, res, "You must be logged in to see your vehicles")) return;

    const { userId } = req.session.user;
    const query = "Select * from vehicles where ownerId = ? ORDER BY year DESC";
    const result = await doQuery(query, [userId]);
    res.send(result);
  } catch (error) {
    next(error);
  }
};

const addVehicle = async (req, res, next) => {
  try {
    const normalized = validateAndNormalizeVehicleCreate(req, res);
    if (!normalized) return;

    const carModel = await doQuery("SELECT * FROM carModels WHERE modelId = ? AND brandId = ? AND carTypeId = ?", [modelId, brandId, typeId]);
    if (carModel.length === 0) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "No car model found with this modelId, brandId and typeId",
      });
    }

    const { userId, vehicle } = normalized;
    const {
      licensePlate,
      brandId,
      modelId,
      typeId,
      fuelType,
      expirationDate,
      image,
      year,
      km,
      address,
      price,
      color,
    } = vehicle;

    const existingVehicle = await getVehicleByLicensePlate(licensePlate);
    if (existingVehicle) {
      return res.status(STATUS_CODE.CONFLICT).json({
        message: "A vehicle with this license plate already exists.",
      });
    }

    const insertQuery = `
      INSERT INTO vehicles (licensePlate,modelId, fuelType, expirationDate, image, year, km, address, price, color, ownerId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      licensePlate,
      brandId,
      modelId,
      typeId,
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
      message: "Vehicle added successfully to NovaRents",
      licensePlate,
    });
  } catch (error) {
    next(error);
  }
};

const getVehicleById = async (req, res, next) => {
  try {
    const { licensePlate } = req.params;
    const vehicle = await getVehicleByLicensePlate(licensePlate);

    if (!vehicle) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "No vehicle found with this license plate",
      });
    }

    res.send(vehicle);
  } catch (error) {
    next(error);
  }
};

const deleteVehicle = async (req, res, next) => {
  try {
    const { licensePlate } = req.params;

    if (!validateAuthenticatedUser(req, res, "You must be logged in to delete a vehicle")) return;

    const vehicle = await getVehicleByLicensePlate(licensePlate);
    if (!vehicle) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "No vehicle found with this license plate",
      });
    }

    if (vehicle.ownerId !== req.session.user.userId) {
      return res.status(STATUS_CODE.FORBIDDEN).json({
        message: "You do not have permission to delete this vehicle",
      });
    }

    const deleteQuery = "DELETE FROM vehicles WHERE licensePlate = ?";
    await doQuery(deleteQuery, [licensePlate]);

    res.json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const updateVehicle = async (req, res, next) => {
  try {
    const { licensePlate } = req.params;

    if (!validateAuthenticatedUser(req, res, "You must be logged in to perform this action.")) return;

    const existingVehicle = await getVehicleByLicensePlate(licensePlate);
    if (!existingVehicle) {
      return res.status(STATUS_CODE.NOT_FOUND).json({ message: "Vehicle not found" });
    }

    if (existingVehicle.ownerId !== req.session.user.userId) {
      return res.status(STATUS_CODE.FORBIDDEN).json({
        message: "You cannot update someone else's car",
      });
    }

    const mergedData = validateAndMergeVehicleUpdate(
      existingVehicle,
      req.body,
      req,
      res,
    );
    if (!mergedData) return;

    const {
      brandId,
      modelId,
      typeId,
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
      UPDATE vehicles
      SET brandId = ?, modelId = ?, typeId = ?, fuelType = ?, expirationDate = ?, image = ?, year = ?, km = ?, address = ?, price = ?, color = ?
      WHERE licensePlate = ?
    `;

    const values = [
      brandId,
      modelId,
      typeId,
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
  getAllVehiclesSortedByLatestYear,
  addVehicle,
  getVehicleById,
  deleteVehicle,
  updateVehicle,
  getUserVehicles,
};
