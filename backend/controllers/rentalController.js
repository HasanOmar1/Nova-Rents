const {
  getVehicleByLicensePlate,
} = require("../database/queries/vehicleQueries");
const doQuery = require("../database/query");
const STATUS_CODE = require("../constants/statusCodes");
const {
  validateAuthenticatedUser,
  validateRequiredRentalFields,
} = require("../utils/validsController");
const {
  checkIfVehicleIsAvailable,
  getMyRentalsByRenterId,
  getRequestsForMyVehiclesByOwnerId,
  getRentalById,
  updateRentalStatus,
  updateVehicleConditions,
} = require("../database/queries/rentalQueries");

const {
  createNotification,
} = require("../database/queries/notificationQueries");
async function createRental(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const renterId = req.session.user.userId;
    const { licensePlate, startDate, endDate } = req.body;
    if (!validateRequiredRentalFields(req.body, res)) return;

    const vehicle = await getVehicleByLicensePlate(licensePlate);
    if (!vehicle) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "Vehicle not found" });
    }
    if (renterId === vehicle.ownerId) {
      return res
        .status(STATUS_CODE.FORBIDDEN)
        .json({ message: "You cannot rent your own vehicle" });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Start date cannot be after end date" });
    }
    if (start < new Date()) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Start date cannot be in the past" });
    }
    if (end < new Date()) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "End date cannot be in the past" });
    }
    const rentalIsAvailable = await checkIfVehicleIsAvailable(
      licensePlate,
      startDate,
      endDate,
    );

    if (rentalIsAvailable) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Vehicle is already rented" });
    }

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalPrice = days * vehicle.price;

    const insertQuery =
      "INSERT INTO rentals (renterId, licensePlate, startDate, endDate, totalPrice) VALUES (?, ?, ?, ?, ?)";

    const values = [renterId, licensePlate, startDate, endDate, totalPrice];
    const result = await doQuery(insertQuery, values);
    if (result.affectedRows === 0) {
      return res
        .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to create rental" });
    }
    const {
      createNotification,
    } = require("../database/queries/notificationQueries");

    await createNotification(
      vehicle.ownerId,
      result.insertId,
      "rental_request",
      "New Rental Request",
      `User ${renterId} requested your vehicle`,
    );
    return res
      .status(STATUS_CODE.CREATED)
      .json({ message: "Rental created successfully" });
  } catch (error) {
    next(error);
  }
}

async function getMyRentals(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const renterId = req.session.user.userId;
    const myRentals = await getMyRentalsByRenterId(renterId);
    if (myRentals.length === 0) {
      return res
        .status(STATUS_CODE.OK)
        .json({ message: "No rentals found", count: 0, myRentals: [] });
    }
    return res.status(STATUS_CODE.OK).json({
      message: "Rentals fetched successfully",
      count: myRentals.length,
      myRentals,
    });
  } catch (error) {
    next(error);
  }
}

async function getRequestsForMyVehicles(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const ownerId = req.session.user.userId;
    const requests = await getRequestsForMyVehiclesByOwnerId(ownerId);
    if (requests.length === 0) {
      return res
        .status(STATUS_CODE.OK)
        .json({ message: "No requests found", count: 0, requests: [] });
    }
    return res.status(STATUS_CODE.OK).json({
      message: "Requests fetched successfully",
      count: requests.length,
      results: requests,
    });
  } catch (error) {
    next(error);
  }
}

async function approveRental(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const ownerId = req.session.user.userId;
    const { rentalId } = req.params;
    const rental = await getRentalById(rentalId);
    if (!rental) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "Rental not found" });
    }
    if (rental.ownerId !== ownerId) {
      return res
        .status(STATUS_CODE.FORBIDDEN)
        .json({ message: "You are not the owner of this rental" });
    }
    if (rental.status !== "pending") {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Only Pending can be approved" });
    }
    const result = await updateRentalStatus(rentalId, "approved");
    if (result.affectedRows === 0) {
      return res
        .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to approve rental" });
    }
    await createNotification(
      rental.renterId,
      rentalId,
      "rental_approved",
      "Rental Approved",
      `Your rental has been approved by the owner ${ownerId}`,
    );
    return res
      .status(STATUS_CODE.OK)
      .json({ message: "Rental approved successfully" });
  } catch (error) {
    next(error);
  }
}

async function rejectRental(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const ownerId = req.session.user.userId;
    const { rentalId } = req.params;
    const rental = await getRentalById(rentalId);
    if (!rental) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "Rental not found" });
    }
    if (rental.ownerId !== ownerId) {
      return res
        .status(STATUS_CODE.FORBIDDEN)
        .json({ message: "You are not the owner of this rental" });
    }
    if (rental.status !== "pending") {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Only Pending can be rejected" });
    }
    const result = await updateRentalStatus(rentalId, "rejected");
    if (result.affectedRows === 0) {
      return res
        .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to reject rental" });
        
    }
    await createNotification(
      rental.renterId,
      rentalId,
      "rental_rejected",
      "Rental Rejected",
      `Your rental has been rejected by the owner ${ownerId}`,
    );
    return res
      .status(STATUS_CODE.OK)
      .json({ message: "Rental rejected successfully" });
  } catch (error) {
    next(error);
  }
}
async function cancelRental(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const renterId = req.session.user.userId;
    const { rentalId } = req.params;
    const rental = await getRentalById(rentalId);
    console.log("session renterId:", renterId);
    console.log("rental renterId:", rental.renterId);
    console.log("rental:", rental);
    if (!rental) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "Rental not found" });
    }
    if (rental.renterId !== renterId) {
      return res
        .status(STATUS_CODE.FORBIDDEN)
        .json({ message: "You are not the renter of this rental" });
    }
    if (rental.status !== "pending") {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Only Pending can be canceled" });
    }
    const result = await updateRentalStatus(rentalId, "cancelled");
    if (result.affectedRows === 0) {
      return res
        .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to cancel rental" });
    }
    await createNotification(
      rental.ownerId,
      rentalId,
      "rental_cancelled",
      "Rental Cancelled",
      `Your rental has been cancelled by the renter ${renterId}`,
    );
    return res
      .status(STATUS_CODE.OK)
      .json({ message: "Rental canceled successfully" });
  } catch (error) {
    next(error);
  }
}
async function updateVehicleStatus(req, res, next) {
  try {
    const { licensePlate } = req.params;
    const { status } = req.body;
    const result = await updateVehicleConditions(licensePlate, status);
    if (result.affectedRows === 0) {
      return res
        .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to update vehicle status" });
    }
    return res
      .status(STATUS_CODE.OK)
      .json({ message: "Vehicle status updated successfully" });
  } catch (error) {
    next(error);
  }
}
module.exports = {
  createRental,
  getMyRentals,
  getRequestsForMyVehicles,
  approveRental,
  rejectRental,
  cancelRental,
  updateVehicleStatus,
};
