const doQuery = require("../query");

// Helper functions to fetch single user records from the database depending on his email
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

module.exports = { getUserByEmail };
