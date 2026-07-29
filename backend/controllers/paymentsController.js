const crypto = require("crypto");
const STATUS_CODE = require("../constants/statusCodes");
const { validateAuthenticatedUser } = require("../utils/validsController");

const {
  getPaymentByToken,
  markPaymentPaidByToken,
  markRenterConfirmationEmailSent,
  markOwnerConfirmationEmailSent,
} = require("../database/queries/paymentQueries");

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

// Tokens are generated with crypto.randomBytes(32).toString("hex") = 64 hex
// chars (rental_payments.paymentToken is VARCHAR(128)).
const TOKEN_REGEX = /^[a-f0-9]{64}$/;

const generatePaymentToken = () => crypto.randomBytes(32).toString("hex");

const FRONTEND_URL =
  process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL
    : "http://localhost:5173";

// Shape returned to the frontend — one contract for both endpoints.
const toPaymentResponse = (payment) => ({
  paymentId: payment.paymentId,
  rentalId: payment.rentalId,
  paymentToken: payment.paymentToken,
  amount: payment.amount,
  currency: payment.currency,
  paymentStatus: payment.paymentStatus,
  paidAt: payment.paidAt,
  paymentCreatedAt: payment.paymentCreatedAt,
  rentalStatus: payment.rentalStatus,
  licensePlate: payment.licensePlate,
  startDate: payment.startDate,
  endDate: payment.endDate,
  totalPrice: payment.totalPrice,
  brandName: payment.brandName,
  modelName: payment.modelName,
  image: payment.image,
  ownerFirstName: payment.ownerFirstName,
  ownerLastName: payment.ownerLastName,
});

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

    return res.status(STATUS_CODE.OK).json({
      message: "Payment fetched successfully",
      payment: toPaymentResponse(payment),
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

    const result = await markPaymentPaidByToken(paymentToken);
    if (result.affectedRows === 0) {
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
        vehicleAddress: payment.vehicleAddress,
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
      payment: toPaymentResponse(updatedPayment),
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
