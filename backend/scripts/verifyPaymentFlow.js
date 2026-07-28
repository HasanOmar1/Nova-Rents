// Section L verification: exercises the real payment query layer against the
// live DB with a temporary rental, then cleans up. Read-only for real data.
const crypto = require("crypto");
const doQuery = require("../database/query");
const {
  createRentalPayment,
  getPaymentByRentalId,
  getPaymentByToken,
  markPaymentPaidByToken,
} = require("../database/queries/paymentQueries");
const {
  getMyTripsHistoryByRenterId,
} = require("../database/queries/rentalQueries");

const assert = (cond, label) => {
  console.log(`${cond ? "PASS" : "FAIL"} - ${label}`);
  if (!cond) process.exitCode = 1;
};

(async () => {
  // Pick a real vehicle and a user who is not its owner.
  const [vehicle] = await doQuery(
    "SELECT licensePlate, ownerId, price FROM vehicles LIMIT 1",
  );
  const [renter] = await doQuery(
    "SELECT userId FROM users WHERE userId != ? AND role = 'user' LIMIT 1",
    [vehicle.ownerId],
  );

  // 1. Rental request creates exactly one rentals row.
  const insert = await doQuery(
    `INSERT INTO rentals (renterId, licensePlate, startDate, endDate, totalPrice, status)
     VALUES (?, ?, '2030-01-01', '2030-01-03', 199.50, 'approved')`,
    [renter.userId, vehicle.licensePlate],
  );
  const rentalId = insert.insertId;
  assert(insert.affectedRows === 1, "exactly one rentals row created");

  try {
    // 2+3. One payment row for that rental, snapshotting totalPrice.
    const token = crypto.randomBytes(32).toString("hex");
    await createRentalPayment(rentalId, token, 199.5);
    const [countRow] = await doQuery(
      "SELECT COUNT(*) AS n FROM rental_payments WHERE rentalId = ?",
      [rentalId],
    );
    assert(countRow.n === 1, "exactly one payment row exists for the rental");

    // 4. amount equals authoritative rentals.totalPrice.
    const payment = await getPaymentByRentalId(rentalId);
    assert(
      Number(payment.amount) === Number(payment.totalPrice),
      `payment amount (${payment.amount}) equals rentals.totalPrice (${payment.totalPrice})`,
    );

    // 5. renterId and ownerId resolved through the joins.
    assert(
      payment.renterId === renter.userId,
      "renterId resolved to the requester",
    );
    assert(
      payment.ownerId === vehicle.ownerId,
      "ownerId resolved to the vehicle owner",
    );
    assert(
      payment.renterId !== payment.ownerId,
      "requester and vehicle owner are different users",
    );

    // 6+9. Contract field names present (no undefined from spelling mismatch).
    const contractFields = [
      "paymentId",
      "rentalId",
      "paymentToken",
      "amount",
      "currency",
      "paymentStatus",
      "rentalStatus",
      "licensePlate",
      "startDate",
      "endDate",
      "totalPrice",
      "brandName",
      "modelName",
      "renterFirstName",
      "renterLastName",
      "renterEmail",
      "ownerFirstName",
      "ownerLastName",
      "ownerEmail",
    ];
    const missing = contractFields.filter((f) => payment[f] === undefined);
    assert(
      missing.length === 0,
      `all contract fields defined${missing.length ? ` (missing: ${missing.join(", ")})` : ""}`,
    );
    assert(payment.paymentStatus === "pending", "initial paymentStatus is 'pending'");
    assert(payment.currency === "USD", "currency uses table default 'USD'");
    assert(payment.rentalStatus === "approved", "rentalStatus aliased correctly");

    // 7. Enum accepted, paidAt set; idempotency (second pay = 0 rows).
    const paid = await markPaymentPaidByToken(token);
    assert(paid.affectedRows === 1, "markPaymentPaidByToken updates one row");
    const paidAgain = await markPaymentPaidByToken(token);
    assert(paidAgain.affectedRows === 0, "second pay attempt is a no-op");
    const afterPay = await getPaymentByToken(token);
    assert(afterPay.paymentStatus === "paid", "status is exactly 'paid' (not truncated)");
    assert(afterPay.paidAt !== null, "paidAt was set");

    // 8. LEFT JOIN adds no duplicate rows in trips history.
    const trips = await getMyTripsHistoryByRenterId(renter.userId);
    const rows = trips.filter((t) => t.rentalId === rentalId);
    assert(rows.length === 1, "trips history has exactly one row for the rental");
    assert(rows[0].paymentToken === token, "trips row exposes paymentToken");
    assert(rows[0].paymentStatus === "paid", "trips row exposes paymentStatus");
  } finally {
    // Cleanup: payment first (FK RESTRICT), then the rental.
    await doQuery("DELETE FROM rental_payments WHERE rentalId = ?", [rentalId]);
    await doQuery("DELETE FROM rentals WHERE rentalId = ?", [rentalId]);
    console.log("cleanup done (test rental + payment removed)");
  }

  process.exit();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
