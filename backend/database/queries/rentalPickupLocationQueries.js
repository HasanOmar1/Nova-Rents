const doQuery = require("../query");
const { queryOnConnection } = require("../withTransaction");

async function getVehicleExactPickupByLicensePlate(licensePlate) {
  const rows = await doQuery(
    `
      SELECT
        licensePlate,
        exactPickupAddress,
        pickupLatitude,
        pickupLongitude,
        pickupInstructions,
        googlePlaceId
      FROM vehicles
      WHERE licensePlate = ?
    `,
    [licensePlate],
  );
  return rows[0] || null;
}

function isExactPickupComplete(vehicle) {
  if (!vehicle) return false;
  const address = String(vehicle.exactPickupAddress || "").trim();
  const lat = Number(vehicle.pickupLatitude);
  const lng = Number(vehicle.pickupLongitude);
  return (
    Boolean(address) &&
    !Number.isNaN(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    !Number.isNaN(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

async function getPickupSnapshotByRentalId(rentalId) {
  const rows = await doQuery(
    `
      SELECT
        rentalPickupLocationId,
        rentalId,
        pickupAddress,
        pickupLatitude,
        pickupLongitude,
        pickupInstructions,
        createdAt
      FROM rental_pickup_locations
      WHERE rentalId = ?
    `,
    [rentalId],
  );
  return rows[0] || null;
}

/**
 * Immutable snapshot insert. Copies live vehicle exact pickup at payment time.
 * Must run inside a transaction connection. Never UPDATEs an existing row.
 */
async function insertPickupSnapshotFromVehicle(connection, rentalId) {
  const insertResult = await queryOnConnection(
    connection,
    `
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
      JOIN vehicles v ON v.licensePlate = r.licensePlate
      WHERE r.rentalId = ?
        AND v.exactPickupAddress IS NOT NULL
        AND TRIM(v.exactPickupAddress) <> ''
        AND v.pickupLatitude IS NOT NULL
        AND v.pickupLongitude IS NOT NULL
    `,
    [rentalId],
  );

  if (insertResult.affectedRows !== 1) {
    const err = new Error(
      "Failed to create rental pickup snapshot from vehicle location",
    );
    err.code = "PICKUP_SNAPSHOT_INSERT_FAILED";
    throw err;
  }

  const countRows = await queryOnConnection(
    connection,
    `
      SELECT COUNT(*) AS n
      FROM rental_pickup_locations
      WHERE rentalId = ?
    `,
    [rentalId],
  );

  if (Number(countRows[0].n) !== 1) {
    const err = new Error("Pickup snapshot uniqueness check failed");
    err.code = "PICKUP_SNAPSHOT_COUNT_INVALID";
    throw err;
  }

  return insertResult;
}

async function markPaymentPaidByTokenOnConnection(connection, paymentToken) {
  return queryOnConnection(
    connection,
    `
      UPDATE rental_payments
      SET status = 'paid', paidAt = NOW()
      WHERE paymentToken = ? AND status = 'pending'
    `,
    [paymentToken],
  );
}

module.exports = {
  getVehicleExactPickupByLicensePlate,
  isExactPickupComplete,
  getPickupSnapshotByRentalId,
  insertPickupSnapshotFromVehicle,
  markPaymentPaidByTokenOnConnection,
};
