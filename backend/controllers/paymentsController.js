const crypto = require("crypto");
const STATUS_CODE = require("../constants/statusCodes");
const { validateAuthenticatedUser } = require("../utils/validsController");

const {
  getPaymentByToken,
  markRenterConfirmationEmailSent,
  markOwnerConfirmationEmailSent,
} = require("../database/queries/paymentQueries");

const {
  getVehicleExactPickupByLicensePlate,
  isExactPickupComplete,
  insertPickupSnapshotFromVehicle,
  markPaymentPaidByTokenOnConnection,
  getPickupSnapshotByRentalId,
} = require("../database/queries/rentalPickupLocationQueries");

const { withTransaction } = require("../database/withTransaction");

const {
  createNotification,
} = require("../database/queries/notificationQueries");
const { createActivity } = require("../database/queries/activityQueries");
const {
  createSystemHistory,
} = require("../database/queries/systemHistoryQueries");

const {
  sendTestPaymentReceiptEmail,
  sendOwnerPaymentReceivedEmail,
} = require("../services/emailService");
const {
  omitPrivatePickupFields,
} = require("../utils/omitPrivatePickupFields");
const { buildMapsDirectionsUrl } = require("../utils/mapsDirections");

// Tokens are generated with crypto.randomBytes(32).toString("hex") = 64 hex
// chars (rental_payments.paymentToken is VARCHAR(128)).
const TOKEN_REGEX = /^[a-f0-9]{64}$/;

const generatePaymentToken = () => crypto.randomBytes(32).toString("hex");

const FRONTEND_URL =
  process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL
    : "http://localhost:5173";

// Shape returned to the frontend — one contract for both endpoints.
// Public city only (vehicleAddress). Exact pickup snapshot fields are attached
// only after payment when a rental_pickup_locations row exists.
const toPaymentResponse = (payment, snapshot = null) => {
  const safe = omitPrivatePickupFields(payment);
  const paid = safe.paymentStatus === "paid";
  const hasSnapshot = Boolean(
    snapshot?.pickupAddress &&
      snapshot?.pickupLatitude != null &&
      snapshot?.pickupLongitude != null,
  );
  const mapsDirectionsUrl = hasSnapshot
    ? buildMapsDirectionsUrl(
        snapshot.pickupLatitude,
        snapshot.pickupLongitude,
      )
    : null;

  return {
    paymentId: safe.paymentId,
    rentalId: safe.rentalId,
    paymentToken: safe.paymentToken,
    amount: safe.amount,
    currency: safe.currency,
    paymentStatus: safe.paymentStatus,
    paidAt: safe.paidAt,
    paymentCreatedAt: safe.paymentCreatedAt,
    rentalStatus: safe.rentalStatus,
    licensePlate: safe.licensePlate,
    startDate: safe.startDate,
    endDate: safe.endDate,
    totalPrice: safe.totalPrice,
    brandName: safe.brandName,
    modelName: safe.modelName,
    image: safe.image,
    ownerFirstName: safe.ownerFirstName,
    ownerLastName: safe.ownerLastName,
    vehicleAddress: safe.vehicleAddress || null,
    exactPickupAvailable: paid && hasSnapshot && Boolean(mapsDirectionsUrl),
    ...(paid && hasSnapshot && mapsDirectionsUrl
      ? {
          pickupAddress: snapshot.pickupAddress,
          pickupLatitude: snapshot.pickupLatitude,
          pickupLongitude: snapshot.pickupLongitude,
          pickupInstructions: snapshot.pickupInstructions || null,
          mapsDirectionsUrl,
        }
      : {}),
  };
};

async function getPayment(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;

    const { paymentToken } = req.params;
    if (!TOKEN_REGEX.test(paymentToken)) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Invalid payment link" });
    }

    const payment = await getPaymentByToken(paymentToken);
    if (!payment) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "Payment not found" });
    }

    const sessionUser = req.session.user;
    if (
      payment.renterId !== sessionUser.userId &&
      sessionUser.role !== "admin"
    ) {
      return res
        .status(STATUS_CODE.FORBIDDEN)
        .json({ message: "You are not the requester of this rental" });
    }

    let snapshot = null;
    if (payment.paymentStatus === "paid") {
      snapshot = await getPickupSnapshotByRentalId(payment.rentalId);
    }

    return res.status(STATUS_CODE.OK).json({
      message: "Payment fetched successfully",
      payment: toPaymentResponse(payment, snapshot),
    });
  } catch (error) {
    next(error);
  }
}

async function completeTestPayment(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;

    const { paymentToken } = req.params;
    if (!TOKEN_REGEX.test(paymentToken)) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Invalid payment link" });
    }

    const payment = await getPaymentByToken(paymentToken);
    if (!payment) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "Payment not found" });
    }

    const sessionUser = req.session.user;
    if (payment.renterId !== sessionUser.userId) {
      return res
        .status(STATUS_CODE.FORBIDDEN)
        .json({ message: "You are not the requester of this rental" });
    }

    if (payment.paymentStatus === "paid") {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "This Test payment was already completed" });
    }

    if (payment.paymentStatus !== "pending") {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: `This Test payment can no longer be completed (status: ${payment.paymentStatus})`,
      });
    }

    if (payment.rentalStatus !== "approved") {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: `This rental is no longer approved (status: ${payment.rentalStatus})`,
      });
    }

    // Pre-payment: exact pickup must exist on the live vehicle (DB only).
    const vehiclePickup = await getVehicleExactPickupByLicensePlate(
      payment.licensePlate,
    );
    if (!isExactPickupComplete(vehiclePickup)) {
      console.error(
        `Payment blocked: missing exact pickup for rentalId=${payment.rentalId} plate=${payment.licensePlate}`,
      );
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message:
          "Pickup location must be completed by the vehicle owner before payment can be confirmed.",
      });
    }

    // Atomic: pending → paid + one immutable snapshot. Emails only after COMMIT.
    let transitionSucceeded = false;
    try {
      await withTransaction(async (connection) => {
        const payResult = await markPaymentPaidByTokenOnConnection(
          connection,
          paymentToken,
        );

        if (payResult.affectedRows !== 1) {
          const err = new Error("Payment was already completed");
          err.code = "PAYMENT_ALREADY_PAID";
          throw err;
        }

        await insertPickupSnapshotFromVehicle(connection, payment.rentalId);
        transitionSucceeded = true;
      });
    } catch (txError) {
      if (txError.code === "PAYMENT_ALREADY_PAID") {
        return res
          .status(STATUS_CODE.BAD_REQUEST)
          .json({ message: "This Test payment was already completed" });
      }
      if (
        txError.code === "PICKUP_SNAPSHOT_INSERT_FAILED" ||
        txError.code === "PICKUP_SNAPSHOT_COUNT_INVALID"
      ) {
        console.error("Pickup snapshot transaction failed:", txError.message);
        return res.status(STATUS_CODE.BAD_REQUEST).json({
          message:
            "Pickup location must be completed by the vehicle owner before payment can be confirmed.",
        });
      }
      throw txError;
    }

    if (!transitionSucceeded) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "This Test payment was already completed" });
    }

    const renterFullName = `${payment.renterFirstName} ${payment.renterLastName}`;
    const vehicleName = `${payment.brandName} ${payment.modelName}`;

    await createNotification(
      payment.ownerId,
      payment.rentalId,
      "payment_received",
      "Test Payment Received",
      `${renterFullName} completed the Test payment for your ${vehicleName} (plate ${payment.licensePlate})`,
    );

    await createActivity(
      payment.renterId,
      "Completed a test payment",
      `Test payment completed for vehicle with license plate of ${payment.licensePlate}`,
      payment.rentalId,
    );

    await createSystemHistory(
      payment.renterId,
      "rental",
      "update",
      "payment_completed",
      "rental",
      String(payment.rentalId),
      payment.rentalId,
      payment.licensePlate,
      `Test payment completed for rental of vehicle with license plate of ${payment.licensePlate}`,
    );

    const updatedPayment = await getPaymentByToken(paymentToken);
    const snapshot = await getPickupSnapshotByRentalId(payment.rentalId);

    try {
      await sendTestPaymentReceiptEmail({
        to: payment.renterEmail,
        paymentId: payment.paymentId,
        renterFirstName: payment.renterFirstName,
        renterLastName: payment.renterLastName,
        ownerFirstName: payment.ownerFirstName,
        ownerLastName: payment.ownerLastName,
        brandName: payment.brandName,
        modelName: payment.modelName,
        licensePlate: payment.licensePlate,
        pickupAddress: snapshot?.pickupAddress || null,
        pickupLatitude: snapshot?.pickupLatitude ?? null,
        pickupLongitude: snapshot?.pickupLongitude ?? null,
        pickupInstructions: snapshot?.pickupInstructions || null,
        startDate: payment.startDate,
        endDate: payment.endDate,
        amount: payment.amount,
        currency: payment.currency,
        rentalId: payment.rentalId,
        paidAt: updatedPayment.paidAt,
        rentalUrl: `${FRONTEND_URL || "http://localhost:5173"}/rentalDashboard`,
      });
      await markRenterConfirmationEmailSent(payment.paymentId);
    } catch (emailError) {
      console.error("Failed to send payment receipt email:", emailError);
    }

    try {
      await sendOwnerPaymentReceivedEmail({
        to: payment.ownerEmail,
        ownerFirstName: payment.ownerFirstName,
        ownerLastName: payment.ownerLastName,
        renterFirstName: payment.renterFirstName,
        renterLastName: payment.renterLastName,
        brandName: payment.brandName,
        modelName: payment.modelName,
        licensePlate: payment.licensePlate,
        startDate: payment.startDate,
        endDate: payment.endDate,
        amount: payment.amount,
        currency: payment.currency,
        rentalId: payment.rentalId,
        rentalUrl: `${FRONTEND_URL || "http://localhost:5173"}/rentalDashboard`,
      });
      await markOwnerConfirmationEmailSent(payment.paymentId);
    } catch (emailError) {
      console.error("Failed to send owner payment email:", emailError);
    }

    return res.status(STATUS_CODE.OK).json({
      message: "Test payment completed successfully",
      payment: toPaymentResponse(updatedPayment, snapshot),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  generatePaymentToken,
  getPayment,
  completeTestPayment,
};
