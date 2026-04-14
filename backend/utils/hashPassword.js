// Utility to hash plaintext passwords using bcrypt before storing in the database
const bcrypt = require('bcrypt');

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