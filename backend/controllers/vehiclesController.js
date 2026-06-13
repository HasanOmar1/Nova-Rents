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
const { createActivity } = require("../database/queries/activityQueries");
const { formatDateForInput } = require("../utils/formatDate");
const { updateVehicleConditions } = require("../database/queries/rentalQueries");

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
    const formattedExpirationDate = formatDateForInput(expirationDate);
    // .toISOString()
    // .split("T")[0];
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
    await createActivity(
      userId,
      "vehicle_added",
      `Added new vehicle: ${licensePlate}`,
    );
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

    await createActivity(
      userId,
      "vehicle_deactivated",
      `Deactivated vehicle: ${licensePlate}`,
    );

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

    const oldExpirationDate = formatDateForInput(
      existingVehicle.expirationDate,
    );
    // .toISOString()
    // .split("T")[0];

    const newExpirationDate = formatDateForInput(expirationDate);
    // .toISOString()
    // .split("T")[0];
    const updatedFields = [];

    if (Number(modelId) !== Number(existingVehicle.modelId)) {
      updatedFields.push("model");
    }

    if (fuelType !== existingVehicle.fuelType) {
      updatedFields.push("fuel type");
    }

    if (newExpirationDate !== oldExpirationDate) {
      updatedFields.push("expiration date");
    }

    if (image !== existingVehicle.image) {
      updatedFields.push("image");
    }

    if (Number(year) !== Number(existingVehicle.year)) {
      updatedFields.push("year");
    }

    if (Number(km) !== Number(existingVehicle.km)) {
      updatedFields.push("kilometers");
    }

    if (address !== existingVehicle.address) {
      updatedFields.push("address");
    }

    if (Number(price) !== Number(existingVehicle.price)) {
      updatedFields.push("price");
    }

    if (color !== existingVehicle.color) {
      updatedFields.push("color");
    }

    if (status !== existingVehicle.status) {
      updatedFields.push("status");
    }
    console.log(expirationDate);
    console.log(existingVehicle.expirationDate);

    const updateQuery = `
      UPDATE vehicles
      SET modelId = ?, fuelType = ?,expirationDate = ?, image = ?, year = ?, km = ?, address = ?, price = ?, color = ?, status = ?
      WHERE licensePlate = ?
    `;

    const values = [
      modelId,
      fuelType,
      newExpirationDate,
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

    if (updatedFields.length > 0) {
      await createActivity(
        req.session.user.userId,
        "vehicle_updated",
        `Updated vehicle ${licensePlate}: ${updatedFields.join(", ")}`,
      );
    }

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
      location,
      sort,
      page = 1,
      limit = 9,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    let whereClause = `WHERE v.status = 'available'`;
    const values = [];

    if (brand) {
      whereClause += ` AND cb.brandName = ?`;
      values.push(brand);
    }
    if (model) {
      whereClause += ` AND cm.modelName = ?`;
      values.push(model);
    }
    if (type) {
      whereClause += ` AND ct.carTypeName = ?`;
      values.push(type);
    }
    if (location) {
      whereClause += ` AND v.address LIKE ?`;
      values.push(`%${location}%`);
    }

    let orderByClause = `ORDER BY v.createdAt DESC`;
    if (sort === "price_asc") orderByClause = `ORDER BY v.price ASC`;
    if (sort === "price_desc") orderByClause = `ORDER BY v.price DESC`;
    if (sort === "year_desc") orderByClause = `ORDER BY v.year DESC`;
    if (sort === "year_asc") orderByClause = `ORDER BY v.year ASC`;

    let query = `
      SELECT 
        v.licensePlate, v.fuelType, DATE_FORMAT(v.expirationDate, '%d/%m/%Y') AS expirationDate,
        v.image, v.year, v.km, v.address, v.price, v.color, v.status, v.ownerId, v.createdAt,
        cm.modelId, cm.modelName, cb.brandId, cb.brandName, ct.carTypeId, ct.carTypeName,
        u.firstName AS ownerFirstName, u.lastName AS ownerLastName,
        u.email AS ownerEmail, u.phone AS ownerPhone,
        1 AS canRent
      FROM vehicles v
      JOIN carModels cm ON v.modelId = cm.modelId
      JOIN carBrands cb ON cm.brandId = cb.brandId
      JOIN carTypes ct ON cm.carTypeId = ct.carTypeId
      JOIN users u ON v.ownerId = u.userId
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const queryValues = [...values, parsedLimit, offset];
    const vehicles = await doQuery(query, queryValues);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM vehicles v
      JOIN carModels cm ON v.modelId = cm.modelId
      JOIN carBrands cb ON cm.brandId = cb.brandId
      JOIN carTypes ct ON cm.carTypeId = ct.carTypeId
      ${whereClause}
    `;

    const countResult = await doQuery(countQuery, values);
    const totalVehicles = countResult[0].total;
    const totalPages = Math.ceil(totalVehicles / parsedLimit);

    // 5. EXTRACT AVAILABLE DROPDOWN OPTIONS (Global)
    const optionsQuery = `
      SELECT DISTINCT v.address, cb.brandName, cm.modelName, ct.carTypeName
      FROM vehicles v
      JOIN carModels cm ON v.modelId = cm.modelId
      JOIN carBrands cb ON cm.brandId = cb.brandId
      JOIN carTypes ct ON cm.carTypeId = ct.carTypeId
      WHERE v.status = 'available'
    `;
    const optionsData = await doQuery(optionsQuery, []);

    const modelsWithBrands = [];
    const seenModels = new Set();
    optionsData.forEach((row) => {
      if (!seenModels.has(row.modelName)) {
        seenModels.add(row.modelName);
        modelsWithBrands.push({
          model: row.modelName,
          brand: row.brandName,
        });
      }
    });

    const availableFilters = {
      combinations: optionsData,
      locations: [...new Set(optionsData.map((r) => r.address))],
      brands: [...new Set(optionsData.map((r) => r.brandName))],
      models: modelsWithBrands,
      types: [...new Set(optionsData.map((r) => r.carTypeName))],
    };

    res.status(STATUS_CODE.OK).json({
      message: "Vehicles fetched successfully",
      vehicles,
      availableFilters,
      pagination: {
        totalVehicles,
        totalPages,
        currentPage: parseInt(page),
        limit: parsedLimit,
      },
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
async function updateVehicleStatus(req, res, next) {
  try {
    const { licensePlate } = req.params;
    const { status } = req.body;
    const result = await updateVehicleConditions(licensePlate, status);
    if (result.affectedRows === 0) {
      return res
        .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to update vehicle status" });
    }
    await createActivity(
      req.session.user.userId,
      "vehicle_status_updated",
      `Updated vehicle status to ${status}`,
    );
    return res
      .status(STATUS_CODE.OK)
      .json({ message: "Vehicle status updated successfully" });
  } catch (error) {
    next(error);
  }
}

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
  updateVehicleStatus,
};
