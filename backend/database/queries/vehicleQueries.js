const doQuery = require("../query");

// Helper functions to fetch single vehicle records from the database depending on his license plate
async function getVehicleByLicensePlate(plate) {
  try {
    const result = await doQuery(
      "SELECT * FROM vehicles WHERE licensePlate = ?",
      [plate],
    );
    console.log(result, '😆 in getVehicleByLicensePlate');
    return result[0];

  } catch (error) {
    console.error("Error checking existing license plate:", error);
    throw error;
  }
}


module.exports = { getVehicleByLicensePlate };
