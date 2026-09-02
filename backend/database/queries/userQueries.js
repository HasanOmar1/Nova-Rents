/** Database query helpers for user records.
 * Encapsulates the domain's SQL reads, writes, and result shaping. */
const doQuery = require("../query");

// Helper functions to fetch single user records from the database depending on his email
/** Fetches user by email.
 * Accepts email; returns a promise for the requested data. */
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

/** Fetches user by phone.
 * Accepts phone; returns a promise for the requested data. */
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
/** Fetches user by id.
 * Accepts userId; returns a promise for the requested data. */
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
