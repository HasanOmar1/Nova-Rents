const STATUS_CODE = require("../constants/statusCodes");
const {
  checkValidName,
  checkValidEmail,
  checkValidPassword,
  checkValidPhoneIL,
} = require("./Valids");

function sendValidationError(res, status, message) {
  res.status(status).json({ message });
  return null;
}

function validateRequiredRegisterFields(body, res) {
  const { firstName, lastName, email, password, phone, birthDate } = body;
  if (!firstName || !lastName || !email || !password || !phone || !birthDate) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Missing required fields",
    );
  }
  return true;
}

function validateRegisterInputFormats(body, res) {
  const { firstName, lastName, email, password, phone } = body;

  if (!checkValidName(firstName)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid first name. It should be 2-30 characters long and contain only letters, numbers, and underscores.",
    );
  }
  if (!checkValidName(lastName)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid last name. It should be 2-30 characters long and contain only letters, numbers, and underscores.",
    );
  }
  if (!checkValidEmail(email)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid email format.",
    );
  }
  if (!checkValidPassword(password)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid password. It should be 3-8 characters long and include uppercase letters, lowercase letters, and numbers.",
    );
  }
  if (!checkValidPhoneIL(phone)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid phone number format.",
    );
  }
  return true;
}

function validateUpdateProfileInputFormats(body, res) {
  const { firstName, lastName, phone, birthDate, password, newEmail } = body;

  if (firstName && !/^[A-Za-z0-9_]{2,30}$/.test(firstName)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid first name. It should be 2-30 characters long and contain only letters, numbers, and underscores.",
    );
  }

  if (lastName && !/^[A-Za-z0-9_]{2,30}$/.test(lastName)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid last name. It should be 2-30 characters long and contain only letters, numbers, and underscores.",
    );
  }

  if (phone && !/^05\d{8}$/.test(phone)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid phone number. It should start with 05 and contain 10 digits.",
    );
  }

  if (birthDate && isNaN(Date.parse(birthDate))) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid birth date.",
    );
  }

  if (password && password.length < 6) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid password. It should be at least 6 characters long.",
    );
  }

  if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid email format.",
    );
  }

  return true;
}

function validateLoginFields(email, password, res) {
  if (!email || !password) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Email and password are required",
    );
  }
  return true;
}

function validateUpdateInputFormats(body, res) {
  const { firstName, lastName, newEmail, password, phone } = body;

  // Only validate if the field was actually sent in the request
  if (firstName !== undefined && !checkValidName(firstName)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid first name. It should be 2-30 characters long and contain only letters, numbers, and underscores.",
    );
  }
  if (lastName !== undefined && !checkValidName(lastName)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid last name. It should be 2-30 characters long and contain only letters, numbers, and underscores.",
    );
  }
  if (newEmail !== undefined && !checkValidEmail(newEmail)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid email format.",
    );
  }
  if (password !== undefined && !checkValidPassword(password)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid password. It should be 3-8 characters long and include uppercase letters, lowercase letters, and numbers.",
    );
  }
  if (phone !== undefined && !checkValidPhoneIL(phone)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Invalid phone number format.",
    );
  }

  return true;
}

function validateAuthenticatedUser(req, res, message) {
  if (!req.session?.user) {
    return sendValidationError(res, STATUS_CODE.UNAUTHORIZED, message);
  }
  return true;
}

function validateEmailInBody(email, res) {
  if (!email) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Email is required in the request body",
    );
  }
  return true;
}

function validateAndNormalizeVehicleCreate(req, res) {
  if (!req.session?.user) {
    return sendValidationError(
      res,
      STATUS_CODE.UNAUTHORIZED,
      "You must be logged in to perform this action.",
    );
  }

  const { userId } = req.session.user;
  const {
    licensePlate,
    modelId,
    fuelType,
    expirationDate,
    image,
    year,
    km,
    address,
    price,
    color,
  } = req.body;

  if (
    licensePlate == null ||
    !fuelType ||
    !expirationDate ||
    !image ||
    year == null ||
    km == null ||
    !address ||
    price == null ||
    !color ||
    modelId == null
  )
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "All fields are required.",
    );

  const plateString = String(licensePlate).trim();
  if (!/^\d+$/.test(plateString)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "License plate must contain numbers only.",
    );
  }
  if (plateString.length < 7 || plateString.length > 8) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Enter a valid Israeli license plate (7 or 8 digits).",
    );
  }

  if (Number.isNaN(Number(year))) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Year must be a number.",
    );
  }
  if (Number.isNaN(Number(km))) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "KM must be a number.",
    );
  }
  if (Number.isNaN(Number(price))) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Price must be a number.",
    );
  }

  const yearNum = Number(year);
  const kmNum = Number(km);
  const priceNum = Number(price);
  const currentYear = new Date().getFullYear();

  if (yearNum < 1900 || yearNum > currentYear + 1) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      `Enter a valid year between 1900 and ${currentYear + 1}`,
    );
  }
  if (kmNum < 0 || priceNum < 0) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Kilometers and Price cannot be negative.",
    );
  }

  return {
    userId,
    vehicle: {
      licensePlate: Number.parseInt(plateString, 10),
      fuelType,
      expirationDate,
      image,
      year: yearNum,
      km: kmNum,
      address,
      price: priceNum,
      color,
      modelId,
    },
  };
}

function validateAndMergeVehicleUpdate(existingVehicle, body, req, res) {
  if (
    !validateAuthenticatedUser(
      req,
      res,
      "You must be logged in to perform this action.",
    )
  ) {
    return null;
  }

  const merged = {
    fuelType: body.fuelType ?? existingVehicle.fuelType,
    expirationDate: body.expirationDate ?? existingVehicle.expirationDate,
    image: body.image ?? existingVehicle.image,
    year: body.year ?? existingVehicle.year,
    km: body.km ?? existingVehicle.km,
    address: body.address ?? existingVehicle.address,
    price: body.price ?? existingVehicle.price,
    color: body.color ?? existingVehicle.color,
  };

  if (
    merged.brandId == null ||
    merged.modelId == null ||
    merged.typeId == null ||
    !merged.fuelType ||
    !merged.expirationDate ||
    !merged.image ||
    merged.year == null ||
    merged.km == null ||
    !merged.address ||
    merged.price == null ||
    !merged.color
  ) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "All fields are required.",
    );
  }

  const yearNum = Number(merged.year);
  const kmNum = Number(merged.km);
  const priceNum = Number(merged.price);
  const currentYear = new Date().getFullYear();

  if (Number.isNaN(yearNum)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Year must be a number.",
    );
  }
  if (Number.isNaN(kmNum)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "KM must be a number.",
    );
  }
  if (Number.isNaN(priceNum)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Price must be a number.",
    );
  }
  if (yearNum < 1900 || yearNum > currentYear + 1) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      `Enter a valid year between 1900 and ${currentYear + 1}`,
    );
  }
  if (kmNum < 0 || priceNum < 0) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Kilometers and Price cannot be negative.",
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
  validateRequiredRegisterFields,
  validateRegisterInputFormats,
  validateLoginFields,
  validateAuthenticatedUser,
  validateEmailInBody,
  validateAndNormalizeVehicleCreate,
  validateAndMergeVehicleUpdate,
  validateUpdateProfileInputFormats,
  validateUpdateInputFormats,
};
