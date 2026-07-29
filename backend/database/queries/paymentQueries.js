const doQuery = require("../query");

// Shared projection for the test-payment flow. Aliases follow the project
// contract: p.status AS paymentStatus / r.status AS rentalStatus so the two
// statuses never collide, and renter/owner are separate users joins so the
// requester is never confused with the vehicle owner.
const PAYMENT_SELECT = `
  SELECT
    p.paymentId,
    p.rentalId,
    p.paymentToken,
    p.amount,
    p.currency,
    p.status AS paymentStatus,
    p.paidAt,
    p.createdAt AS paymentCreatedAt,
    r.renterId,
    r.licensePlate,
    r.startDate,
    r.endDate,
    r.totalPrice,
    r.status AS rentalStatus,
    v.ownerId,
    v.image,
    v.address AS vehicleAddress,
    cb.brandName,
    cm.modelName,
    renter.firstName AS renterFirstName,
    renter.lastName AS renterLastName,
    renter.email AS renterEmail,
    owner.firstName AS ownerFirstName,
    owner.lastName AS ownerLastName,
    owner.email AS ownerEmail
  FROM rental_payments p
  JOIN rentals r ON p.rentalId = r.rentalId
  JOIN vehicles v ON r.licensePlate = v.licensePlate
  JOIN carmodels cm ON v.modelId = cm.modelId
  JOIN carbrands cb ON cm.brandId = cb.brandId
  JOIN users renter ON r.renterId = renter.userId
  JOIN users owner ON v.ownerId = owner.userId
`;

// amount is a snapshot of rentals.totalPrice at approval time.
// currency and status use the table defaults ('USD', 'pending').
async function createRentalPayment(rentalId, paymentToken, amount) {
  const query = `
    INSERT INTO rental_payments (rentalId, paymentToken, amount)
    VALUES (?, ?, ?)
  `;
  return doQuery(query, [rentalId, paymentToken, amount]);
}

async function getPaymentByToken(paymentToken) {
  const query = `${PAYMENT_SELECT} WHERE p.paymentToken = ?`;
  const result = await doQuery(query, [paymentToken]);
  return result[0];
}

async function getPaymentByRentalId(rentalId) {
  const query = `${PAYMENT_SELECT} WHERE p.rentalId = ?`;
  const result = await doQuery(query, [rentalId]);
  return result[0];
}

// status guard makes the update idempotent: a second pay attempt matches
// zero rows instead of overwriting paidAt.
async function markPaymentPaidByToken(paymentToken) {
  const query = `
    UPDATE rental_payments
    SET status = 'paid', paidAt = NOW()
    WHERE paymentToken = ? AND status = 'pending'
  `;
  return doQuery(query, [paymentToken]);
}

async function markPaymentLinkEmailSent(paymentId) {
  const query = `
    UPDATE rental_payments
    SET paymentLinkEmailSentAt = NOW()
    WHERE paymentId = ?
  `;
  return doQuery(query, [paymentId]);
}

async function markRenterConfirmationEmailSent(paymentId) {
  const query = `
    UPDATE rental_payments
    SET renterConfirmationEmailSentAt = NOW()
    WHERE paymentId = ?
  `;
  return doQuery(query, [paymentId]);
}

async function markOwnerConfirmationEmailSent(paymentId) {
  const query = `
    UPDATE rental_payments
    SET ownerConfirmationEmailSentAt = NOW()
    WHERE paymentId = ?
  `;
  return doQuery(query, [paymentId]);
}

module.exports = {
  createRentalPayment,
  getPaymentByToken,
  getPaymentByRentalId,
  markPaymentPaidByToken,
  markPaymentLinkEmailSent,
  markRenterConfirmationEmailSent,
  markOwnerConfirmationEmailSent,
};
