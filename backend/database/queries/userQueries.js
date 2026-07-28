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

async function getUserByPhone(phone) {
  try {
    const result = await doQuery("SELECT * FROM users WHERE phone = ?", [
      phone,
    ]);
    return result[0];
  } catch (error) {
    console.error("Error checking existing user:", error);
    throw error;
  }
}

// Public profile fields only — used to resolve a reported owner by userId
// without putting email in the URL.
async function getUserById(userId) {
  const result = await doQuery(
    `SELECT userId, firstName, lastName, email, role, status, createdAt
     FROM users
     WHERE userId = ?`,
    [userId],
  );
  return result[0];
}

module.exports = { getUserByEmail, getUserByPhone, getUserById };
