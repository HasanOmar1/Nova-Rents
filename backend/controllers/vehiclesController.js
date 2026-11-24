/** Express controller handlers for vehicles operations.
 * Validates requests and returns the domain's HTTP responses. */
// Handlers for vehicle-related database actions (list, add, update, delete)
const doQuery = require("../database/query");
const STATUS_CODE = require("../constants/statusCodes");
const {
  getVehicleByLicensePlate,
  updateVehicleConditions,
} = require("../database/queries/vehicleQueries");
const {
  getPublicVerificationEligibilitySql,
  getEffectiveVehicleStatusSql,
  deriveEffectiveVehicleStatus,
  getVehicleEligibilitySummariesForPlates,
  getVehicleRentalEligibility,
} = require("../database/queries/eligibilityQueries");
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
const {
  createSystemHistory,
} = require("../database/queries/systemHistoryQueries");
const { formatDateForInput } = require("../utils/formatDate");
const { omitPrivatePickupFields } = require("../utils/omitPrivatePickupFields");
const {
  rejectPendingRentalsByLicensePlate,
  cancelApprovedRentalsByLicensePlate,
  getAffectedRentersByLicensePlate,
  hasActiveRentalNow,
  getVehicleRentalMetricsByLicensePlate,
} = require("../database/queries/rentalQueries");
const {
  createNotification,
} = require("../database/queries/notificationQueries");

const ADMIN_VEHICLE_STATUS_FILTERS = new Set([
  "all",
  "available",
  "not_validated",
  "unavailable",
  "rented",
  "maintenance",
  "inactive",
]);
const MAX_ADMIN_VEHICLE_SEARCH_LENGTH = 100;

const UNKNOWN_VEHICLE_ELIGIBILITY = Object.freeze({
  eligible: false,
  reasons: ["VEHICLE_ELIGIBILITY_UNKNOWN"],
  statuses: {},
});

/** Fetches user vehicles.
 * Accepts req, res, and next; returns a promise after sending a response or forwarding an error. */
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

    // Owner-only: includes private exact pickup fields for Add/Edit.
    let query = `
      SELECT 
        v.licensePlate,
        v.fuelType,
        v.transmission,
        v.status,
        v.expirationDate,
        v.image,
        v.year,
        v.km,
        v.address,
        v.exactPickupAddress,
        v.pickupLatitude,
        v.pickupLongitude,
        v.pickupInstructions,
        v.googlePlaceId,
        v.price,
        v.color,
        v.modelId,
        v.ownerId,
        v.createdAt,
        v.details,
        v.seats,
        cm.modelName, 
        cb.brandId, cb.brandName, 
        ct.carTypeId, ct.carTypeName
      FROM vehicles v
      JOIN carmodels cm ON v.modelId = cm.modelId
      JOIN carbrands cb ON cm.brandId = cb.brandId
      JOIN cartypes ct ON cm.carTypeId = ct.carTypeId
      WHERE v.ownerId = ?
    `;

    let countQuery = `SELECT COUNT(*) as totalCount FROM vehicles WHERE ownerId = ?`;
    let queryParams = [userId];

    if (status !== "all") {
      query += ` AND v.status = ?`;
      countQuery += ` AND status = ?`;
      queryParams.push(status);
    }

    query += ` ORDER BY v.createdAt DESC, v.licensePlate DESC LIMIT ? OFFSET ?`;

    const vehicles = await doQuery(query, [...queryParams, limit, offset]);
    const eligibilitySummaries = await getVehicleEligibilitySummariesForPlates(
      vehicles.map(
        /** Transforms one collection item for the surrounding mapping operation.
         * Accepts vehicle; returns the transformed collection value. */
        (vehicle) => ({
        licensePlate: vehicle.licensePlate,
        ownerId: vehicle.ownerId,
      })),
    );
    const vehiclesWithEligibility = vehicles.map(
      /** Transforms one collection item for the surrounding mapping operation.
       * Accepts vehicle; returns the transformed collection value. */
      (vehicle) => {
        const rentalEligibility =
          eligibilitySummaries.get(String(vehicle.licensePlate)) || {
            eligible: false,
            reasons: ["VEHICLE_ELIGIBILITY_UNKNOWN"],
            statuses: {},
          };
        return {
          ...vehicle,
          rentalEligible: rentalEligibility.eligible,
          rentalEligibility,
        };
    });

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
      vehicles: vehiclesWithEligibility,
      stats,
      pagination: { totalVehicles, totalPages, currentPage: page, limit },
    });
  } catch (error) {
    next(error);
  }
};

/** Adds vehicle.
 * Accepts req, res, and next; returns a promise after sending a response or forwarding an error. */
const addVehicle = async (req, res, next) => {
  try {
    const normalized = validateAndNormalizeVehicleCreate(req, res);
    if (!normalized) return;
    const { userId, vehicle } = normalized;
    const {
      licensePlate,
      modelId,
      fuelType,
      transmission,
      expirationDate,
      image,
      year,
      km,
      address,
      price,
      color,
      details,
      seats,
      exactPickupAddress,
      pickupLatitude,
      pickupLongitude,
      pickupInstructions,
      googlePlaceId,
    } = vehicle;

    const checkIfVehicleAlreadyExists =
      await getVehicleByLicensePlate(licensePlate);

    if (checkIfVehicleAlreadyExists) {
      clearFailedUploads(req.files);
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "License plate already exists!",
      });
    }

    const insertQuery = `
      INSERT INTO vehicles 
      (licensePlate, fuelType, transmission, expirationDate, image, year, km, address,
       exactPickupAddress, pickupLatitude, pickupLongitude, pickupInstructions, googlePlaceId,
       price, color, modelId, ownerId, details, seats)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      licensePlate,
      fuelType,
      transmission,
      expirationDate,
      image,
      year,
      km,
      address,
      exactPickupAddress,
      pickupLatitude,
      pickupLongitude,
      pickupInstructions,
      googlePlaceId,
      price,
      color,
      modelId,
      userId,
      details,
      seats,
    ];

    await doQuery(insertQuery, values);

    await createActivity(
      userId,
      "Added new vehicle",
      `Added new vehicle with license plate of ${licensePlate}`,
    );
    await createSystemHistory(
      userId,
      "vehicle",
      "create",
      "vehicle_created",
      "vehicle",
      String(licensePlate),
      null,
      licensePlate,
      `Added new vehicle with license plate of ${licensePlate}`,
    );

    const newVehicle = await getVehicleByLicensePlate(licensePlate);
    res.status(STATUS_CODE.CREATED).json({
      message: "Vehicle added successfully",
      vehicle: newVehicle,
    });
  } catch (error) {
    clearFailedUploads(req.files);
    next(error);
  }
};

/** Fetches vehicle by id.
 * Accepts req, res, and next; returns a promise after sending a response or forwarding an error. */
const getVehicleById = async (req, res, next) => {
  try {
    const { licensePlate } = req.params;

    const query = `
      SELECT 
        v.licensePlate,
        v.fuelType,
        v.transmission,
        v.expirationDate,
        v.image,
        v.year,
        v.km,
        v.address,
        v.price,
        v.color,
        v.status,
        v.ownerId,
        v.details, 
        v.seats,

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
        u.status AS ownerStatus

      FROM vehicles v
      JOIN carmodels cm ON v.modelId = cm.modelId
      JOIN carbrands cb ON cm.brandId = cb.brandId
      JOIN cartypes ct ON cm.carTypeId = ct.carTypeId
      JOIN users u ON v.ownerId = u.userId
      WHERE v.licensePlate = ?
    `;

    const result = await doQuery(query, [licensePlate]);

    if (result.length === 0) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "Vehicle not found",
      });
    }

    const vehicle = result[0];
    const [rentalEligibility, rentalMetricsRow, hasActiveRental] =
      await Promise.all([
        getVehicleRentalEligibility(licensePlate, vehicle.ownerId),
        getVehicleRentalMetricsByLicensePlate(licensePlate),
        hasActiveRentalNow(licensePlate),
      ]);
    const effectiveStatus = deriveEffectiveVehicleStatus({
      status: vehicle.status,
      ownerStatus: vehicle.ownerStatus,
      rentalEligibility,
      hasActiveRental,
    });
    const completedRentalCount =
      Number(rentalMetricsRow.completedRentalCount) || 0;
    const isVehicleOwner =
      req.session.user?.userId != null &&
      Number(req.session.user.userId) === Number(vehicle.ownerId);
    const rentalMetrics = { rentalCount: completedRentalCount };

    // Earnings and completion rate are commercially sensitive owner data.
    // Admins do not receive them unless the admin account is also the owner.
    if (isVehicleOwner) {
      rentalMetrics.completedRentalValue =
        Number(rentalMetricsRow.completedRentalValue) || 0;
    }

    // Public detail endpoint: never return private exact pickup fields,
    // even when the session user owns the vehicle (owners use /myVehicles).
    res.status(STATUS_CODE.OK).json({
      message: "Vehicle fetched successfully",
      vehicle: {
        ...omitPrivatePickupFields(vehicle),
        effectiveStatus,
        rentalEligible: rentalEligibility.eligible,
        rentalEligibility,
        canRent: effectiveStatus === "available",
        rentalMetrics,
      },
    });
  } catch (error) {
    next(error);
  }
};

/** Deletes vehicle.
 * Accepts req, res, and next; returns a promise after sending a response or forwarding an error. */
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

    const checkQuery = `
      SELECT v.ownerId, v.status, cb.brandName, cm.modelName
      FROM vehicles v
      LEFT JOIN carmodels cm ON v.modelId = cm.modelId
      LEFT JOIN carbrands cb ON cm.brandId = cb.brandId
      WHERE v.licensePlate = ?
    `;
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
    const updateResult = await doQuery(updateQuery, [licensePlate]);

    if (updateResult.affectedRows === 0) {
      return res
        .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to deactivate vehicle" });
    }

    await createActivity(
      userId,
      "Vehicle Deactivation",
      `Deactivated vehicle with license plate of ${licensePlate}`,
    );

    const actorName =
      `${req.session.user.firstName || ""} ${
        req.session.user.lastName || ""
      }`.trim() ||
      req.session.user.email ||
      "A user";
    const { brandName, modelName } = checkResult[0];
    const vehicleLabel =
      brandName && modelName
        ? `${brandName} ${modelName} (${licensePlate})`
        : `vehicle ${licensePlate}`;

    await createSystemHistory(
      userId,
      "vehicle",
      "update",
      "vehicle_deactivated",
      "vehicle",
      String(licensePlate),
      null,
      licensePlate,
      `${actorName} deactivated ${vehicleLabel}`,
    );

    res.status(STATUS_CODE.OK).json({
      message: "Vehicle deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/** Updates vehicle.
 * Accepts req, res, and next; returns a promise after sending a response or forwarding an error. */
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
      transmission,
      expirationDate,
      image,
      year,
      km,
      address,
      price,
      color,
      status,
      details,
      seats,
      exactPickupAddress,
      pickupLatitude,
      pickupLongitude,
      pickupInstructions,
      googlePlaceId,
    } = mergedData;

    const oldExpirationDate = formatDateForInput(
      existingVehicle.expirationDate,
    );
    const newExpirationDate = formatDateForInput(expirationDate);

    const updatedFields = [];

    if (Number(modelId) !== Number(existingVehicle.modelId))
      updatedFields.push("model");
    if (fuelType !== existingVehicle.fuelType) updatedFields.push("fuel type");
    if (transmission !== existingVehicle.transmission)
      updatedFields.push("transmission");
    if (newExpirationDate !== oldExpirationDate)
      updatedFields.push("expiration date");
    if (image !== existingVehicle.image) updatedFields.push("image");
    if (Number(year) !== Number(existingVehicle.year))
      updatedFields.push("year");
    if (Number(km) !== Number(existingVehicle.km))
      updatedFields.push("kilometers");
    if (address !== existingVehicle.address) updatedFields.push("address");
    if (Number(price) !== Number(existingVehicle.price))
      updatedFields.push("price");
    if (color !== existingVehicle.color) updatedFields.push("color");
    if (status !== existingVehicle.status) updatedFields.push("status");
    if (details !== existingVehicle.details) updatedFields.push("details");
    if (Number(seats) !== Number(existingVehicle.seats))
      updatedFields.push("seats");
    if (exactPickupAddress !== existingVehicle.exactPickupAddress)
      updatedFields.push("exact pickup address");
    if (Number(pickupLatitude) !== Number(existingVehicle.pickupLatitude))
      updatedFields.push("pickup latitude");
    if (Number(pickupLongitude) !== Number(existingVehicle.pickupLongitude))
      updatedFields.push("pickup longitude");
    if (pickupInstructions !== existingVehicle.pickupInstructions)
      updatedFields.push("pickup instructions");

    const updateQuery = `
      UPDATE vehicles
      SET modelId = ?, fuelType = ?, transmission = ?, expirationDate = ?, image = ?, year = ?, km = ?,
          address = ?, exactPickupAddress = ?, pickupLatitude = ?, pickupLongitude = ?,
          pickupInstructions = ?, googlePlaceId = ?,
          price = ?, color = ?, status = ?, details = ?, seats = ?
      WHERE licensePlate = ?
    `;

    const values = [
      modelId,
      fuelType,
      transmission,
      newExpirationDate,
      image,
      year,
      km,
      address,
      exactPickupAddress,
      pickupLatitude,
      pickupLongitude,
      pickupInstructions,
      googlePlaceId,
      price,
      color,
      status,
      details,
      seats,
      licensePlate,
    ];

    await doQuery(updateQuery, values);

    if (updatedFields.length > 0) {
      await createActivity(
        req.session.user.userId,
        "Updated a vehicle",
        `Updated vehicle with license plate of ${licensePlate}: ${updatedFields.join(", ")}`,
      );
      await createSystemHistory(
        req.session.user.userId,
        "vehicle",
        "update",
        "Updated Vehicle",
        "vehicle",
        String(licensePlate),
        null,
        licensePlate,
        `Updated vehicle with license plate of ${licensePlate}: ${updatedFields.join(", ")}`,
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

/** Lists vehicles.
 * Accepts req, res, next, and an options object; returns a promise after sending a response or forwarding an error. */
const listVehicles = async (
  req,
  res,
  next,
  { includeBlockedOwners = false } = {},
) => {
  try {
    const {
      brand,
      model,
      type,
      location,
      seats,
      sort,
      status,
      search,
      page = 1,
      limit = 5,
    } = req.query;

    const parsedPage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const requestedLimit = Number.parseInt(limit, 10);
    const parsedLimit = Math.min(
      Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 5, 1),
      100,
    );
    const offset = (parsedPage - 1) * parsedLimit;
    const normalizedStatus = String(status || "all").trim().toLowerCase();
    const normalizedSearch = includeBlockedOwners
      ? String(search || "").trim()
      : "";
    const effectiveStatusSql = getEffectiveVehicleStatusSql({
      vehicleAlias: "v",
      ownerAlias: "u",
    });

    if (
      includeBlockedOwners &&
      !ADMIN_VEHICLE_STATUS_FILTERS.has(normalizedStatus)
    ) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid vehicle status filter",
      });
    }

    if (normalizedSearch.length > MAX_ADMIN_VEHICLE_SEARCH_LENGTH) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: `Vehicle search must be ${MAX_ADMIN_VEHICLE_SEARCH_LENGTH} characters or fewer`,
      });
    }

    // 1. DYNAMIC STATUS FILTERING
    let whereClause = `WHERE 1=1`;
    const values = [];

    // Public browsing hides blocked owners. The protected admin inventory is
    // system-wide and must include their listings as well.
    if (!includeBlockedOwners) {
      whereClause += ` AND u.status != 'blocked'`;
      whereClause += ` AND v.status = 'available'`;
      whereClause += ` AND (${getPublicVerificationEligibilitySql({ vehicleAlias: "v" })})`;
    } else if (normalizedStatus !== "all") {
      whereClause += ` AND (${effectiveStatusSql}) = ?`;
      values.push(normalizedStatus);
    }

    if (normalizedSearch) {
      const compactSearch = normalizedSearch.replace(/[\s-]/g, "");
      const plateSearch = compactSearch || normalizedSearch;

      whereClause += ` AND (
        LOCATE(?, CAST(v.licensePlate AS CHAR)) > 0
        OR LOCATE(?, CONCAT_WS(' ', u.firstName, u.lastName)) > 0
        OR LOCATE(?, COALESCE(u.email, '')) > 0
        OR LOCATE(?, COALESCE(u.phone, '')) > 0
        OR LOCATE(?, cb.brandName) > 0
        OR LOCATE(?, cm.modelName) > 0
        OR LOCATE(?, CONCAT_WS(' ', cb.brandName, cm.modelName)) > 0
        OR LOCATE(?, COALESCE(v.address, '')) > 0
      )`;
      values.push(
        plateSearch,
        normalizedSearch,
        normalizedSearch,
        normalizedSearch,
        normalizedSearch,
        normalizedSearch,
        normalizedSearch,
        normalizedSearch,
      );
    }

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
    if (seats) {
      whereClause += ` AND v.seats = ?`;
      values.push(seats);
    }

    let sortExpression = `v.createdAt DESC`;
    if (sort === "price_asc") sortExpression = `v.price ASC`;
    if (sort === "price_desc") sortExpression = `v.price DESC`;
    if (sort === "year_desc") sortExpression = `v.year DESC`;
    if (sort === "year_asc") sortExpression = `v.year ASC`;
    if (sort === "seats_desc") sortExpression = `v.seats DESC`;
    if (sort === "seats_asc") sortExpression = `v.seats ASC`;

    // LIMIT/OFFSET pagination needs a unique final sort key. Many imported
    // vehicles share the same timestamp and other sortable values.
    const orderByClause = `ORDER BY ${sortExpression}, v.licensePlate DESC`;

    // 2. FETCH VEHICLES
    let query = `
      SELECT 
        v.licensePlate, v.fuelType, v.transmission, DATE_FORMAT(v.expirationDate, '%d/%m/%Y') AS expirationDate,
        v.image, v.year, v.km, v.address, v.price, v.color, v.status, v.ownerId, v.createdAt, v.details, v.seats,
        cm.modelId, cm.modelName, cb.brandId, cb.brandName, ct.carTypeId, ct.carTypeName,
        u.firstName AS ownerFirstName, u.lastName AS ownerLastName,
        u.email AS ownerEmail, u.phone AS ownerPhone, u.status AS ownerStatus,
        ${includeBlockedOwners ? `(${effectiveStatusSql}) AS effectiveStatus,` : ""}
        1 AS canRent
      FROM vehicles v
      JOIN carmodels cm ON v.modelId = cm.modelId
      JOIN carbrands cb ON cm.brandId = cb.brandId
      JOIN cartypes ct ON cm.carTypeId = ct.carTypeId
      JOIN users u ON v.ownerId = u.userId
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const queryValues = [...values, parsedLimit, offset];
    const vehicles = await doQuery(query, queryValues);
    let responseVehicles;

    if (includeBlockedOwners) {
      const eligibilitySummaries =
        await getVehicleEligibilitySummariesForPlates(
          vehicles.map(
            /** Transforms one collection item for the surrounding mapping operation.
             * Accepts vehicle; returns the transformed collection value. */
            (vehicle) => ({
            licensePlate: vehicle.licensePlate,
            ownerId: vehicle.ownerId,
          })),
        );

      responseVehicles = vehicles.map(
        /** Transforms one collection item for the surrounding mapping operation.
         * Accepts vehicle; returns the transformed collection value. */
        (vehicle) => {
          const rentalEligibility =
            eligibilitySummaries.get(String(vehicle.licensePlate)) ||
            UNKNOWN_VEHICLE_ELIGIBILITY;
          const effectiveStatus = vehicle.effectiveStatus;

          return omitPrivatePickupFields({
            ...vehicle,
            effectiveStatus,
            rentalEligible: rentalEligibility.eligible,
            rentalEligibility,
            canRent: effectiveStatus === "available",
          });
      });
    } else {
      responseVehicles = vehicles.map(omitPrivatePickupFields);
    }

    // 3. PAGINATION TOTAL (Added JOIN users)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM vehicles v
      JOIN carmodels cm ON v.modelId = cm.modelId
      JOIN carbrands cb ON cm.brandId = cb.brandId
      JOIN cartypes ct ON cm.carTypeId = ct.carTypeId
      JOIN users u ON v.ownerId = u.userId
      ${whereClause}
    `;
    const countResult = await doQuery(countQuery, values);
    const totalVehicles = countResult[0].total;
    const totalPages = Math.ceil(totalVehicles / parsedLimit);

    // 4. GLOBAL STATS (For Top Cards)
    const statsQuery = includeBlockedOwners
      ? `
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN effectiveStatus = 'available' THEN 1 ELSE 0 END) AS available,
            SUM(CASE WHEN effectiveStatus = 'not_validated' THEN 1 ELSE 0 END) AS notValidated,
            SUM(CASE WHEN effectiveStatus = 'unavailable' THEN 1 ELSE 0 END) AS unavailable,
            SUM(CASE WHEN effectiveStatus = 'rented' THEN 1 ELSE 0 END) AS rented,
            SUM(CASE WHEN effectiveStatus = 'maintenance' THEN 1 ELSE 0 END) AS maintenance,
            SUM(CASE WHEN effectiveStatus = 'inactive' THEN 1 ELSE 0 END) AS inactive
          FROM (
            SELECT (${effectiveStatusSql}) AS effectiveStatus
            FROM vehicles v
            JOIN users u ON v.ownerId = u.userId
          ) effectiveVehicles
        `
      : `
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN v.status = 'available' THEN 1 ELSE 0 END) AS available,
            SUM(CASE WHEN v.status = 'rented' THEN 1 ELSE 0 END) AS rented,
            SUM(CASE WHEN v.status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance,
            SUM(CASE WHEN v.status = 'inactive' THEN 1 ELSE 0 END) AS inactive
          FROM vehicles v
          JOIN users u ON v.ownerId = u.userId
          WHERE u.status != 'blocked'
        `;
    const statsResult = await doQuery(statsQuery, []);

    // 5. EXTRACT AVAILABLE DROPDOWN OPTIONS (Added JOIN users)
    const optionsQuery = `
      SELECT DISTINCT v.address, v.seats, cb.brandName, cm.modelName, ct.carTypeName
      FROM vehicles v
      JOIN carmodels cm ON v.modelId = cm.modelId
      JOIN carbrands cb ON cm.brandId = cb.brandId
      JOIN cartypes ct ON cm.carTypeId = ct.carTypeId
      JOIN users u ON v.ownerId = u.userId
      ${
        includeBlockedOwners && normalizedStatus === "all"
          ? "WHERE 1=1"
          : whereClause
      }
    `;
    const optionsData = await doQuery(
      optionsQuery,
      includeBlockedOwners && normalizedStatus === "all" ? [] : values,
    );

    const modelsWithBrands = [];
    const seenModels = new Set();
    optionsData.forEach(
      /** Processes one collection item for side effects.
       * Accepts row; returns no meaningful value. */
      (row) => {
        if (!seenModels.has(row.modelName)) {
          seenModels.add(row.modelName);
          modelsWithBrands.push({ model: row.modelName, brand: row.brandName });
        }
    });

    const availableFilters = {
      combinations: optionsData,
      locations: [...new Set(optionsData.map(
        /** Transforms one collection item for the surrounding mapping operation.
         * Accepts r; returns the transformed collection value. */
        (r) => r.address))],
      brands: [...new Set(optionsData.map(
        /** Transforms one collection item for the surrounding mapping operation.
         * Accepts r; returns the transformed collection value. */
        (r) => r.brandName))],
      models: modelsWithBrands,
      types: [...new Set(optionsData.map(
        /** Transforms one collection item for the surrounding mapping operation.
         * Accepts r; returns the transformed collection value. */
        (r) => r.carTypeName))],
    };

    res.status(200).json({
      message: "Vehicles fetched successfully",
      vehicles: responseVehicles,
      availableFilters,
      allVehStats: statsResult[0],
      pagination: {
        totalVehicles,
        totalPages,
        currentPage: parsedPage,
        limit: parsedLimit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/** Fetches all vehicles.
 * Accepts req, res, and next; returns a response or delegates to the next middleware. */
const getAllVehicles = (req, res, next) => listVehicles(req, res, next);

/** Fetches admin vehicles.
 * Accepts req, res, and next; returns a response or delegates to the next middleware. */
const getAdminVehicles = (req, res, next) =>
  listVehicles(req, res, next, { includeBlockedOwners: true });

/** Fetches all car brands.
 * Accepts req, res, and next; returns a promise after sending a response or forwarding an error. */
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

/** Fetches all car models.
 * Accepts req, res, and next; returns a promise after sending a response or forwarding an error. */
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

/** Fetches all car types.
 * Accepts req, res, and next; returns a promise after sending a response or forwarding an error. */
const getAllCarTypes = async (req, res, next) => {
  try {
    const query = `
      SELECT carTypeId, carTypeName
      FROM cartypes
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

/** Updates vehicle status.
 * Accepts req, res, and next; returns a promise after sending a response or forwarding an error. */
async function updateVehicleStatus(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;

    const { licensePlate } = req.params;
    const { status } = req.body;

    if (!status) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Status is required" });
    }
    const existingVehicle = await getVehicleByLicensePlate(licensePlate);

    if (!existingVehicle) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "Vehicle not found" });
    }

    const loggedInUserId = Number(req.session.user.userId);
    const vehicleOwnerId = Number(existingVehicle.ownerId);

    if (vehicleOwnerId !== loggedInUserId) {
      return res.status(STATUS_CODE.FORBIDDEN).json({
        message: "You are not allowed to update this vehicle's status",
      });
    }

    if (status === "maintenance" && existingVehicle.status !== "maintenance") {
      const hasActiveRental = await hasActiveRentalNow(licensePlate);

      if (hasActiveRental) {
        return res.status(STATUS_CODE.BAD_REQUEST).json({
          message:
            "Cannot put vehicle under maintenance while it has an active rental",
        });
      }

      const affectedRentals =
        await getAffectedRentersByLicensePlate(licensePlate);

      await rejectPendingRentalsByLicensePlate(licensePlate);
      await cancelApprovedRentalsByLicensePlate(licensePlate);

      for (const rental of affectedRentals) {
        await createNotification(
          rental.renterId,
          rental.rentalId,
          "vehicle_maintenance",
          "Vehicle Under Maintenance",
          `Your rental for vehicle ${licensePlate} was cancelled because the vehicle is now under maintenance.`,
        );
      }
    }

    const result = await updateVehicleConditions(licensePlate, status);

    if (result.affectedRows === 0) {
      return res
        .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to update vehicle status" });
    }

    await createActivity(
      req.session.user.userId,
      "Vehicle Status Update",
      `Updated vehicle with license plate of ${licensePlate} status to ${status}`,
    );

    let statusEventName = "vehicle_status_updated";
    if (status === "maintenance") {
      statusEventName = "vehicle_moved_to_maintenance";
    } else if (status === "available") {
      statusEventName = "vehicle_returned_to_available";
    }

    await createSystemHistory(
      req.session.user.userId,
      "vehicle",
      "update",
      statusEventName,
      "vehicle",
      String(licensePlate),
      null,
      licensePlate,
      `Updated vehicle with license plate of ${licensePlate} status to ${status}`,
    );

    return res
      .status(STATUS_CODE.OK)
      .json({ message: "Vehicle status updated successfully" });
  } catch (error) {
    next(error);
  }
}

// --- ADD BRAND / MODEL / TYPE TO DATABASE ---
/** Adds car model.
 * Accepts req, res, and next; returns a promise after sending a response or forwarding an error. */
const addCarModel = async (req, res, next) => {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!")) {
      return;
    }

    const { brandId, brandName, modelName, carTypeId, carTypeName } = req.body;

    if (!brandName || !modelName || (!carTypeId && !carTypeName)) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Brand, Model, and Car Type are required." });
    }

    let finalBrandId = brandId;
    let finalCarTypeId = carTypeId;

    // 1. Check if the Brand exists or needs to be inserted
    if (!finalBrandId) {
      const checkBrandQuery = `SELECT brandId FROM carbrands WHERE LOWER(brandName) = LOWER(?)`;
      const existingBrand = await doQuery(checkBrandQuery, [brandName.trim()]);

      if (existingBrand.length > 0) {
        finalBrandId = existingBrand[0].brandId;
      } else {
        const insertBrandQuery = `INSERT INTO carbrands (brandName) VALUES (?)`;
        const brandResult = await doQuery(insertBrandQuery, [brandName.trim()]);
        finalBrandId = brandResult.insertId;
      }
    }

    // 2. Check if the Car Type exists or needs to be inserted
    if (!finalCarTypeId) {
      const checkTypeQuery = `SELECT carTypeId FROM cartypes WHERE LOWER(carTypeName) = LOWER(?)`;
      const existingType = await doQuery(checkTypeQuery, [carTypeName.trim()]);

      if (existingType.length > 0) {
        finalCarTypeId = existingType[0].carTypeId;
      } else {
        const insertTypeQuery = `INSERT INTO cartypes (carTypeName) VALUES (?)`;
        const typeResult = await doQuery(insertTypeQuery, [carTypeName.trim()]);
        finalCarTypeId = typeResult.insertId;
      }
    } else {
      // Verify existing Car Type just to be safe
      const checkTypeQuery = `SELECT carTypeId FROM cartypes WHERE carTypeId = ?`;
      const existingType = await doQuery(checkTypeQuery, [finalCarTypeId]);

      if (existingType.length === 0) {
        return res
          .status(STATUS_CODE.BAD_REQUEST)
          .json({ message: "Invalid Car Type specified." });
      }
    }

    // 3. Check if the Model already exists for this Brand
    const checkModelQuery = `
      SELECT modelId 
      FROM carmodels 
      WHERE LOWER(modelName) = LOWER(?) AND brandId = ?
    `;
    const existingModel = await doQuery(checkModelQuery, [
      modelName.trim(),
      finalBrandId,
    ]);

    if (existingModel.length > 0) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: `Model "${modelName}" already exists in the database for this brand.`,
      });
    }

    // 4. Insert the new Model into carmodels
    const insertModelQuery = `
      INSERT INTO carmodels (modelName, brandId, carTypeId) 
      VALUES (?, ?, ?)
    `;
    const modelResult = await doQuery(insertModelQuery, [
      modelName.trim(),
      finalBrandId,
      finalCarTypeId,
    ]);

    return res.status(STATUS_CODE.CREATED).json({
      message: "Model added successfully!",
      model: {
        modelId: modelResult.insertId,
        modelName: modelName.trim(),
        brandId: finalBrandId,
        carTypeId: finalCarTypeId,
      },
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
  getAdminVehicles,
  getAllCarBrands,
  getAllCarModels,
  getAllCarTypes,
  updateVehicleStatus,
  addCarModel,
};
