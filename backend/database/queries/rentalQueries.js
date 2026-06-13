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

async function updateVehicleConditions(licensePlate, status) {
  const updateVehicleStatus = `update Vehicles set status = ? where licensePlate = ?`;
  const valuesOfupdateVehicleStatus = [status, licensePlate];
  const result = await doQuery(
    updateVehicleStatus,
    valuesOfupdateVehicleStatus,
  );
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


module.exports = {
  checkIfVehicleIsAvailable,
  getMyRentalsByRenterId,
  getRequestsForMyVehiclesByOwnerId,
  getRentalById,
  updateRentalStatus,
  updateVehicleConditions,
  getRenterEmailByRentalId,
  getRentalsStartingTomorrow,
  getRentalsEndingTomorrow,
};
