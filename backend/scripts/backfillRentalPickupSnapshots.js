/** Executable backend script for the backfill rental pickup snapshots workflow.
 * Runs its checks or maintenance steps and reports the resulting outcome. */
/**
 * Legacy backfill: create rental_pickup_locations for paid rentals that have
 * no snapshot yet, using the vehicle's CURRENT exact pickup fields.
 *
 * Limitation: this cannot reconstruct the historical paid-time location.
 * It only snapshots whatever is on the vehicle now.
 *
 * Skips rentals whose vehicle is missing exactPickupAddress / lat / lng.
 *
 * Usage (from backend/):
 *   node scripts/backfillRentalPickupSnapshots.js
 *   node scripts/backfillRentalPickupSnapshots.js --apply
 *
 * Default is dry-run (report only).
 */
require("dotenv").config({ quiet: true });
const getDbConnection = require("../database/db");

const APPLY = process.argv.includes("--apply");

const SELECT_ELIGIBLE = `
  SELECT
    r.rentalId,
    r.licensePlate,
    v.exactPickupAddress,
    v.pickupLatitude,
    v.pickupLongitude,
    v.pickupInstructions
  FROM rentals r
  JOIN rental_payments p ON p.rentalId = r.rentalId
  JOIN vehicles v ON v.licensePlate = r.licensePlate
  LEFT JOIN rental_pickup_locations s ON s.rentalId = r.rentalId
  WHERE p.status = 'paid'
    AND s.rentalId IS NULL
    AND v.exactPickupAddress IS NOT NULL
    AND TRIM(v.exactPickupAddress) <> ''
    AND v.pickupLatitude IS NOT NULL
    AND v.pickupLongitude IS NOT NULL
`;

const INSERT_BACKFILL = `
  INSERT INTO rental_pickup_locations (
    rentalId,
    pickupAddress,
    pickupLatitude,
    pickupLongitude,
    pickupInstructions
  )
  SELECT
    r.rentalId,
    v.exactPickupAddress,
    v.pickupLatitude,
    v.pickupLongitude,
    v.pickupInstructions
  FROM rentals r
  JOIN rental_payments p ON p.rentalId = r.rentalId
  JOIN vehicles v ON v.licensePlate = r.licensePlate
  LEFT JOIN rental_pickup_locations s ON s.rentalId = r.rentalId
  WHERE p.status = 'paid'
    AND s.rentalId IS NULL
    AND v.exactPickupAddress IS NOT NULL
    AND TRIM(v.exactPickupAddress) <> ''
    AND v.pickupLatitude IS NOT NULL
    AND v.pickupLongitude IS NOT NULL
`;

(
 /** Runs the script's main asynchronous workflow.
  * Accepts no arguments; returns a promise for the operation result. */
 async () => {
  const db = await getDbConnection();

  const [missing] = await db.query(`
    SELECT COUNT(*) AS n
    FROM rentals r
    JOIN rental_payments p ON p.rentalId = r.rentalId
    LEFT JOIN rental_pickup_locations s ON s.rentalId = r.rentalId
    WHERE p.status = 'paid' AND s.rentalId IS NULL
  `);

  const [incomplete] = await db.query(`
    SELECT r.rentalId, r.licensePlate
    FROM rentals r
    JOIN rental_payments p ON p.rentalId = r.rentalId
    JOIN vehicles v ON v.licensePlate = r.licensePlate
    LEFT JOIN rental_pickup_locations s ON s.rentalId = r.rentalId
    WHERE p.status = 'paid'
      AND s.rentalId IS NULL
      AND (
        v.exactPickupAddress IS NULL OR TRIM(v.exactPickupAddress) = ''
        OR v.pickupLatitude IS NULL OR v.pickupLongitude IS NULL
      )
  `);

  const [eligible] = await db.query(SELECT_ELIGIBLE);

  console.log("=== Legacy pickup snapshot backfill ===");
  console.log("mode:", APPLY ? "APPLY" : "DRY-RUN");
  console.log("paid rentals missing snapshot:", missing[0].n);
  console.log("eligible (complete exact pickup on vehicle):", eligible.length);
  console.log("incomplete (cannot backfill):", incomplete.length);
  if (incomplete.length) {
    console.log(
      "incomplete rentalIds:",
      incomplete.map(
        /** Transforms one collection item for the surrounding mapping operation.
         * Accepts r; returns the transformed collection value. */
        (r) => r.rentalId).join(", "),
    );
  }
  if (eligible.length) {
    console.log(
      "eligible rentalIds:",
      eligible.map(
        /** Transforms one collection item for the surrounding mapping operation.
         * Accepts r; returns the transformed collection value. */
        (r) => r.rentalId).join(", "),
    );
  }

  if (!APPLY) {
    console.log("\nRe-run with --apply to insert snapshots for eligible rows.");
    process.exit(0);
  }

  if (eligible.length === 0) {
    console.log("Nothing to insert.");
    process.exit(0);
  }

  const [result] = await db.query(INSERT_BACKFILL);
  console.log("inserted affectedRows:", result.affectedRows);

  const [after] = await db.query(`
    SELECT COUNT(*) AS n FROM rental_pickup_locations
  `);
  console.log("rental_pickup_locations rows now:", after[0].n);
  process.exit(0);
})().catch(
  /** Handles a rejected promise from the surrounding workflow.
   * Accepts err; returns the error-handling result. */
  (err) => {
    console.error(err);
    process.exit(1);
});
