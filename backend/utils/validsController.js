const STATUS_CODE = require("../constants/statusCodes");
const {
  checkValidName,
  checkValidEmail,
  checkValidPassword,
  checkValidPhoneIL,
} = require("./Valids");
const { clearFailedUploads } = require("./handleUploads");

function sendValidationError(res, code, message) {
  return res.status(code).json({ message });
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
function validateRequiredRentalFields(body, res) {
  const { licensePlate, startDate, endDate } = body;
  if (!licensePlate || !startDate || !endDate) {
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
  const handleError = (status, msg) => {
    clearFailedUploads(req.files);
    return sendValidationError(res, status, msg);
  };

  if (!req.session?.user) {
    return handleError(
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
    year,
    km,
    address,
    price,
    color,
    details,
    seats,
  } = req.body;

  const uploadedFiles = req.files;

  if (!uploadedFiles || uploadedFiles.length === 0) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "At least one vehicle image is required.",
    );
  }

  if (
    licensePlate == null ||
    !fuelType ||
    !expirationDate ||
    year == null ||
    km == null ||
    !address ||
    price == null ||
    !color ||
    modelId == null ||
    !details || // <-- ADDED
    seats == null // <-- ADDED
  ) {
    return handleError(STATUS_CODE.BAD_REQUEST, "All fields are required.");
  }

  const imageFilenames = uploadedFiles.map((file) => file.filename);
  const imageJsonString = JSON.stringify(imageFilenames);

  const plateString = String(licensePlate).trim();
  if (!/^\d+$/.test(plateString)) {
    return handleError(
      STATUS_CODE.BAD_REQUEST,
      "License plate must contain numbers only.",
    );
  }
  if (plateString.length < 7 || plateString.length > 8) {
    return handleError(
      STATUS_CODE.BAD_REQUEST,
      "Enter a valid Israeli license plate (7 or 8 digits).",
    );
  }

  if (Number.isNaN(Number(year)))
    return handleError(STATUS_CODE.BAD_REQUEST, "Year must be a number.");
  if (Number.isNaN(Number(km)))
    return handleError(STATUS_CODE.BAD_REQUEST, "KM must be a number.");
  if (Number.isNaN(Number(price)))
    return handleError(STATUS_CODE.BAD_REQUEST, "Price must be a number.");
  if (Number.isNaN(Number(seats)))
    // <-- ADDED
    return handleError(STATUS_CODE.BAD_REQUEST, "Seats must be a number.");

  const yearNum = Number(year);
  const kmNum = Number(km);
  const priceNum = Number(price);
  const seatsNum = Number(seats); // <-- ADDED
  const currentYear = new Date().getFullYear();

  if (yearNum < 1900 || yearNum > currentYear + 1) {
    return handleError(
      STATUS_CODE.BAD_REQUEST,
      `Enter a valid year between 1900 and ${currentYear + 1}`,
    );
  }
  if (kmNum < 0 || priceNum < 0) {
    return handleError(
      STATUS_CODE.BAD_REQUEST,
      "Kilometers and Price cannot be negative.",
    );
  }
  if (seatsNum < 1 || seatsNum > 15) {
    // <-- ADDED SAFETY CHECK
    return handleError(
      STATUS_CODE.BAD_REQUEST,
      "Seats must be between 1 and 15.",
    );
  }

  return {
    userId,
    vehicle: {
      licensePlate: Number.parseInt(plateString, 10),
      fuelType,
      expirationDate,
      year: yearNum,
      km: kmNum,
      address,
      price: Number(priceNum),
      color,
      modelId,
      details,
      seats: seatsNum,
      image: imageJsonString,
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

  let imageToSave = existingVehicle.image;
  if (req.files && req.files.length > 0) {
    const imageFilenames = req.files.map((file) => file.filename);
    imageToSave = JSON.stringify(imageFilenames);
  }

  const merged = {
    modelId: body.modelId ?? existingVehicle.modelId,
    fuelType: body.fuelType ?? existingVehicle.fuelType,
    expirationDate: body.expirationDate ?? existingVehicle.expirationDate,
    image: imageToSave,
    year: body.year ?? existingVehicle.year,
    km: body.km ?? existingVehicle.km,
    address: body.address ?? existingVehicle.address,
    price: body.price ?? existingVehicle.price,
    color: body.color ?? existingVehicle.color,
    status: body.status ?? existingVehicle.status,
    details: body.details ?? existingVehicle.details, // <-- ADDED
    seats: body.seats ?? existingVehicle.seats, // <-- ADDED
  };

  if (
    merged.modelId == null ||
    !merged.fuelType ||
    !merged.expirationDate ||
    !merged.image ||
    merged.year == null ||
    merged.km == null ||
    !merged.address ||
    merged.price == null ||
    !merged.color ||
    !merged.status ||
    !merged.details ||
    merged.seats == null
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
  const seatsNum = Number(merged.seats);
  const currentYear = new Date().getFullYear();

  if (Number.isNaN(yearNum))
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Year must be a number.",
    );
  if (Number.isNaN(kmNum))
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "KM must be a number.",
    );
  if (Number.isNaN(priceNum))
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Price must be a number.",
    );
  if (Number.isNaN(seatsNum))
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Seats must be a number.",
    );

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
  if (seatsNum < 1 || seatsNum > 15) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "Seats must be between 1 and 15.",
    );
  }

  return {
    ...merged,
    year: yearNum,
    km: kmNum,
    price: priceNum,
    seats: seatsNum,
  };
}

function validateComplaintFields(body, res) {
  const { complaintType, title, description } = body;

  if (!complaintType || !title?.trim() || !description?.trim()) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "complaintType, title, and description are required",
    );
  }

  if (!["vehicle", "owner"].includes(complaintType)) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "complaintType must be 'vehicle' or 'owner'",
    );
  }

  if (complaintType === "vehicle" && !body.vehicleLicensePlate) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "vehicleLicensePlate is required for vehicle complaints",
    );
  }

  if (complaintType === "owner" && !body.ownerEmail) {
    return sendValidationError(
      res,
      STATUS_CODE.BAD_REQUEST,
      "ownerEmail is required for owner complaints",
    );
  }

  return true;
}

module.exports = {
  validateRequiredRegisterFields,
  validateRegisterInputFormats,
  validateLoginFields,
  validateAuthenticatedUser,
  validateEmailInBody,
  validateAndNormalizeVehicleCreate,
  validateAndMergeVehicleUpdate,
  validateUpdateInputFormats,
  validateRequiredRentalFields,
  validateComplaintFields,
};
