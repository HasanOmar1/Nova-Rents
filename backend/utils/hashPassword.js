/** Shared backend utility for hash password operations.
 * Normalizes, validates, or transforms values for the surrounding domain. */
// Utility to hash plaintext passwords using bcrypt before storing in the database
const bcrypt = require('bcrypt');

/** Hashes a plaintext password with bcrypt before persistence.
 * Accepts password; returns a promise for the bcrypt hash. */
async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error("Error hashing password:", error);
    throw error;
  }
}
module.exports = hashPassword;
