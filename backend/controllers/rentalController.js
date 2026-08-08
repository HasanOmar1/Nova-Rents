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
  getBookedDatesByPlate,
  getRentalsToComplete,
  getRentalsToExpire,
  completeExpiredRentals,
  cancelExpiredRentals,
  getMonthlyEarningsByOwnerId,
  getPendingRequestsCountByOwnerId,
  getUpcomingTripsCountByUserId,
  getPastTripsCountByRenterId,
  getDashboardChartDataByUserId,
  getPendingRentalRequestsForOwner,
  getMyTripsHistoryByRenterId,
  getRentalEmailDataByRentalId,
} = require("../database/queries/rentalQueries");

const {
  createNotification,
} = require("../database/queries/notificationQueries");
const { createActivity } = require("../database/queries/activityQueries");
const {
  createSystemHistory,
} = require("../database/queries/systemHistoryQueries");
const {
  createRentalPayment,
  getPaymentByRentalId,
  markPaymentLinkEmailSent,
} = require("../database/queries/paymentQueries");
const { generatePaymentToken } = require("./paymentsController");
const {
  sendTestPaymentRequestEmail,
  sendRentalRequestEmail,
  sendRentalRejectedEmail,
} = require("../services/emailService");
const { buildMapsDirectionsUrl } = require("../utils/mapsDirections");

const FRONTEND_URL =
  process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL
    : "http://localhost:5173";

// Paid trips may expose immutable rental_pickup_locations fields only.
// Never COALESCE with live vehicles.exactPickup* / lat / lng.
const toMyTripResponse = (trip) => {
  const {
    snapshotPickupAddress,
    snapshotPickupLatitude,
    snapshotPickupLongitude,
    snapshotPickupInstructions,
    ...safeTrip
  } = trip;

  const paid = safeTrip.paymentStatus === "paid";
  const mapsDirectionsUrl = buildMapsDirectionsUrl(
    snapshotPickupLatitude,
    snapshotPickupLongitude,
  );
  const hasSnapshot = Boolean(snapshotPickupAddress && mapsDirectionsUrl);

  if (paid && hasSnapshot) {
    return {
      ...safeTrip,
      exactPickupAvailable: true,
      pickupAddress: snapshotPickupAddress,
      pickupLatitude: snapshotPickupLatitude,
      pickupLongitude: snapshotPickupLongitude,
      pickupInstructions: snapshotPickupInstructions || null,
      mapsDirectionsUrl,
    };
  }

  return {
    ...safeTrip,
    exactPickupAvailable: false,
  };
};

async function createRental(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const renterId = req.session.user.userId;
    const renterFullName =
      req.session.user.firstName + " " + req.session.user.lastName;
    const { licensePlate, startDate, endDate } = req.body;
    if (!validateRequiredRentalFields(req.body, res)) return;

    const vehicle = await getVehicleByLicensePlate(licensePlate);
    if (!vehicle)
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "Vehicle not found" });

    if (renterId === vehicle.ownerId)
      return res
        .status(STATUS_CODE.FORBIDDEN)
        .json({ message: "You cannot rent your own vehicle" });

    if (vehicle.status === "inactive") {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "This vehicle is inactive and cannot be rented",
      });
    }

    if (vehicle.status === "maintenance") {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "This vehicle is currently under maintenance",
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    if (start >= end)
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Start date must be before end date" });
    if (start <= todayMidnight)
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Start date must be tomorrow or later" });

    const hasDateCollision = await checkIfVehicleIsAvailable(
      licensePlate,
      startDate,
      endDate,
    );

    if (hasDateCollision) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Vehicle is already booked for these dates" });
    }

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalPrice = days * vehicle.price;

    const insertQuery =
      "INSERT INTO rentals (renterId, licensePlate, startDate, endDate, totalPrice) VALUES (?, ?, ?, ?, ?)";
    const values = [renterId, licensePlate, startDate, endDate, totalPrice];
    const result = await doQuery(insertQuery, values);

    if (result.affectedRows === 0)
      return res
        .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to create rental" });

    await createNotification(
      vehicle.ownerId,
      result.insertId,
      "rental_request",
      "New Rental Request",
      `User ${renterFullName} requested your vehicle with license plate of ${licensePlate}`,
    );

    await createActivity(
      renterId,
      "Rented a vehicle",
      `Rental created for vehicle with license plate of ${licensePlate}`,
      result.insertId,
    );
    await createSystemHistory(
      renterId,
      "rental",
      "create",
      "rental_requested",
      "rental",
      String(result.insertId),
      result.insertId,
      licensePlate,
      `Rental requested for vehicle with license plate of ${licensePlate}`,
    );

    // Email the vehicle owner. Owner is resolved from the DB (never from the
    // request body); a delivery failure must not undo the created rental.
    let emailSent = false;
    try {
      const emailData = await getRentalEmailDataByRentalId(result.insertId);
      await sendRentalRequestEmail({
        to: emailData.ownerEmail,
        ownerFirstName: emailData.ownerFirstName,
        ownerLastName: emailData.ownerLastName,
        renterFirstName: emailData.renterFirstName,
        renterLastName: emailData.renterLastName,
        renterEmail: emailData.renterEmail,
        renterPhone: emailData.renterPhone,
        brandName: emailData.brandName,
        modelName: emailData.modelName,
        licensePlate: emailData.licensePlate,
        startDate: emailData.startDate,
        endDate: emailData.endDate,
        totalPrice: emailData.totalPrice,
        currency: "USD",
        rentalId: emailData.rentalId,
        requestsUrl: `${FRONTEND_URL}/rentalDashboard`,
      });
      emailSent = true;
    } catch (emailError) {
      console.error("Rental request email failed:", emailError.message);
    }

    return res.status(STATUS_CODE.CREATED).json({
      message: "Rental created successfully",
      rentalId: result.insertId,
      emailSent,
    });
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

async function getBookedDates(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const { licensePlate } = req.params;
    const bookedDates = await getBookedDatesByPlate(licensePlate);
    if (bookedDates.length === 0) {
      return res
        .status(STATUS_CODE.OK)
        .json({ message: "No booked dates found", bookedDates: [] });
    }
    return res.status(STATUS_CODE.OK).json({ bookedDates });
  } catch (error) {
    next(error);
  }
}

async function approveRental(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const ownerId = req.session.user.userId;
    const ownerName =
      req.session.user.firstName + " " + req.session.user.lastName;

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
      `Your rental has been approved by the owner ${ownerName}`,
    );
    await createActivity(
      rental.renterId,
      "Approved a rental",
      `Rental approved for vehicle with license plate of ${rental.licensePlate}`,
      rentalId,
    );
    await createSystemHistory(
      ownerId,
      "rental",
      "approve",
      "rental_approved",
      "rental",
      String(rentalId),
      rentalId,
      rental.licensePlate,
      `Rental approved for vehicle with license plate of ${rental.licensePlate}`,
    );

    // Test payment: snapshot rentals.totalPrice, notify the requester, and
    // email them the secure payment link.
    const paymentToken = generatePaymentToken();
    await createRentalPayment(rentalId, paymentToken, rental.totalPrice);
    const payment = await getPaymentByRentalId(rentalId);

    await createNotification(
      rental.renterId,
      rentalId,
      "payment_request",
      "Test Payment Required",
      `Complete the Test payment for your ${payment.brandName} ${payment.modelName} rental to confirm your booking`,
    );

    try {
      await sendTestPaymentRequestEmail({
        to: payment.renterEmail,
        renterFirstName: payment.renterFirstName,
        renterLastName: payment.renterLastName,
        ownerFirstName: payment.ownerFirstName,
        ownerLastName: payment.ownerLastName,
        brandName: payment.brandName,
        modelName: payment.modelName,
        licensePlate: payment.licensePlate,
        vehicleAddress: payment.vehicleAddress,
        startDate: payment.startDate,
        endDate: payment.endDate,
        amount: payment.amount,
        currency: payment.currency,
        rentalId: payment.rentalId,
        paymentUrl: `${FRONTEND_URL}/payments/${paymentToken}`,
      });
      await markPaymentLinkEmailSent(payment.paymentId);
    } catch (emailError) {
      console.error("Failed to send payment request email:", emailError);
    }

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
    const ownerName =
      req.session.user.firstName + " " + req.session.user.lastName;

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
      `Your rental has been rejected by the owner ${ownerName}`,
    );
    await createActivity(
      rental.renterId,
      "Rejected a rental",
      `Rental rejected for vehicle with license plate of ${rental.licensePlate}`,
      rentalId,
    );
    await createSystemHistory(
      ownerId,
      "rental",
      "reject",
      "rental_rejected",
      "rental",
      String(rentalId),
      rentalId,
      rental.licensePlate,
      `Rental rejected for vehicle with license plate of ${rental.licensePlate}`,
    );

    try {
      const emailData = await getRentalEmailDataByRentalId(rentalId);
      await sendRentalRejectedEmail({
        to: emailData.renterEmail,
        renterFirstName: emailData.renterFirstName,
        renterLastName: emailData.renterLastName,
        ownerFirstName: emailData.ownerFirstName,
        ownerLastName: emailData.ownerLastName,
        brandName: emailData.brandName,
        modelName: emailData.modelName,
        licensePlate: emailData.licensePlate,
        startDate: emailData.startDate,
        endDate: emailData.endDate,
        rentalId: emailData.rentalId,
        browseUrl: `${FRONTEND_URL}/vehicles`,
      });
    } catch (emailError) {
      console.error("Rental rejection email failed:", emailError.message);
    }

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
    const ownerName =
      req.session.user.firstName + " " + req.session.user.lastName;

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
      `Your rental has been cancelled by the renter ${ownerName}`,
    );
    await createActivity(
      rental.renterId,
      "Cancelled a rental",
      `Rental cancelled for vehicle with license plate of${rental.licensePlate}`,
      rentalId,
    );
    await createSystemHistory(
      renterId,
      "rental",
      "cancel",
      "rental_cancelled",
      "rental",
      String(rentalId),
      rentalId,
      rental.licensePlate,
      `Rental cancelled for vehicle with license plate of ${rental.licensePlate}`,
    );
    return res
      .status(STATUS_CODE.OK)
      .json({ message: "Rental canceled successfully" });
  } catch (error) {
    next(error);
  }
}

async function autoUpdateRentalStatuses() {
  // 1. If approved and endDate has passed -> change to 'completed'
  const rentalsToComplete = await getRentalsToComplete();
  await completeExpiredRentals();
  for (const rental of rentalsToComplete) {
    await createSystemHistory(
      null,
      "system",
      "complete",
      "rental_completed",
      "rental",
      String(rental.rentalId),
      rental.rentalId,
      rental.licensePlate,
      `Rental completed for vehicle with license plate of ${rental.licensePlate}`,
    );
  }

  // 2. If still pending and startDate has passed -> change to 'cancelled'
  const rentalsToExpire = await getRentalsToExpire();
  await cancelExpiredRentals();
  for (const rental of rentalsToExpire) {
    await createSystemHistory(
      null,
      "system",
      "cancel",
      "rental_expired",
      "rental",
      String(rental.rentalId),
      rental.rentalId,
      rental.licensePlate,
      `Rental request expired for vehicle with license plate of ${rental.licensePlate}`,
    );
  }
}

async function getDashboardMetrics(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;

    const userId = req.session.user.userId;

    await autoUpdateRentalStatuses();

    // 1. Monthly Earnings (As a Host: SUM of your cars' approved rentals this month)
    const earnings = await getMonthlyEarningsByOwnerId(userId);

    // 2. Pending Requests (As a Host: Count of pending requests on your cars)
    const pending = await getPendingRequestsCountByOwnerId(userId);

    // 3. Upcoming Trips (As Host OR Renter: Approved trips starting today or later)
    const upcoming = await getUpcomingTripsCountByUserId(userId);

    // 4. Trips Taken (As a Renter: Completed or past approved trips you took)
    const pastTrips = await getPastTripsCountByRenterId(userId);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const chartData = [];
    const today = new Date();

    //  empty array of the last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      chartData.push({
        month: monthNames[d.getMonth()],
        monthIndex: d.getMonth() + 1,
        year: d.getFullYear(),
        earnings: 0, // Default to $0
        trips: 0, // Default to 0 trips
      });
    }

    // Fetch Earnings & Trips Grouped by Month for the last 6 months
    const chartDbData = await getDashboardChartDataByUserId(userId);

    // Merge database results into our 6-month array
    chartDbData.forEach((row) => {
      const monthObj = chartData.find(
        (m) => m.monthIndex === row.monthIndex && m.year === row.year,
      );
      if (monthObj) {
        monthObj.earnings = Number(row.totalEarnings) || 0;
        monthObj.trips = Number(row.totalTrips) || 0;
      }
    });

    res.status(200).json({
      monthlyEarnings: Number(earnings[0].total),
      pendingRequests: Number(pending[0].count),
      upcomingTrips: Number(upcoming[0].count),
      tripsTaken: Number(pastTrips[0].count),
      chartData: chartData,
    });
  } catch (error) {
    next(error);
  }
}

const getRentalHistory = async (req, res, next) => {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const userId = req.session.user.userId;

    await autoUpdateRentalStatuses();

    const pendingRequests = await getPendingRentalRequestsForOwner(userId);

    const myTrips = (await getMyTripsHistoryByRenterId(userId)).map(
      toMyTripResponse,
    );

    return res.status(STATUS_CODE.OK).json({
      message: "Rental history fetched successfully",
      count: pendingRequests.length + myTrips.length,
      pendingRequests,
      myTrips,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRental,
  getMyRentals,
  getRequestsForMyVehicles,
  approveRental,
  rejectRental,
  cancelRental,
  getBookedDates,
  getDashboardMetrics,
  getRentalHistory,
};
