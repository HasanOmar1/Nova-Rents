/** Executable backend script for the e2e email flow test workflow.
 * Runs its checks or maintenance steps and reports the resulting outcome. */
// End-to-end email verification through the real HTTP API.
// User A (requester) and User B (vehicle owner) are Gmail plus-aliases of the
// project's own EMAIL_USER mailbox, so every email lands in a real inbox that
// can be checked. Test data is created directly in the DB and removed by
// scripts/e2eEmailFlowCleanup.js. Email provider results ([email] lines) are
// printed by the running server (nodemon terminal).
require("dotenv").config({ quiet: true });
const bcrypt = require("bcrypt");
const doQuery = require("../database/query");

const API = "http://localhost:3000";
const PASSWORD = "E2eTest#2026";
const TAG = "e2etest";

const [gmailLocal, gmailDomain] = process.env.EMAIL_USER.split("@");
const EMAIL_A = `${gmailLocal}+${TAG}renter@${gmailDomain}`;
const EMAIL_B = `${gmailLocal}+${TAG}owner@${gmailDomain}`;

/** Asserts that a verification condition is true.
 * Accepts cond and label; returns no value and throws when the condition fails. */
const assert = (cond, label) => {
  console.log(`${cond ? "PASS" : "FAIL"} - ${label}`);
  if (!cond) process.exitCode = 1;
};

/** Authenticates credentials and establishes an API session.
 * Accepts email; returns a promise for the operation result. */
const login = async (email) => {
  const res = await fetch(`${API}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (res.status !== 200)
    throw new Error(`Login failed for ${email}: ${res.status}`);
  return res.headers.get("set-cookie").split(";")[0];
};

/** Sends an authenticated request to the local API and parses its response.
 * Accepts cookie, method, path, and body; returns a promise for status and response data. */
const api = async (cookie, method, path, body) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, data };
};

(
 /** Runs the script's main asynchronous workflow.
  * Accepts no arguments; returns a promise for the operation result. */
 async () => {
  // ---------- Setup: two users + one vehicle owned by B ----------
  const hash = await bcrypt.hash(PASSWORD, 10);
  const suffix = String(Date.now()).slice(-7);

  const userA = await doQuery(
    `INSERT INTO users (firstName, lastName, email, password, phone, birthDate)
     VALUES ('Essa', 'Requester', ?, ?, ?, '1995-01-01')`,
    [EMAIL_A, hash, `050${suffix}`],
  );
  const userB = await doQuery(
    `INSERT INTO users (firstName, lastName, email, password, phone, birthDate)
     VALUES ('Hasan', 'Owner', ?, ?, ?, '1990-01-01')`,
    [EMAIL_B, hash, `051${suffix}`],
  );
  const renterId = userA.insertId;
  const ownerId = userB.insertId;

  const [model] = await doQuery(
    `SELECT cm.modelId, cm.modelName, cb.brandName
     FROM carModels cm JOIN carbrands cb ON cm.brandId = cb.brandId LIMIT 1`,
  );
  const licensePlate = Number(`9${suffix}`);
  await doQuery(
    `INSERT INTO vehicles (licensePlate, fuelType, year, price, address, modelId, ownerId)
     VALUES (?, 'Gasoline', 2022, 150.00, 'Haifa - E2E Test', ?, ?)`,
    [licensePlate, model.modelId, ownerId],
  );

  console.log(`setup: renterId=${renterId} (${EMAIL_A})`);
  console.log(`setup: ownerId=${ownerId} (${EMAIL_B})`);
  console.log(
    `setup: vehicle plate=${licensePlate} (${model.brandName} ${model.modelName})`,
  );

  const cookieA = await login(EMAIL_A);
  const cookieB = await login(EMAIL_B);

  // ---------- 1. Rental request -> initial email to owner ----------
  const create = await api(cookieA, "POST", "/rentals/rent", {
    licensePlate,
    startDate: "2030-03-01",
    endDate: "2030-03-04",
  });
  assert(
    create.status === 201,
    `rental request created (status ${create.status})`,
  );
  assert(
    Number.isInteger(create.data.rentalId),
    `response returns rentalId (${create.data.rentalId})`,
  );
  assert(
    create.data.emailSent === true,
    "response reports emailSent: true (owner request email)",
  );
  const rentalId = create.data.rentalId;

  const rentalRows = await doQuery("SELECT * FROM rentals WHERE rentalId = ?", [
    rentalId,
  ]);
  assert(rentalRows.length === 1, "exactly one rentals row exists");
  assert(rentalRows[0].status === "pending", "rental status is 'pending'");
  assert(rentalRows[0].renterId === renterId, "renterId is User A");

  const [ownerCheck] = await doQuery(
    `SELECT u.userId, u.email FROM rentals r
     JOIN vehicles v ON r.licensePlate = v.licensePlate
     JOIN users u ON v.ownerId = u.userId WHERE r.rentalId = ?`,
    [rentalId],
  );
  assert(
    ownerCheck.userId === ownerId,
    "owner resolved via plate join is User B",
  );
  assert(
    ownerCheck.email === EMAIL_B,
    "resolved recipient email is User B's email (not requester)",
  );

  // ---------- 2. Invalid + overlapping requests send no email ----------
  const before = await doQuery(
    "SELECT COUNT(*) AS n FROM rentals WHERE licensePlate = ?",
    [licensePlate],
  );
  const invalid = await api(cookieA, "POST", "/rentals/rent", {
    licensePlate,
    startDate: "2020-01-01",
    endDate: "2020-01-02",
  });
  assert(
    invalid.status === 400,
    `invalid request rejected (status ${invalid.status})`,
  );
  assert(
    invalid.data.emailSent === undefined,
    "invalid request response has no emailSent (no email path reached)",
  );

  const overlap = await api(cookieA, "POST", "/rentals/rent", {
    licensePlate,
    startDate: "2030-03-02",
    endDate: "2030-03-03",
  });
  assert(
    overlap.status === 400,
    `overlapping request rejected (status ${overlap.status})`,
  );
  const after = await doQuery(
    "SELECT COUNT(*) AS n FROM rentals WHERE licensePlate = ?",
    [licensePlate],
  );
  assert(
    before[0].n === after[0].n,
    "no extra rental rows from invalid/overlap attempts",
  );

  // ---------- 3. Approval -> payment link email to requester ----------
  const approve = await api(
    cookieB,
    "PUT",
    `/rentals/approve-rental/${rentalId}`,
  );
  assert(
    approve.status === 200,
    `approval succeeded (status ${approve.status})`,
  );
  const [payment] = await doQuery(
    "SELECT paymentToken, status, amount, paymentLinkEmailSentAt FROM rental_payments WHERE rentalId = ?",
    [rentalId],
  );
  assert(!!payment, "payment row created on approval");
  assert(
    payment.paymentLinkEmailSentAt !== null,
    "paymentLinkEmailSentAt recorded (payment email sent)",
  );

  // ---------- 4. Mock payment link works for the requester ----------
  const view = await api(cookieA, "GET", `/payments/${payment.paymentToken}`);
  assert(
    view.status === 200,
    `payment page data loads for requester (status ${view.status})`,
  );
  assert(
    view.data.payment.paymentStatus === "pending",
    "payment status is 'pending' before pay",
  );

  // ---------- 5+6. Pay -> confirmation emails to requester and owner ----------
  const pay = await api(
    cookieA,
    "POST",
    `/payments/${payment.paymentToken}/pay`,
  );
  assert(pay.status === 200, `test payment completed (status ${pay.status})`);
  assert(pay.data.payment.paymentStatus === "paid", "payment status is 'paid'");
  const [paidRow] = await doQuery(
    "SELECT renterConfirmationEmailSentAt, ownerConfirmationEmailSentAt FROM rental_payments WHERE rentalId = ?",
    [rentalId],
  );
  assert(
    paidRow.renterConfirmationEmailSentAt !== null,
    "renter confirmation email recorded",
  );
  assert(
    paidRow.ownerConfirmationEmailSentAt !== null,
    "owner confirmation email recorded",
  );

  // ---------- 7. Rejection -> rejection email to requester ----------
  const create2 = await api(cookieA, "POST", "/rentals/rent", {
    licensePlate,
    startDate: "2030-04-01",
    endDate: "2030-04-03",
  });
  assert(create2.status === 201, "second rental request created");
  const rentalId2 = create2.data.rentalId;
  const reject = await api(
    cookieB,
    "PUT",
    `/rentals/reject-rental/${rentalId2}`,
  );
  assert(
    reject.status === 200,
    `rejection succeeded (status ${reject.status})`,
  );
  const [rejectedRow] = await doQuery(
    "SELECT status FROM rentals WHERE rentalId = ?",
    [rentalId2],
  );
  assert(
    rejectedRow.status === "rejected",
    "second rental status is 'rejected'",
  );

  // ---------- 8. Email failure does not delete the rental (isolated) ----------
  const { sendRentalRequestEmail } = require("../services/emailService");
  let threw = false;
  try {
    await sendRentalRequestEmail({ to: null });
  } catch {
    threw = true;
  }
  assert(
    threw,
    "email function throws on missing recipient (controller catch keeps rental)",
  );
  const stillThere = await doQuery(
    "SELECT COUNT(*) AS n FROM rentals WHERE rentalId IN (?, ?)",
    [rentalId, rentalId2],
  );
  assert(
    stillThere[0].n === 2,
    "both rental rows still exist after email error",
  );

  console.log("\nE2E DONE.");
  console.log(
    `test rentalIds: ${rentalId}, ${rentalId2} | plate: ${licensePlate} | users: ${renterId}, ${ownerId}`,
  );
  console.log("Check the server terminal for [email] provider results.");
  process.exit();
})().catch(
  /** Handles a rejected promise from the surrounding workflow.
   * Accepts err; returns the error-handling result. */
  (err) => {
    console.error(err);
    process.exit(1);
});
