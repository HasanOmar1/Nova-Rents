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

    const query = `
      SELECT 
        v.licensePlate,
        v.fuelType,
        v.expirationDate,
        v.image,
        v.year,
        v.km,
        v.address,
        v.price,
        v.color,
        v.status,
        v.ownerId,

        cm.modelId,
        cm.modelName,

        cb.brandId,
        cb.brandName,

        ct.carTypeId,
        ct.carTypeName

      FROM vehicles v
      JOIN carModels cm ON v.modelId = cm.modelId
      JOIN carBrands cb ON cm.brandId = cb.brandId
      JOIN carTypes ct ON cm.carTypeId = ct.carTypeId

      WHERE v.ownerId = ?
      ORDER BY v.year DESC
    `;

    const result = await doQuery(query, [userId]);

    res.status(STATUS_CODE.OK).json({
      message: "User vehicles fetched successfully",
      count: result.length,
      vehicles: result,
    });
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

    // const isVehicleNumberInGovIL =
    //   await checkVehicleNumberInGovIL(licensePlate);
    // if (!isVehicleNumberInGovIL) {
    //   return res.status(STATUS_CODE.BAD_REQUEST).json({
    //     message: "Vehicle number is not in the government database",
    //   });
    // }

    const checkIfVehicleAlreadyExists =
      await getVehicleByLicensePlate(licensePlate);
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

    const query = `
      SELECT 
        v.licensePlate,
        v.fuelType,
        v.expirationDate,
        v.image,
        v.year,
        v.km,
        v.address,
        v.price,
        v.color,
        v.status,
        v.ownerId,

        cm.modelId,
        cm.modelName,

        cb.brandId,
        cb.brandName,

        ct.carTypeId,
        ct.carTypeName,

        u.firstName AS ownerFirstName,
        u.lastName AS ownerLastName,
        u.email AS ownerEmail,
        u.phone AS ownerPhone

      FROM vehicles v
      JOIN carModels cm ON v.modelId = cm.modelId
      JOIN carBrands cb ON cm.brandId = cb.brandId
      JOIN carTypes ct ON cm.carTypeId = ct.carTypeId
      JOIN users u ON v.ownerId = u.userId
      WHERE v.licensePlate = ?
    `;

    const result = await doQuery(query, [licensePlate]);

    if (result.length === 0) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "Vehicle not found",
      });
    }

    res.status(STATUS_CODE.OK).json({
      message: "Vehicle fetched successfully",
      vehicle: result[0],
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
      modelId,
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
      SET modelId = ?, fuelType = ?, expirationDate = ?, image = ?, year = ?, km = ?, address = ?, price = ?, color = ?
      WHERE licensePlate = ?
    `;

    const values = [
      modelId,
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

const getAllVehicles = async (req, res, next) => {
  try {
    const {
      brand,
      model,
      type,
      color,
      fuelType,
      location,
      minPrice,
      maxPrice,
      minYear,
      maxYear,
      minKm,
      maxKm,
    } = req.query;

    let query = `
      SELECT 
        v.licensePlate,
        v.fuelType,
        DATE_FORMAT(v.expirationDate, '%d/%m/%Y') AS expirationDate,
        v.image,
        v.year,
        v.km,
        v.address,
        v.price,
        v.color,
        v.status,
        v.ownerId,
        

        cm.modelId,
        cm.modelName,

        cb.brandId,
        cb.brandName,

        ct.carTypeId,
        ct.carTypeName,
        u.firstName AS ownerFirstName,
        u.lastName AS ownerLastName,
        u.email AS ownerEmail,
        u.phone AS ownerPhone

      FROM vehicles v
      JOIN carModels cm ON v.modelId = cm.modelId
      JOIN carBrands cb ON cm.brandId = cb.brandId
      JOIN carTypes ct ON cm.carTypeId = ct.carTypeId
      Join users u ON v.ownerId = u.userId
      WHERE 1 = 1
    `;

    const values = [];
    if (brand) {
      query += ` AND cb.brandName = ?`;
      values.push(brand);
    }

    if (model) {
      query += ` AND cm.modelName = ?`;
      values.push(model);
    }

    if (type) {
      query += ` AND ct.carTypeName = ?`;
      values.push(type);
    }

    if (color) {
      query += ` AND v.color = ?`;
      values.push(color);
    }

    if (fuelType) {
      query += ` AND v.fuelType = ?`;
      values.push(fuelType);
    }

    if (location) {
      query += ` AND v.address LIKE ?`;
      values.push(`%${location}%`);
    }

    if (minPrice) {
      query += ` AND v.price >= ?`;
      values.push(Number(minPrice));
    }

    if (maxPrice) {
      query += ` AND v.price <= ?`;
      values.push(Number(maxPrice));
    }

    if (minYear) {
      query += ` AND v.year >= ?`;
      values.push(Number(minYear));
    }

    if (maxYear) {
      query += ` AND v.year <= ?`;
      values.push(Number(maxYear));
    }

    if (minKm) {
      query += ` AND v.km >= ?`;
      values.push(Number(minKm));
    }

    if (maxKm) {
      query += ` AND v.km <= ?`;
      values.push(Number(maxKm));
    }

    query += ` ORDER BY v.year DESC`;

    const vehicles = await doQuery(query, values);

    res.status(STATUS_CODE.OK).json({
      message: "Vehicles fetched successfully",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    next(error);
  }
};

const getAllCarBrands = async (req, res, next) => {
  try {
    const query = "SELECT * FROM carBrands";
    const result = await doQuery(query);
    res.status(STATUS_CODE.OK).json({
      message: "Car brands fetched successfully",
      carBrands: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllCarModels = async (req, res, next) => {
  try {
    const { brandId, typeId } = req.query;
    let query = `
      SELECT 
        modelId,
        modelName,
        brandId,
        carTypeId
      FROM carModels
      WHERE 1 = 1
    `;
    const values = [];
    if (brandId) {
      query += ` AND brandId = ?`;
      values.push(brandId);
    }
    if (typeId) {
      query += ` AND carTypeId = ?`;
      values.push(typeId);
    }

    query += ` ORDER BY modelName ASC`;

    const models = await doQuery(query, values);

    res.status(STATUS_CODE.OK).json({
      message: "Car models fetched successfully",
      carModels: models,
    });
  } catch (error) {
    next(error);
  }
};

const getAllCarTypes = async (req, res, next) => {
  try {
    const query = `
      SELECT carTypeId, carTypeName
      FROM carTypes
      ORDER BY carTypeName ASC
    `;

    const result = await doQuery(query);

    res.status(STATUS_CODE.OK).json({
      message: "Car types fetched successfully",
      carTypes: result,
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
  getAllVehicles,
  getAllCarBrands,
  getAllCarModels,
  getAllCarTypes,
};
