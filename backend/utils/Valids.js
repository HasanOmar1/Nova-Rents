/** Shared backend utility for valids operations.
 * Normalizes, validates, or transforms values for the surrounding domain. */
// Frontend-copy friendly validators (pure functions, no req/res/session dependency)

/** Validates an Israeli mobile number in local or international form.
 * Accepts phone; returns a boolean validity result. */
function checkValidPhoneIL(phone) {
  if (typeof phone !== "string" && typeof phone !== "number") return false;
  const cleaned = String(phone).replace(/[^\d+]/g, "");
  if (/^\+9725\d{8}$/.test(cleaned)) return true;
  if (/^9725\d{8}$/.test(cleaned)) return true;
  if (/^05\d{8}$/.test(cleaned)) return true;
  return false;
}

/** Validates a name against the allowed length and character rules.
 * Accepts name; returns a boolean validity result. */
function checkValidName(name) {
  const regex = /^[a-zA-Z0-9_]+$/;
  const minLength = 2;
  const maxLength = 30;
  if (typeof name !== "string") return false;
  if (name.length < minLength || name.length > maxLength) return false;
  return regex.test(name);
}

/** Validates a string with the service's email-address pattern.
 * Accepts email; returns a boolean validity result. */
function checkValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof email !== "string") return false;
  return regex.test(email);
}

/** Validates a password against the configured strength rules.
 * Accepts password; returns a boolean validity result. */
function checkValidPassword(password) {
  const maxLength = 8;
  const minLength = 3;
  if (typeof password !== "string") return false;
  if (password.length < minLength || password.length > maxLength) return false;

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  return hasUpperCase && hasLowerCase && hasNumbers;
}

module.exports = {
  checkValidName,
  checkValidEmail,
  checkValidPassword,
  checkValidPhoneIL,
};
