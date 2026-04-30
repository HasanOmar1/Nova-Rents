// Handlers for vehicle-related database actions (list, add, update, delete)
const doQuery = require("../database/query");
const { checkVehicleNumberInGovIL } = require("../services/govApiService");
const STATUS_CODE = require("../constants/statusCodes");
const {
  getVehicleByLicensePlate,
} = require("../database/queries/vehicleQueries");
const {
  validateAndNormalizeVehicleCreate,
  validateAndMergeVehicleUpdate,
  validateAuthenticatedUser,
} = require("../utils/validsController");

const getUserVehicles = async (req, res, next) => {
  try {
    if (
      !validateAuthenticatedUser(
        req,
        res,
        "You must be logged in to see your vehicles",
      )
    )
      return;

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
    const { userId, vehicle } = normalized;
    const {
      licensePlate,
      modelId,
      fuelType,
      expirationDate,
      image,
      year,
      km,
      address,
      price,
      color,
    } = vehicle;

    const isVehicleNumberInGovIL =
      await checkVehicleNumberInGovIL(licensePlate);
    if (!isVehicleNumberInGovIL) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Vehicle number is not in the government database",
      });
    }

    const checkIfVehicleAlreadyExists = await getVehicleByLicensePlate(licensePlate);
    if (checkIfVehicleAlreadyExists) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Vehicle already exists",
      });
    }

    const insertQuery = `
     INSERT INTO vehicles 
     (licensePlate,fuelType, expirationDate, image, year, km, address, price, color, modelId, ownerId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      licensePlate,
      fuelType,
      expirationDate,
      image,
      year,
      km,
      address,
      price,
      color,
      modelId,
      userId,
    ];
    await doQuery(insertQuery, values);
    const newVehicle = await getVehicleByLicensePlate(licensePlate);
    res.status(STATUS_CODE.CREATED).json({
      message: "Vehicle added successfully",
      vehicle: newVehicle,
    });
  } catch (error) {
    next(error);
  }
};

const getVehicleById = async (req, res, next) => {
  try {
    const { licensePlate } = req.params;

    const query = `SELECT * FROM vehicles v 
    JOIN carModels cm ON v.modelId = cm.modelId
    JOIN carBrands cb ON cm.brandId = cb.brandId
    JOIN carTypes ct ON cm.carTypeId = ct.carTypeId
    WHERE v.licensePlate = ?`;
    const result = await doQuery(query, [licensePlate]);
    res.status(STATUS_CODE.OK).json({
      message: "Vehicle fetched successfully",
      vehicle: result,
    });
  } catch (error) {
    next(error);
  }
};

const deleteVehicle = async (req, res, next) => {
  try {
    const { licensePlate } = req.params;

    if (
      !validateAuthenticatedUser(
        req,
        res,
        "You must be logged in to delete a vehicle",
      )
    )
      return;

    const existingVehicle = await getVehicleByLicensePlate(licensePlate);
    if (!existingVehicle) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "No vehicle found with this license plate",
      });
    }

    if (existingVehicle.ownerId !== req.session.user.userId) {
      return res.status(STATUS_CODE.FORBIDDEN).json({
        message: "You do not have permission to delete this vehicle",
      });
    }

    const deleteQuery = "DELETE FROM vehicles WHERE licensePlate = ?";
    await doQuery(deleteQuery, [licensePlate]);

    res.status(STATUS_CODE.OK).json({
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const updateVehicle = async (req, res, next) => {
  try {
    const { licensePlate } = req.params;

    if (
      !validateAuthenticatedUser(
        req,
        res,
        "You must be logged in to perform this action.",
      )
    )
      return;

    const existingVehicle = await getVehicleByLicensePlate(licensePlate);
    if (!existingVehicle) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "Vehicle not found" });
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
  addVehicle,
  getVehicleById,
  deleteVehicle,
  updateVehicle,
  getUserVehicles,
};
