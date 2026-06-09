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
  const getRequestsForMyVehiclesByOwnerId = ` SELECT r.*
    FROM rentals r
    JOIN vehicles v
      ON r.licensePlate = v.licensePlate
    WHERE v.ownerId = ?
      AND r.status = 'pending'
  `;
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
  const result = await doQuery(updateVehicleStatus, valuesOfupdateVehicleStatus);
  return result;
}
module.exports = {
  checkIfVehicleIsAvailable,
  getMyRentalsByRenterId,
  getRequestsForMyVehiclesByOwnerId,
  getRentalById,
  updateRentalStatus,
  updateVehicleConditions
};
