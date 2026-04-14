const STATUS_CODE = require("../constants/statusCodes");

function throwErr(status, message, res) {
  const err = new Error(message);
  res.status(status);
  err.status = status;
  throw err;
}
function checkValidPhoneIL(phone) {
  if (typeof phone !== "string" && typeof phone !== "number") return false;

  // normalize: remove spaces, dashes, parentheses
  const cleaned = String(phone).replace(/[^\d+]/g, "");

  // +9725XXXXXXXX
  if (/^\+9725\d{8}$/.test(cleaned)) return true;

  // 9725XXXXXXXX
  if (/^9725\d{8}$/.test(cleaned)) return true;

  // 05XXXXXXXX (10 digits)
  if (/^05\d{8}$/.test(cleaned)) return true;

  return false;
}

function checkValidName(name) {
  const regex = /^[a-zA-Z0-9_]+$/; // Only allows letters, numbers, and underscores
  const minLength = 2; // Minimum length for the name
  const maxLength = 30; // Maximum length for the name

  if (typeof name !== "string") {
    return false; // Name must be a string
  }

  if (name.length < minLength || name.length > maxLength) {
    return false; // Name must be within the specified length
  }
  return regex.test(name);
}

function checkValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email format validation

  if (typeof email !== "string") {
    return false; // Email must be a string
  }

  return regex.test(email);
}

function checkValidPassword(password) {
  const maxLength = 8; // Maximum length for the password
  const minLength = 3; // Minimum length for the password
  const hasUpperCase = /[A-Z]/.test(password); // Check for uppercase letters
  const hasLowerCase = /[a-z]/.test(password); // Check for lowercase letters
  const hasNumbers = /[0-9]/.test(password); // Check for numbers

  if (typeof password !== "string") {
    return false; // Password must be a string
  }

  if (password.length < minLength || password.length > maxLength) {
    throwErr(
      STATUS_CODE.BAD_REQUEST,
      `Password must be between ${minLength} and ${maxLength} characters.`,
      res,
    );
  }

  return hasUpperCase && hasLowerCase && hasNumbers;
}

//this part to Vehicle Validations (for add/update routes) - can be extended for user validations if needed in the future

/**
 *
 * Validates session and vehicle payload for CREATE (addVehicle).
 * Returns normalized values ready for DB insert (licensePlate as int).
 */
function validateAndNormalizeVehicleCreate(req, res) {
  // 1) session check

  if (!req.session?.user) {
    console.error("User not logged in");
    throwErr(
      STATUS_CODE.UNAUTHORIZED,
      "You must be logged in to perform this action.",
      res,
    );
  }

  const { userId } = req.session.user;
  const {
    licensePlate,
    make,
    fuelType,
    expirationDate,
    image,
    year,
    km,
    address,
    price,
    color,
  } = req.body;

  // 2) required fields (numeric must allow 0)
  if (
    licensePlate == null ||
    !make ||
    !fuelType ||
    !expirationDate ||
    !image ||
    year == null ||
    km == null ||
    !address ||
    price == null ||
    !color
  ) {
    console.error("Missing required fields:", {
      licensePlate,
      make,
      fuelType,
      expirationDate,
      image,
      year,
      km,
      address,
      price,
      color,
    });
    throwErr(STATUS_CODE.BAD_REQUEST, "All fields are required.", res);
  }

  // 3) licensePlate numeric only + 7/8 digits
  const plateString = String(licensePlate).trim();
  const isPureNumeric = /^\d+$/.test(plateString);

  if (!isPureNumeric) {
    console.error("Invalid license plate format:", plateString);
    throwErr(
      STATUS_CODE.BAD_REQUEST,
      "License plate must contain numbers only.",
      res,
    );
  }

  if (plateString.length < 7 || plateString.length > 8) {
    console.error("Invalid license plate length:", plateString.length);
    throwErr(
      STATUS_CODE.BAD_REQUEST,
      "Enter a valid Israeli license plate (7 or 8 digits).",
      res,
    );
  }

  // normalize for DB
  const plateAsInt = Number.parseInt(plateString, 10);

  // 4) year / km / price validation
  const currentYear = new Date().getFullYear();

  if (Number.isNaN(Number(year))) {
    console.error("Invalid Year value:", year);
    throwErr(STATUS_CODE.BAD_REQUEST, "Year must be a number.", res);
  }
  if (Number.isNaN(Number(km))) {
    console.error("Invalid KM value:", km);
    throwErr(STATUS_CODE.BAD_REQUEST, "KM must be a number.", res);
  }
  if (Number.isNaN(Number(price))) {
    console.error("Invalid Price value:", price);
    throwErr(STATUS_CODE.BAD_REQUEST, "Price must be a number.", res);
  }

  const yearNum = Number(year);
  const kmNum = Number(km);
  const priceNum = Number(price);

  if (yearNum < 1900 || yearNum > currentYear + 1) {
    console.error("Year out of valid range:", yearNum);
    throwErr(
      STATUS_CODE.BAD_REQUEST,
      `Enter a valid year between 1900 and ${currentYear + 1}`,
      res,
    );
  }

  if (kmNum < 0 || priceNum < 0) {
    console.error("Negative value for KM or Price:", {
      km: kmNum,
      price: priceNum,
    });
    throwErr(
      STATUS_CODE.BAD_REQUEST,
      "Kilometers and Price cannot be negative.",
      res,
    );
  }

  return {
    userId,
    vehicle: {
      licensePlate: plateAsInt,
      make,
      fuelType,
      expirationDate,
      image,
      year: yearNum,
      km: kmNum,
      address,
      price: priceNum,
      color,
    },
  };
}

/**
 * For update: optional fields, but if provided, validate types/ranges.
 * Returns merged data (defaults to existing vehicle).
 */
function validateAndMergeVehicleUpdate(existingVehicle, body, req, res) {
  if (!req.session?.user) {
    console.error("User not logged in");
    throwErr(
      STATUS_CODE.UNAUTHORIZED,
      "You must be logged in to perform this action.",
      res,
    );
  }

  const merged = {
    make: body.make ?? existingVehicle.make,
    fuelType: body.fuelType ?? existingVehicle.fuelType,
    expirationDate: body.expirationDate ?? existingVehicle.expirationDate,
    image: body.image ?? existingVehicle.image,
    year: body.year ?? existingVehicle.year,
    km: body.km ?? existingVehicle.km,
    address: body.address ?? existingVehicle.address,
    price: body.price ?? existingVehicle.price,
    color: body.color ?? existingVehicle.color,
  };

  const {
    make,
    fuelType,
    expirationDate,
    image,
    year,
    km,
    address,
    price,
    color,
  } = merged;

  if (
    !make ||
    !fuelType ||
    !expirationDate ||
    !image ||
    year == null ||
    km == null ||
    !address ||
    price == null ||
    !color
  ) {
    console.error("Missing required fields:", {
      make,
      fuelType,
      expirationDate,
      image,
      year,
      km,
      address,
      price,
      color,
    });
    throwErr(STATUS_CODE.BAD_REQUEST, "All fields are required.", res);
  }

  const currentYear = new Date().getFullYear();

  // if user sent year/km/price, validate as numbers (also validate merged)
  const yearNum = Number(merged.year);
  const kmNum = Number(merged.km);
  const priceNum = Number(merged.price);

  if (Number.isNaN(yearNum)) {
    console.error("Invalid year value:", merged.year);
    throwErr(STATUS_CODE.BAD_REQUEST, "Year must be a number.", res);
  }
  if (Number.isNaN(kmNum)) {
    console.error("Invalid KM value:", merged.km);
    throwErr(STATUS_CODE.BAD_REQUEST, "KM must be a number.", res);
  }
  if (Number.isNaN(priceNum)) {
    console.error("Invalid Price value:", merged.price);
    throwErr(STATUS_CODE.BAD_REQUEST, "Price must be a number.", res);
  }

  if (yearNum < 1900 || yearNum > currentYear + 1) {
    console.error("Year out of valid range:", yearNum);
    throwErr(
      STATUS_CODE.BAD_REQUEST,
      `Enter a valid year between 1900 and ${currentYear + 1}`,
      res,
    );
  }
  if (kmNum < 0 || priceNum < 0) {
    console.error("Negative value for KM or Price:", {
      km: kmNum,
      price: priceNum,
    });
    throwErr(
      STATUS_CODE.BAD_REQUEST,
      "Kilometers and Price cannot be negative.",
      res,
    );
  }

  return {
    ...merged,
    year: yearNum,
    km: kmNum,
    price: priceNum,
  };
}

module.exports = {
  checkValidName,
  checkValidEmail,
  checkValidPassword,
  checkValidPhoneIL,
  validateAndNormalizeVehicleCreate,
  validateAndMergeVehicleUpdate,
  throwErr,
};
