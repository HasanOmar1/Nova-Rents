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
const {
  deleteImagesFromDisk,
  clearFailedUploads,
} = require("../utils/handleUploads");

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
    const status = req.query.status || "all";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        v.*, 
        cm.modelName, 
        cb.brandId, cb.brandName, 
        ct.carTypeId, ct.carTypeName
      FROM vehicles v
      JOIN carModels cm ON v.modelId = cm.modelId
      JOIN carBrands cb ON cm.brandId = cb.brandId
      JOIN carTypes ct ON cm.carTypeId = ct.carTypeId
      WHERE v.ownerId = ?
    `;

    let countQuery = `SELECT COUNT(*) as totalCount FROM vehicles WHERE ownerId = ?`;
    let queryParams = [userId];

    if (status !== "all") {
      query += ` AND v.status = ?`;
      countQuery += ` AND status = ?`;
      queryParams.push(status);
    }

    query += ` ORDER BY v.createdAt DESC LIMIT ? OFFSET ?`;

    const vehicles = await doQuery(query, [...queryParams, limit, offset]);

    const countResult = await doQuery(countQuery, queryParams);
    const totalVehicles = countResult[0].totalCount;
    const totalPages = Math.ceil(totalVehicles / limit);

    const statsQuery = `
      SELECT 
        COUNT(*) as allVehicles,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as availableCount,
        SUM(CASE WHEN status = 'rented' THEN 1 ELSE 0 END) as rentedCount,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenanceCount,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactiveCount,
        AVG(CASE WHEN status != 'inactive' THEN price ELSE NULL END) as avgDailyRate
      FROM vehicles 
      WHERE ownerId = ?
    `;
    const statsResult = await doQuery(statsQuery, [userId]);

    const stats = {
      allVehicles: Number(statsResult[0].allVehicles) || 0,
      availableNow: Number(statsResult[0].availableCount) || 0,
      rented: Number(statsResult[0].rentedCount) || 0,
      maintenance: Number(statsResult[0].maintenanceCount) || 0,
      inactive: Number(statsResult[0].inactiveCount) || 0,
      avgRate: Math.round(Number(statsResult[0].avgDailyRate)) || 0,
    };

    res.status(STATUS_CODE.OK).json({
      message: "User vehicles fetched successfully",
      vehicles,
      stats,
      pagination: { totalVehicles, totalPages, currentPage: page, limit },
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
      //  Wipe the files from the disk because the vehicle exists!
      clearFailedUploads(req.files);
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "License plate already exists!",
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
    // Wipe the files if the database query crashes for any reason!
    clearFailedUploads(req.files);
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
        "You must be logged in to deactivate a vehicle",
      )
    ) {
      return;
    }

    const { userId } = req.session.user;

    const checkQuery = `SELECT ownerId, status FROM vehicles WHERE licensePlate = ?`;
    const checkResult = await doQuery(checkQuery, [licensePlate]);

    if (checkResult.length === 0) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "Vehicle not found" });
    }
    if (checkResult[0].ownerId !== userId) {
      return res.status(STATUS_CODE.FORBIDDEN).json({
        message: "You do not have permission to deactivate this vehicle",
      });
    }
    if (checkResult[0].status === "rented") {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message:
          "You cannot deactivate a vehicle while a customer currently has it rented.",
      });
    }

    const activeRentalsQuery = `
      SELECT COUNT(*) as upcomingCount 
      FROM rentals 
      WHERE licensePlate = ? 
      AND status IN ('pending', 'approved') 
      AND endDate >= CURDATE()
    `;
    const activeRentalsResult = await doQuery(activeRentalsQuery, [
      licensePlate,
    ]);

    if (activeRentalsResult[0].upcomingCount > 0) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message:
          "Cannot deactivate: This vehicle has upcoming approved or pending bookings.",
      });
    }

    const updateQuery = `UPDATE vehicles SET status = 'inactive' WHERE licensePlate = ?`;
    await doQuery(updateQuery, [licensePlate]);

    res.status(STATUS_CODE.OK).json({
      message: "Vehicle deactivated successfully",
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

    if (req.files && req.files.length > 0) {
      deleteImagesFromDisk(existingVehicle.image);
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
      status,
    } = mergedData;

    const updateQuery = `
      UPDATE vehicles
      SET modelId = ?, fuelType = ?, expirationDate = ?, image = ?, year = ?, km = ?, address = ?, price = ?, color = ?, status = ?
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
      status,
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
      startDate,
      endDate,
    } = req.query;
    const canRentSelect =
      startDate && endDate
        ? `
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM rentals r
          WHERE r.licensePlate = v.licensePlate
          AND r.status IN ('pending', 'approved')
          AND r.startDate < ?
          AND r.endDate > ?
        )
        THEN 0
        ELSE 1
      END AS canRent
    `
        : `1 AS canRent`;

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
        u.phone AS ownerPhone,
        
      ${canRentSelect} 
      FROM vehicles v
      JOIN carModels cm ON v.modelId = cm.modelId
      JOIN carBrands cb ON cm.brandId = cb.brandId
      JOIN carTypes ct ON cm.carTypeId = ct.carTypeId
      Join users u ON v.ownerId = u.userId
      WHERE 1 = 1
      AND v.status = 'available'
    `;

    const values = [];
    if (startDate && endDate) {
      values.push(endDate, startDate);
    }
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
