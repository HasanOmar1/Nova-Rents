// Helper functions to fetch single user/vehicle records from the database
const doQuery = require("../database/query");

async function getUserByEmail(email) {
  try {
    const result = await doQuery("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    return result[0];
  } catch (error) {
    console.error("Error checking existing user:", error);
    throw error;
  }
}

async function getVehicleByLicensePlate(plate) {
  try {
    const result = await doQuery(
      "SELECT * FROM vehicles WHERE licensePlate = ?",
      [plate],
    );

    return result[0];
  } catch (error) {
    console.error("Error checking existing license plate:", error);
    throw error;
  }
}
module.exports = { getUserByEmail, getVehicleByLicensePlate };
