const doQuery = require("../query");

async function checkIfVehicleIsAvailable(licensePlate, startDate, endDate) {
  const checkIfVehicleIsAvailable = `select rentalId from rentals where licensePlate =? AND status IN ('pending', 'approved') and startDate <= ? and endDate >= ?`;
  const valuesOfcheckIfVehicleIsAvailable = [licensePlate, endDate, startDate];
  const rentalIsAvailable = await doQuery(
    checkIfVehicleIsAvailable,
    valuesOfcheckIfVehicleIsAvailable,
  );
  return rentalIsAvailable.length > 0;
}
async function getMyRentalsByRenterId(renterId) {
  const getMyRentalsByRenterId = `select * from rentals where renterId = ? `;
  const valuesOfgetMyRentalsByRenterId = [renterId];
  const myRentals = await doQuery(
    getMyRentalsByRenterId,
    valuesOfgetMyRentalsByRenterId,
  );
  return myRentals;
}
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
async function getRentalById(rentalId) {
  const getRentalById = `select r.*, v.ownerId from rentals r 
  join vehicles v
   on r.licensePlate = v.licensePlate where rentalId = ?`;
  const valuesOfgetRentalById = [rentalId];
  const rental = await doQuery(getRentalById, valuesOfgetRentalById);
  return rental[0];
}
async function updateRentalStatus(rentalId, status) {
  const updateRentalStatus = `update rentals set status = ? where rentalId = ?`;
  const valuesOfupdateRentalStatus = [status, rentalId];
  const result = await doQuery(updateRentalStatus, valuesOfupdateRentalStatus);
  return result;
}

async function getRenterEmailByRentalId(rentalId) {
  const getEmailByRentalId = `select u.email from rentals r join users u on r.renterId = u.userId where rentalId = ?`;
  const valuesOfgetEmailByRentalId = [rentalId];
  const renterEmail = await doQuery(
    getEmailByRentalId,
    valuesOfgetEmailByRentalId,
  );
  return renterEmail[0];
}

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

async function getRentalsToComplete() {
  const query = `
    SELECT rentalId, licensePlate 
    FROM rentals 
    WHERE status = 'approved' AND endDate < CURRENT_DATE()
  `;

  return doQuery(query);
}

async function getRentalsToExpire() {
  const query = `
    SELECT rentalId, licensePlate 
    FROM rentals 
    WHERE status = 'pending' AND startDate < CURRENT_DATE()
  `;

  return doQuery(query);
}

async function completeExpiredRentals() {
  const query = `
    UPDATE rentals 
    SET status = 'completed' 
    WHERE status = 'approved' AND endDate < CURRENT_DATE()
  `;

  const result = await doQuery(query);
  return result;
}
async function cancelExpiredRentals() {
  const query = `
    UPDATE rentals 
    SET status = 'cancelled' 
    WHERE status = 'pending' AND startDate < CURRENT_DATE()
  `;

  const result = await doQuery(query);
  return result;
}

async function getMonthlyEarningsByOwnerId(ownerId) {
  const query = `
    SELECT COALESCE(SUM(r.totalPrice), 0) AS total
    FROM rentals r
    JOIN vehicles v ON r.licensePlate = v.licensePlate
    WHERE v.ownerId = ?
    AND r.status = 'approved'
    AND MONTH(r.startDate) = MONTH(CURRENT_DATE())
    AND YEAR(r.startDate) = YEAR(CURRENT_DATE())
  `;
  return doQuery(query, [ownerId]);
}

// Total value of approved + completed booking requests created in the range
// (admin statistics). Uses the exact same WHERE conditions as
// getBookingsChartByRange so the Booking Value card always describes the same
// rental rows as the Bookings card and chart. createdAt is a TIMESTAMP, so the
// end bound uses < DATE_ADD(end, 1 DAY) to include the whole final day.
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

async function getUpcomingTripsCountByUserId(userId) {
  const query = `
    SELECT COUNT(*) AS count
    FROM rentals r
    JOIN vehicles v ON r.licensePlate = v.licensePlate
    WHERE (v.ownerId = ? OR r.renterId = ?)
    AND r.status = 'approved'
    AND r.startDate >= CURRENT_DATE()
  `;
  return doQuery(query, [userId, userId]);
}

async function getPastTripsCountByRenterId(renterId) {
  const query = `
    SELECT COUNT(*) AS count
    FROM rentals
    WHERE renterId = ?
    AND status IN ('completed', 'approved')
    AND endDate < CURRENT_DATE()
  `;
  return doQuery(query, [renterId]);
}

async function getDashboardChartDataByUserId(userId) {
  const query = `
    SELECT
      MONTH(r.startDate) AS monthIndex,
      YEAR(r.startDate) AS year,
      SUM(CASE WHEN v.ownerId = ? THEN r.totalPrice ELSE 0 END) AS totalEarnings,
      COUNT(*) AS totalTrips
    FROM rentals r
    JOIN vehicles v ON r.licensePlate = v.licensePlate
    WHERE (v.ownerId = ? OR r.renterId = ?)
    AND r.status IN ('approved', 'completed')
    AND r.startDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
    GROUP BY YEAR(r.startDate), MONTH(r.startDate)
  `;
  return doQuery(query, [userId, userId, userId]);
}

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

async function rejectPendingRentalsByLicensePlate(licensePlate) {
  const query = `
    UPDATE rentals
    SET status = 'rejected'
    WHERE licensePlate = ?
    AND status = 'pending'
  `;

  return doQuery(query, [licensePlate]);
}

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
  getRenterEmailByRentalId,
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
  getUpcomingTripsCountByUserId,
  getPastTripsCountByRenterId,
  getDashboardChartDataByUserId,
  getPendingRentalRequestsForOwner,
  getMyTripsHistoryByRenterId,
  getRentalEmailDataByRentalId,
  rejectPendingRentalsByLicensePlate,
  cancelApprovedRentalsByLicensePlate,
  getAffectedRentersByLicensePlate,
  hasActiveRentalNow,
};
