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
      owner.phone AS ownerPhone
    FROM rentals r
    JOIN vehicles v ON r.licensePlate = v.licensePlate
    JOIN carModels cm ON v.modelId = cm.modelId
    JOIN carBrands cb ON cm.brandId = cb.brandId
    JOIN carTypes ct ON cm.carTypeId = ct.carTypeId
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

      renter.firstName AS renterFirstName,
      renter.lastName AS renterLastName

    FROM rentals r
    JOIN vehicles v ON r.licensePlate = v.licensePlate
    JOIN carModels cm ON v.modelId = cm.modelId
    JOIN carBrands cb ON cm.brandId = cb.brandId
    JOIN carTypes ct ON cm.carTypeId = ct.carTypeId
    JOIN users owner ON v.ownerId = owner.userId
    JOIN users renter ON r.renterId = renter.userId
    WHERE r.renterId = ?
    ORDER BY r.startDate DESC
  `;
  return doQuery(query, [renterId]);
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
    AND endDate > CURRENT_DATE()
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
  completeExpiredRentals,
  cancelExpiredRentals,
  getMonthlyEarningsByOwnerId,
  getPendingRequestsCountByOwnerId,
  getUpcomingTripsCountByUserId,
  getPastTripsCountByRenterId,
  getDashboardChartDataByUserId,
  getPendingRentalRequestsForOwner,
  getMyTripsHistoryByRenterId,
  rejectPendingRentalsByLicensePlate,
  cancelApprovedRentalsByLicensePlate,
  getAffectedRentersByLicensePlate,
  hasActiveRentalNow,
};
