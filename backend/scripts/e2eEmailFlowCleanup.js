// Removes everything created by scripts/e2eEmailFlowTest.js, identified by
// the test users' plus-alias emails. FK order: payments/notifications first,
// then rentals, vehicle, users (activity_logs cascades with users).
require("dotenv").config({ quiet: true });
const doQuery = require("../database/query");

const TAG = "e2etest";
const [gmailLocal, gmailDomain] = process.env.EMAIL_USER.split("@");
const EMAILS = [
  `${gmailLocal}+${TAG}renter@${gmailDomain}`,
  `${gmailLocal}+${TAG}owner@${gmailDomain}`,
];

(async () => {
  const users = await doQuery(
    "SELECT userId FROM users WHERE email IN (?, ?)",
    EMAILS,
  );
  if (users.length === 0) {
    console.log("nothing to clean");
    process.exit();
  }
  const userIds = users.map((u) => u.userId);

  const rentals = await doQuery(
    `SELECT r.rentalId, r.licensePlate FROM rentals r WHERE r.renterId IN (${userIds.map(() => "?").join(",")})`,
    userIds,
  );
  const rentalIds = rentals.map((r) => r.rentalId);

  if (rentalIds.length > 0) {
    const ph = rentalIds.map(() => "?").join(",");
    await doQuery(`DELETE FROM rental_payments WHERE rentalId IN (${ph})`, rentalIds);
    await doQuery(`DELETE FROM notifications WHERE rentalId IN (${ph})`, rentalIds);
    await doQuery(`DELETE FROM system_history WHERE rentalId IN (${ph})`, rentalIds);
    await doQuery(`DELETE FROM rentals WHERE rentalId IN (${ph})`, rentalIds);
  }

  const uph = userIds.map(() => "?").join(",");
  await doQuery(`DELETE FROM notifications WHERE userId IN (${uph})`, userIds);
  await doQuery(`DELETE FROM activity_logs WHERE userId IN (${uph})`, userIds);
  await doQuery(
    `DELETE FROM system_history WHERE actorUserId IN (${uph})`,
    userIds,
  );
  await doQuery(`DELETE FROM vehicles WHERE ownerId IN (${uph})`, userIds);
  await doQuery(`DELETE FROM users WHERE userId IN (${uph})`, userIds);

  console.log(
    `cleaned: users=${userIds.join(",")} rentals=${rentalIds.join(",") || "none"}`,
  );
  process.exit();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
