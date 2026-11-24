/** Database query helpers for rental records.
 * Encapsulates the domain's SQL reads, writes, and result shaping. */
const doQuery = require("../query");

/** Checks if vehicle is available.
 * Accepts licensePlate, startDate, and endDate; returns the validation or boolean result. */
async function checkIfVehicleIsAvailable(licensePlate, startDate, endDate) {
  const checkIfVehicleIsAvailable = `select rentalId from rentals where licensePlate =? AND status IN ('pending', 'approved') and startDate <= ? and endDate >= ?`;
  const valuesOfcheckIfVehicleIsAvailable = [licensePlate, endDate, startDate];
  const rentalIsAvailable = await doQuery(
    checkIfVehicleIsAvailable,
    valuesOfcheckIfVehicleIsAvailable,
  );
  return rentalIsAvailable.length > 0;
}
/** Fetches my rentals by renter id.
 * Accepts renterId; returns a promise for the requested data. */
async function getMyRentalsByRenterId(renterId) {
  const getMyRentalsByRenterId = `select * from rentals where renterId = ? `;
  const valuesOfgetMyRentalsByRenterId = [renterId];
  const myRentals = await doQuery(
    getMyRentalsByRenterId,
    valuesOfgetMyRentalsByRenterId,
  );
  return myRentals;
}
/** Fetches requests for my vehicles by owner id.
 * Accepts ownerId; returns a promise for the requested data. */
async function getRequestsForMyVehiclesByOwnerId(ownerId) {
  const getRequestsForMyVehiclesByOwnerId = ` SELECT
  r.rentalId,
  r.renterId,
  r.licensePlate,
  DATE_FORMAT(r.startDate, '%d/%m/%Y') AS startDate,
  DATE_FORMAT(r.endDate, '%d/%m/%Y') AS endDate,
  DATE_FORMAT(r.createdAt, '%d/%m/%Y %H:%i:%s') AS createdAt,

  u.email,
  u.firstName,
  u.lastName,

  v.image,
  v.price,
  v.color,
  v.year,
  v.address
  FROM rentals r
  JOIN users u
  ON r.renterId = u.userId
  JOIN vehicles v
  ON r.licensePlate = v.licensePlate
  WHERE v.ownerId = ?
  AND r.status = 'pending'
  ORDER BY r.startDate DESC`;

  const valuesOfgetRequestsForMyVehiclesByOwnerId = [ownerId];
  const requests = await doQuery(
    getRequestsForMyVehiclesByOwnerId,
    valuesOfgetRequestsForMyVehiclesByOwnerId,
  );
  return requests;
}
/** Fetches rental by id.
 * Accepts rentalId; returns a promise for the requested data. */
async function getRentalById(rentalId) {
  const getRentalById = `select r.*, v.ownerId from rentals r 
  join vehicles v
   on r.licensePlate = v.licensePlate where rentalId = ?`;
  const valuesOfgetRentalById = [rentalId];
  const rental = await doQuery(getRentalById, valuesOfgetRentalById);
  return rental[0];
}
/** Updates rental status.
 * Accepts rentalId and status; returns a promise for the operation result. */
async function updateRentalStatus(rentalId, status) {
  const updateRentalStatus = `update rentals set status = ? where rentalId = ?`;
  const valuesOfupdateRentalStatus = [status, rentalId];
  const result = await doQuery(updateRentalStatus, valuesOfupdateRentalStatus);
  return result;
}

/** Fetches rentals starting tomorrow.
 * Accepts no arguments; returns a promise for the requested data. */
async function getRentalsStartingTomorrow() {
  const query = `
    SELECT 
      r.rentalId,
      r.renterId,
      r.licensePlate,
      v.ownerId
    FROM rentals r
    JOIN vehicles v
      ON r.licensePlate = v.licensePlate
    WHERE r.status = 'approved'
    AND DATE(r.startDate) = DATE(CURDATE() + INTERVAL 1 DAY)
  `;

  return await doQuery(query);
}

/** Fetches rentals ending tomorrow.
 * Accepts no arguments; returns a promise for the requested data. */
async function getRentalsEndingTomorrow() {
  const query = `
    SELECT 
      r.rentalId,
      r.renterId,
      r.licensePlate,
      v.ownerId
    FROM rentals r
    JOIN vehicles v
      ON r.licensePlate = v.licensePlate
    WHERE r.status = 'approved'
    AND DATE(r.endDate) = DATE(CURDATE() + INTERVAL 1 DAY)
  `;

  return await doQuery(query);
}

/** Fetches booked dates by plate.
 * Accepts licensePlate; returns a promise for the requested data. */
async function getBookedDatesByPlate(licensePlate) {
  const query = `
      SELECT startDate, endDate 
      FROM rentals 
      WHERE licensePlate = ? 
      AND status IN ('pending', 'approved')
      AND endDate >= CURDATE()
    `;

  const bookedDates = await doQuery(query, [licensePlate]);

  return bookedDates;
}

// Keep vehicle-detail performance aligned with the Vehicle Performance report:
// an approved rental whose end date has passed is lifecycle-complete even if
// the status synchronizer has not run yet. Pending and future/current approved
// rows remain open and are excluded from completed totals.
/** Fetches vehicle rental metrics by license plate.
 * Accepts licensePlate; returns a promise for the requested data. */
async function getVehicleRentalMetricsByLicensePlate(licensePlate) {
  const query = `
    SELECT
      SUM(
        CASE
          WHEN status = 'completed'
            OR (status = 'approved' AND endDate < CURRENT_DATE())
          THEN 1
          ELSE 0
        END
      ) AS completedRentalCount,
      COALESCE(
        SUM(
          CASE
            WHEN status = 'completed'
              OR (status = 'approved' AND endDate < CURRENT_DATE())
            THEN totalPrice
            ELSE 0
          END
        ),
        0
      ) AS completedRentalValue
    FROM rentals
    WHERE licensePlate = ?
  `;

  const rows = await doQuery(query, [licensePlate]);
  return rows[0] || {};
}

/** Fetches rentals to complete.
 * Accepts no arguments; returns a promise for the requested data. */
async function getRentalsToComplete() {
  const query = `
    SELECT rentalId, licensePlate 
    FROM rentals 
    WHERE status = 'approved' AND endDate < CURRENT_DATE()
  `;

  return doQuery(query);
}

/** Fetches rentals to expire.
 * Accepts no arguments; returns a promise for the requested data. */
async function getRentalsToExpire() {
  const query = `
    SELECT rentalId, licensePlate 
    FROM rentals 
    WHERE status = 'pending' AND startDate < CURRENT_DATE()
  `;

  return doQuery(query);
}

/** Completes expired rentals.
 * Accepts no arguments; returns a promise for the operation result. */
async function completeExpiredRentals() {
  const query = `
    UPDATE rentals 
    SET status = 'completed' 
    WHERE status = 'approved' AND endDate < CURRENT_DATE()
  `;

  const result = await doQuery(query);
  return result;
}
/** Cancels expired rentals.
 * Accepts no arguments; returns the validation or boolean result. */
async function cancelExpiredRentals() {
  const query = `
    UPDATE rentals 
    SET status = 'cancelled' 
    WHERE status = 'pending' AND startDate < CURRENT_DATE()
  `;

  const result = await doQuery(query);
  return result;
}

/** Fetches monthly earnings by owner id.
 * Accepts ownerId; returns a promise for the requested data. */
async function getMonthlyEarningsByOwnerId(ownerId) {
  const query = `
    SELECT COALESCE(SUM(r.totalPrice), 0) AS total
    FROM rentals r
    JOIN vehicles v ON r.licensePlate = v.licensePlate
    WHERE v.ownerId = ?
    AND r.status = 'completed'
    AND MONTH(r.endDate) = MONTH(CURRENT_DATE())
    AND YEAR(r.endDate) = YEAR(CURRENT_DATE())
  `;
  return doQuery(query, [ownerId]);
}

// Total value of approved + completed booking requests created in the range
// (admin statistics). Uses the exact same WHERE conditions as
// getBookingsChartByRange so the Booking Value card always describes the same
// rental rows as the Bookings card and chart. createdAt is a TIMESTAMP, so the
// end bound uses < DATE_ADD(end, 1 DAY) to include the whole final day.
/** Fetches booking value by range.
 * Accepts startDate and endDate; returns a promise for the requested data. */
async function getBookingValueByRange(startDate, endDate) {
  const query = `
    SELECT COALESCE(SUM(totalPrice), 0) AS total
    FROM rentals
    WHERE status IN ('approved', 'completed')
    AND createdAt >= ?
    AND createdAt < DATE_ADD(?, INTERVAL 1 DAY)
  `;
  return doQuery(query, [startDate, endDate]);
}

// Approved + completed booking requests bucketed by creation time.
// Must keep the same WHERE conditions as getBookingValueByRange.
// dateFormat is a DATE_FORMAT pattern chosen by the caller.
/** Fetches bookings chart by range.
 * Accepts startDate, endDate, and dateFormat; returns a promise for the requested data. */
async function getBookingsChartByRange(startDate, endDate, dateFormat) {
  const query = `
    SELECT
      DATE_FORMAT(createdAt, ?) AS periodKey,
      COUNT(*) AS bookings
    FROM rentals
    WHERE status IN ('approved', 'completed')
    AND createdAt >= ?
    AND createdAt < DATE_ADD(?, INTERVAL 1 DAY)
    GROUP BY periodKey
    ORDER BY periodKey ASC
  `;
  return doQuery(query, [dateFormat, startDate, endDate]);
}

// Completed-rental earnings for vehicles one user owns, bucketed by rental
// endDate (the schema has no completion timestamp; a rental is auto-completed
// once endDate passes, so endDate is when the owner earned the amount).
// rentals→vehicles on licensePlate is one-to-one, so SUM sees no duplicates.
/** Fetches owner earnings chart by range.
 * Accepts ownerId, startDate, endDate, and dateFormat; returns a promise for the requested data. */
async function getOwnerEarningsChartByRange(
  ownerId,
  startDate,
  endDate,
  dateFormat,
) {
  const query = `
    SELECT
      DATE_FORMAT(r.endDate, ?) AS periodKey,
      COALESCE(SUM(r.totalPrice), 0) AS earnings
    FROM rentals r
    JOIN vehicles v ON r.licensePlate = v.licensePlate
    WHERE v.ownerId = ?
    AND r.status = 'completed'
    AND r.endDate >= ?
    AND r.endDate < DATE_ADD(?, INTERVAL 1 DAY)
    GROUP BY periodKey
    ORDER BY periodKey ASC
  `;
  return doQuery(query, [dateFormat, ownerId, startDate, endDate]);
}

// Owner-scoped bounds for the same lifecycle-complete rows used by the vehicle
// comparison. The end bound extends through today so an all-time trend also
// shows any quiet periods since the owner's latest completed rental.
/** Fetches owner vehicle earnings comparison bounds.
 * Accepts ownerId; returns a promise for the requested data. */
async function getOwnerVehicleEarningsComparisonBounds(ownerId) {
  const query = `
    SELECT
      DATE_FORMAT(MIN(r.endDate), '%Y-%m-%d') AS startDate,
      CASE
        WHEN COUNT(r.rentalId) = 0 THEN NULL
        ELSE DATE_FORMAT(GREATEST(MAX(r.endDate), CURRENT_DATE()), '%Y-%m-%d')
      END AS endDate
    FROM vehicles v
    LEFT JOIN rentals r
      ON r.licensePlate = v.licensePlate
      AND (
        r.status = 'completed'
        OR (r.status = 'approved' AND r.endDate < CURRENT_DATE())
      )
    WHERE v.ownerId = ?
  `;

  return doQuery(query, [ownerId]);
}

// Completed-rental value and count for every vehicle an owner currently has.
// Expired approved rows are treated as lifecycle-complete too, so the report
// remains accurate even before the rental status synchronizer next runs. Date
// filters stay in the LEFT JOIN so zero-activity vehicles are still returned.
// Omitting both dates is reserved for the server-resolved all-time/no-history
// case.
/** Fetches owner vehicle earnings comparison by range.
 * Accepts ownerId, startDate, endDate, and dateFormat; returns a promise for the requested data. */
async function getOwnerVehicleEarningsComparisonByRange(
  ownerId,
  startDate,
  endDate,
  dateFormat,
) {
  const hasDateRange = Boolean(startDate && endDate);
  const dateFilter = hasDateRange
    ? `
      AND r.endDate >= ?
      AND r.endDate < DATE_ADD(?, INTERVAL 1 DAY)`
    : "";

  const query = `
    SELECT
      CAST(v.licensePlate AS CHAR) AS licensePlate,
      cb.brandName,
      cm.modelName,
      DATE_FORMAT(r.endDate, ?) AS periodKey,
      COALESCE(SUM(r.totalPrice), 0) AS earnings,
      COUNT(r.rentalId) AS rentalCount
    FROM vehicles v
    JOIN carmodels cm ON v.modelId = cm.modelId
    JOIN carbrands cb ON cm.brandId = cb.brandId
    LEFT JOIN rentals r
      ON r.licensePlate = v.licensePlate
      AND (
        r.status = 'completed'
        OR (r.status = 'approved' AND r.endDate < CURRENT_DATE())
      )${dateFilter}
    WHERE v.ownerId = ?
    GROUP BY
      v.licensePlate,
      cb.brandName,
      cm.modelName,
      periodKey
    ORDER BY
      cb.brandName ASC,
      cm.modelName ASC,
      v.licensePlate ASC,
      periodKey ASC
  `;

  const params = hasDateRange
    ? [dateFormat, startDate, endDate, ownerId]
    : [dateFormat, ownerId];
  return doQuery(query, params);
}

/** Fetches pending requests count by owner id.
 * Accepts ownerId; returns a promise for the requested data. */
async function getPendingRequestsCountByOwnerId(ownerId) {
  const query = `
    SELECT COUNT(*) AS count
    FROM rentals r
    JOIN vehicles v ON r.licensePlate = v.licensePlate
    WHERE v.ownerId = ?
    AND r.status = 'pending'
  `;
  return doQuery(query, [ownerId]);
}

/** Fetches renter dashboard action counts.
 * Accepts renterId; returns a promise for the requested data. */
async function getRenterDashboardActionCounts(renterId) {
  const query = `
    SELECT
      COUNT(DISTINCT CASE
        WHEN r.status = 'approved'
          AND p.status = 'pending'
          AND p.paymentToken IS NOT NULL
          AND p.paymentToken <> ''
        THEN r.rentalId
      END) AS paymentRequired,
      COUNT(DISTINCT CASE
        WHEN r.status = 'pending' THEN r.rentalId
      END) AS waitingForOwnerApproval
    FROM rentals r
    LEFT JOIN rental_payments p ON p.rentalId = r.rentalId
    WHERE r.renterId = ?
  `;
  const rows = await doQuery(query, [renterId]);
  return rows[0] || {
    paymentRequired: 0,
    waitingForOwnerApproval: 0,
  };
}

/** Fetches pending rental requests for owner.
 * Accepts ownerId; returns a promise for the requested data. */
async function getPendingRentalRequestsForOwner(ownerId) {
  const query = `
    SELECT
      r.rentalId, r.startDate, r.endDate, r.totalPrice,
      r.status AS rentalStatus, r.createdAt AS rentalCreatedAt,
      v.licensePlate, v.image, v.address, v.color, v.details,
      v.expirationDate, v.fuelType, v.km, v.price, v.seats,
      v.status, v.year, v.ownerId, v.createdAt,
      cb.brandId, cb.brandName,
      cm.modelId, cm.modelName,
      ct.carTypeId, ct.carTypeName,
      renter.firstName AS renterFirstName,
      renter.lastName AS renterLastName,
      renter.email AS renterEmail,
      owner.firstName AS ownerFirstName,
      owner.lastName AS ownerLastName,
      owner.email AS ownerEmail,
      owner.phone AS ownerPhone,
      owner.status AS ownerStatus
    FROM rentals r
    JOIN vehicles v ON r.licensePlate = v.licensePlate
    JOIN carmodels cm ON v.modelId = cm.modelId
    JOIN carbrands cb ON cm.brandId = cb.brandId
    JOIN cartypes ct ON cm.carTypeId = ct.carTypeId
    JOIN users renter ON r.renterId = renter.userId
    JOIN users owner ON v.ownerId = owner.userId
    WHERE v.ownerId = ?
    AND r.status = 'pending'
    ORDER BY r.createdAt ASC
  `;
  return doQuery(query, [ownerId]);
}

/** Fetches my trips history by renter id.
 * Accepts renterId; returns a promise for the requested data. */
async function getMyTripsHistoryByRenterId(renterId) {
  const query = `
    SELECT
      r.rentalId, r.startDate, r.endDate, r.totalPrice,
      r.status AS rentalStatus, r.createdAt AS rentalCreatedAt,
      v.licensePlate, v.image, v.address, v.color, v.details,
      v.expirationDate, v.fuelType, v.km, v.price, v.seats,
      v.status, v.year, v.ownerId, v.createdAt,
      cb.brandId, cb.brandName,
      cm.modelId, cm.modelName,
      ct.carTypeId, ct.carTypeName,
      owner.firstName AS ownerFirstName,
      owner.lastName AS ownerLastName,
      owner.email AS ownerEmail,
      owner.phone AS ownerPhone,
      owner.status AS ownerStatus,
      renter.firstName AS renterFirstName,
      renter.lastName AS renterLastName,
      p.paymentToken,
      p.status AS paymentStatus,
      rpl.pickupAddress AS snapshotPickupAddress,
      rpl.pickupLatitude AS snapshotPickupLatitude,
      rpl.pickupLongitude AS snapshotPickupLongitude,
      rpl.pickupInstructions AS snapshotPickupInstructions

    FROM rentals r
    JOIN vehicles v ON r.licensePlate = v.licensePlate
    JOIN carmodels cm ON v.modelId = cm.modelId
    JOIN carbrands cb ON cm.brandId = cb.brandId
    JOIN cartypes ct ON cm.carTypeId = ct.carTypeId
    JOIN users owner ON v.ownerId = owner.userId
    JOIN users renter ON r.renterId = renter.userId
    LEFT JOIN rental_payments p ON r.rentalId = p.rentalId
    LEFT JOIN rental_pickup_locations rpl ON rpl.rentalId = r.rentalId
    WHERE r.renterId = ?
    ORDER BY (r.status = 'approved') DESC, r.startDate DESC 
  `;
  return doQuery(query, [renterId]);
}

// Authoritative data set for rental lifecycle emails. Owner is resolved
// strictly through rentals.licensePlate -> vehicles.licensePlate ->
// vehicles.ownerId -> users.userId (never from client input), and the
// renter/owner aliases keep the two users impossible to confuse.
/** Fetches rental email data by rental id.
 * Accepts rentalId; returns a promise for the requested data. */
async function getRentalEmailDataByRentalId(rentalId) {
  const query = `
    SELECT
      r.rentalId,
      r.startDate,
      r.endDate,
      r.totalPrice,
      r.status AS rentalStatus,
      r.licensePlate,
      v.address AS vehicleAddress,
      cb.brandName,
      cm.modelName,
      v.ownerId,
      owner.firstName AS ownerFirstName,
      owner.lastName AS ownerLastName,
      owner.email AS ownerEmail,
      r.renterId,
      renter.firstName AS renterFirstName,
      renter.lastName AS renterLastName,
      renter.email AS renterEmail,
      renter.phone AS renterPhone
    FROM rentals r
    JOIN vehicles v ON r.licensePlate = v.licensePlate
    JOIN carmodels cm ON v.modelId = cm.modelId
    JOIN carbrands cb ON cm.brandId = cb.brandId
    JOIN users owner ON v.ownerId = owner.userId
    JOIN users renter ON r.renterId = renter.userId
    WHERE r.rentalId = ?
  `;
  const result = await doQuery(query, [rentalId]);
  return result[0];
}

/** Rejects pending rentals by license plate.
 * Accepts licensePlate; returns a promise for the operation result. */
async function rejectPendingRentalsByLicensePlate(licensePlate) {
  const query = `
    UPDATE rentals
    SET status = 'rejected'
    WHERE licensePlate = ?
    AND status = 'pending'
  `;

  return doQuery(query, [licensePlate]);
}

/** Cancels approved rentals by license plate.
 * Accepts licensePlate; returns the validation or boolean result. */
async function cancelApprovedRentalsByLicensePlate(licensePlate) {
  const query = `
    UPDATE rentals
    SET status = 'cancelled'
    WHERE licensePlate = ?
    AND status = 'approved'
    AND startDate > CURRENT_DATE()
  `;

  return doQuery(query, [licensePlate]);
}

/** Fetches affected renters by license plate.
 * Accepts licensePlate; returns a promise for the requested data. */
async function getAffectedRentersByLicensePlate(licensePlate) {
  const query = `
    SELECT rentalId, renterId, status
    FROM rentals
    WHERE licensePlate = ?
    AND (
      status = 'pending'
      OR
      (status = 'approved' AND startDate > CURRENT_DATE())
    )
  `;

  return doQuery(query, [licensePlate]);
}
/** Checks whether there is active rental now.
 * Accepts licensePlate; returns the validation or boolean result. */
async function hasActiveRentalNow(licensePlate) {
  const query = `
    SELECT rentalId
    FROM rentals
    WHERE licensePlate = ?
    AND status = 'approved'
    AND startDate <= CURRENT_DATE()
    AND endDate >= CURRENT_DATE()
    LIMIT 1
  `;

  const rentals = await doQuery(query, [licensePlate]);

  return rentals.length > 0;
}

module.exports = {
  checkIfVehicleIsAvailable,
  getMyRentalsByRenterId,
  getRequestsForMyVehiclesByOwnerId,
  getRentalById,
  updateRentalStatus,
  getRentalsStartingTomorrow,
  getRentalsEndingTomorrow,
  getBookedDatesByPlate,
  getVehicleRentalMetricsByLicensePlate,
  getRentalsToComplete,
  getRentalsToExpire,
  completeExpiredRentals,
  cancelExpiredRentals,
  getMonthlyEarningsByOwnerId,
  getBookingValueByRange,
  getBookingsChartByRange,
  getOwnerEarningsChartByRange,
  getOwnerVehicleEarningsComparisonBounds,
  getOwnerVehicleEarningsComparisonByRange,
  getPendingRequestsCountByOwnerId,
  getRenterDashboardActionCounts,
  getPendingRentalRequestsForOwner,
  getMyTripsHistoryByRenterId,
  getRentalEmailDataByRentalId,
  rejectPendingRentalsByLicensePlate,
  cancelApprovedRentalsByLicensePlate,
  getAffectedRentersByLicensePlate,
  hasActiveRentalNow,
};
