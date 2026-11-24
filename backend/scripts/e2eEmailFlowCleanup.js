/** Executable backend script for the e2e email flow cleanup workflow.
 * Runs its checks or maintenance steps and reports the resulting outcome. */
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

(
 /** Runs the script's main asynchronous workflow.
  * Accepts no arguments; returns a promise for the operation result. */
 async () => {
  const users = await doQuery(
    "SELECT userId FROM users WHERE email IN (?, ?)",
    EMAILS,
  );
  if (users.length === 0) {
    console.log("nothing to clean");
    process.exit();
  }
  const userIds = users.map(
    /** Transforms one collection item for the surrounding mapping operation.
     * Accepts u; returns the transformed collection value. */
    (u) => u.userId);

  const rentals = await doQuery(
    `SELECT r.rentalId, r.licensePlate FROM rentals r WHERE r.renterId IN (${userIds.map(
      /** Transforms one collection item for the surrounding mapping operation.
       * Accepts no arguments; returns the transformed collection value. */
      () => "?").join(",")})`,
    userIds,
  );
  const rentalIds = rentals.map(
    /** Transforms one collection item for the surrounding mapping operation.
     * Accepts r; returns the transformed collection value. */
    (r) => r.rentalId);

  if (rentalIds.length > 0) {
    const ph = rentalIds.map(
      /** Transforms one collection item for the surrounding mapping operation.
       * Accepts no arguments; returns the transformed collection value. */
      () => "?").join(",");
    await doQuery(`DELETE FROM rental_payments WHERE rentalId IN (${ph})`, rentalIds);
    await doQuery(`DELETE FROM notifications WHERE rentalId IN (${ph})`, rentalIds);
    await doQuery(`DELETE FROM system_history WHERE rentalId IN (${ph})`, rentalIds);
    await doQuery(`DELETE FROM rentals WHERE rentalId IN (${ph})`, rentalIds);
  }

  const uph = userIds.map(
    /** Transforms one collection item for the surrounding mapping operation.
     * Accepts no arguments; returns the transformed collection value. */
    () => "?").join(",");
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
})().catch(
  /** Handles a rejected promise from the surrounding workflow.
   * Accepts err; returns the error-handling result. */
  (err) => {
    console.error(err);
    process.exit(1);
});
