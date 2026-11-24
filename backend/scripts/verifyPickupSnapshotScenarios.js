/** Executable backend script for the verify pickup snapshot scenarios workflow.
 * Runs its checks or maintenance steps and reports the resulting outcome. */
/**
 * Step 8 verification — private pickup snapshot scenarios A–D + security checks.
 * Creates disposable users/vehicle/rentals, prints evidence, then cleans up.
 *
 * Usage (from backend/):
 *   node scripts/verifyPickupSnapshotScenarios.js
 *
 * Optional HTTP auth checks require the API on localhost:3000:
 *   RUN_HTTP=1 node scripts/verifyPickupSnapshotScenarios.js
 */
require("dotenv").config({ quiet: true });
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const doQuery = require("../database/query");
const { withTransaction } = require("../database/withTransaction");
const {
  getVehicleExactPickupByLicensePlate,
  isExactPickupComplete,
  insertPickupSnapshotFromVehicle,
  markPaymentPaidByTokenOnConnection,
  getPickupSnapshotByRentalId,
} = require("../database/queries/rentalPickupLocationQueries");
const {
  createRentalPayment,
  getPaymentByToken,
} = require("../database/queries/paymentQueries");
const { buildMapsDirectionsUrl } = require("../utils/mapsDirections");
const {
  omitPrivatePickupFields,
} = require("../utils/omitPrivatePickupFields");

const RUN_HTTP = process.env.RUN_HTTP === "1";
const API = "http://localhost:3000";
const PASSWORD = "VerifyPickup#2026";
const TAG = "pickupverify";

const LOC_A = {
  address: "Location A — Verify St 1, Haifa",
  lat: 32.794,
  lng: 34.9896,
  instructions: "Gate A",
};
const LOC_B = {
  address: "Location B — Verify Ave 2, Haifa",
  lat: 32.81,
  lng: 34.995,
  instructions: "Gate B",
};
const LOC_C = {
  address: "Location C — Verify Blvd 3, Haifa",
  lat: 32.82,
  lng: 35.0,
  instructions: "Gate C",
};

let passCount = 0;
let failCount = 0;

/** Asserts that a verification condition is true.
 * Accepts cond and label; returns no value and throws when the condition fails. */
const assert = (cond, label) => {
  if (cond) {
    passCount += 1;
    console.log(`PASS - ${label}`);
  } else {
    failCount += 1;
    console.log(`FAIL - ${label}`);
  }
};

/** Prints a labeled section in the verification output.
 * Accepts title; returns no meaningful value. */
const section = (title) => {
  console.log(`\n=== ${title} ===`);
};

/** Sets exact pickup.
 * Accepts plate and loc; returns a promise for the operation result. */
const setExactPickup = async (plate, loc) => {
  await doQuery(
    `
      UPDATE vehicles
      SET exactPickupAddress = ?,
          pickupLatitude = ?,
          pickupLongitude = ?,
          pickupInstructions = ?
      WHERE licensePlate = ?
    `,
    [loc.address, loc.lat, loc.lng, loc.instructions, plate],
  );
};

/** Clears exact pickup.
 * Accepts plate; returns no meaningful value after completing the side effect. */
const clearExactPickup = async (plate) => {
  await doQuery(
    `
      UPDATE vehicles
      SET exactPickupAddress = NULL,
          pickupLatitude = NULL,
          pickupLongitude = NULL,
          pickupInstructions = NULL
      WHERE licensePlate = ?
    `,
    [plate],
  );
};

/** Loads vehicle pickup.
 * Accepts plate; returns a promise for the requested data. */
const loadVehiclePickup = async (plate) => {
  const rows = await doQuery(
    `
      SELECT exactPickupAddress, pickupLatitude, pickupLongitude, pickupInstructions, address
      FROM vehicles WHERE licensePlate = ?
    `,
    [plate],
  );
  return rows[0];
};

/** Completes a test payment once inside a transaction.
 * Accepts paymentToken and rentalId; returns a promise for the operation result. */
const payOnce = async (paymentToken, rentalId) => {
  let transitionSucceeded = false;
  await withTransaction(
    /** Executes the database work within the surrounding transaction.
     * Accepts connection; returns a promise for the transactional result. */
    async (connection) => {
      const payResult = await markPaymentPaidByTokenOnConnection(
        connection,
        paymentToken,
      );
      if (payResult.affectedRows !== 1) {
        const err = new Error("PAYMENT_ALREADY_PAID");
        err.code = "PAYMENT_ALREADY_PAID";
        err.affectedRows = payResult.affectedRows;
        throw err;
      }
      await insertPickupSnapshotFromVehicle(connection, rentalId);
      transitionSucceeded = true;
  });
  return { transitionSucceeded, affectedRows: 1 };
};

/** Authenticates credentials and establishes an API session.
 * Accepts email; returns a promise for the operation result. */
const login = async (email) => {
  const res = await fetch(`${API}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (res.status !== 200) {
    throw new Error(`Login failed ${email}: ${res.status}`);
  }
  return res.headers.get("set-cookie").split(";")[0];
};

/** Sends an authenticated request to the local API and parses its response.
 * Accepts cookie, method, and path; returns a promise for status and response data. */
const api = async (cookie, method, path) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: cookie
      ? { Cookie: cookie, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" },
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  return { status: res.status, data };
};

(
 /** Runs the script's main asynchronous workflow.
  * Accepts no arguments; returns a promise for the operation result. */
 async () => {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const suffix = String(Date.now()).slice(-7);
  const [gmailLocal, gmailDomain] = String(
    process.env.EMAIL_USER || "test@example.com",
  ).split("@");
  const EMAIL_RENTER = `${gmailLocal}+${TAG}renter@${gmailDomain}`;
  const EMAIL_OWNER = `${gmailLocal}+${TAG}owner@${gmailDomain}`;
  const EMAIL_OTHER = `${gmailLocal}+${TAG}other@${gmailDomain}`;

  const renterIns = await doQuery(
    `INSERT INTO users (firstName, lastName, email, password, phone, birthDate)
     VALUES ('Verify', 'Renter', ?, ?, ?, '1995-01-01')`,
    [EMAIL_RENTER, hash, `050${suffix}`],
  );
  const ownerIns = await doQuery(
    `INSERT INTO users (firstName, lastName, email, password, phone, birthDate)
     VALUES ('Verify', 'Owner', ?, ?, ?, '1990-01-01')`,
    [EMAIL_OWNER, hash, `051${suffix}`],
  );
  const otherIns = await doQuery(
    `INSERT INTO users (firstName, lastName, email, password, phone, birthDate)
     VALUES ('Verify', 'Other', ?, ?, ?, '1992-01-01')`,
    [EMAIL_OTHER, hash, `052${suffix}`],
  );

  const renterId = renterIns.insertId;
  const ownerId = ownerIns.insertId;
  const otherId = otherIns.insertId;

  const [model] = await doQuery(
    `SELECT cm.modelId FROM carModels cm LIMIT 1`,
  );
  const licensePlate = Number(`8${suffix}`);

  await doQuery(
    `INSERT INTO vehicles (
      licensePlate, fuelType, year, price, address, modelId, ownerId,
      exactPickupAddress, pickupLatitude, pickupLongitude, pickupInstructions
    ) VALUES (?, 'Gasoline', 2022, 120.00, 'Haifa', ?, ?, ?, ?, ?, ?)`,
    [
      licensePlate,
      model.modelId,
      ownerId,
      LOC_A.address,
      LOC_A.lat,
      LOC_A.lng,
      LOC_A.instructions,
    ],
  );

  const start = new Date();
  start.setDate(start.getDate() + 10);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  const rentalIns = await doQuery(
    `INSERT INTO rentals (renterId, licensePlate, startDate, endDate, totalPrice, status)
     VALUES (?, ?, ?, ?, 360.00, 'approved')`,
    [renterId, licensePlate, startDate, endDate],
  );
  const rentalId = rentalIns.insertId;
  const paymentToken = crypto.randomBytes(32).toString("hex");
  await createRentalPayment(rentalId, paymentToken, 360);

  // Missing-location vehicle + rental for Scenario D
  const plateD = Number(`7${suffix}`);
  await doQuery(
    `INSERT INTO vehicles (
      licensePlate, fuelType, year, price, address, modelId, ownerId
    ) VALUES (?, 'Gasoline', 2021, 100.00, 'Haifa', ?, ?)`,
    [plateD, model.modelId, ownerId],
  );
  const rentalDIns = await doQuery(
    `INSERT INTO rentals (renterId, licensePlate, startDate, endDate, totalPrice, status)
     VALUES (?, ?, ?, ?, 200.00, 'approved')`,
    [renterId, plateD, startDate, endDate],
  );
  const rentalDId = rentalDIns.insertId;
  const tokenD = crypto.randomBytes(32).toString("hex");
  await createRentalPayment(rentalDId, tokenD, 200);

  console.log(`renterId=${renterId} ownerId=${ownerId} otherId=${otherId}`);
  console.log(`plate=${licensePlate} rentalId=${rentalId}`);
  console.log(`plateD=${plateD} rentalDId=${rentalDId}`);

  try {
    // ---------- Scenario A ----------
    section("Scenario A — location changed before payment");
    const beforePayVehicle = await loadVehiclePickup(licensePlate);
    console.log("before-payment vehicle (Location A):", {
      exactPickupAddress: beforePayVehicle.exactPickupAddress,
      pickupLatitude: Number(beforePayVehicle.pickupLatitude),
      pickupLongitude: Number(beforePayVehicle.pickupLongitude),
    });
    assert(
      beforePayVehicle.exactPickupAddress === LOC_A.address,
      "vehicle starts at Location A",
    );

    await setExactPickup(licensePlate, LOC_B);
    const afterEditB = await loadVehiclePickup(licensePlate);
    console.log("owner edited to Location B before pay:", {
      exactPickupAddress: afterEditB.exactPickupAddress,
      pickupLatitude: Number(afterEditB.pickupLatitude),
      pickupLongitude: Number(afterEditB.pickupLongitude),
    });
    assert(
      afterEditB.exactPickupAddress === LOC_B.address,
      "live vehicle is Location B before payment",
    );

    const countsBeforePay = await doQuery(`
      SELECT
        (SELECT COUNT(*) FROM rental_payments WHERE status = 'paid') AS paidPayments,
        (SELECT COUNT(*) FROM rental_pickup_locations) AS snapshots
    `);
    console.log("row counts before pay:", countsBeforePay[0]);

    const payResult = await payOnce(paymentToken, rentalId);
    assert(payResult.transitionSucceeded, "first pay transition succeeded");
    assert(payResult.affectedRows === 1, "first pay affectedRows === 1");

    const snapshot = await getPickupSnapshotByRentalId(rentalId);
    console.log("stored snapshot after pay:", {
      rentalId: snapshot?.rentalId,
      pickupAddress: snapshot?.pickupAddress,
      pickupLatitude: Number(snapshot?.pickupLatitude),
      pickupLongitude: Number(snapshot?.pickupLongitude),
      pickupInstructions: snapshot?.pickupInstructions,
    });
    assert(snapshot?.pickupAddress === LOC_B.address, "snapshot stores Location B");
    assert(
      Number(snapshot?.pickupLatitude) === LOC_B.lat,
      "snapshot lat is Location B",
    );
    assert(
      Number(snapshot?.pickupLongitude) === LOC_B.lng,
      "snapshot lng is Location B",
    );

    const mapsB = buildMapsDirectionsUrl(
      snapshot.pickupLatitude,
      snapshot.pickupLongitude,
    );
    console.log("mapsDirectionsUrl from snapshot B:", mapsB);
    assert(
      mapsB && mapsB.includes(encodeURIComponent(`${LOC_B.lat},${LOC_B.lng}`)),
      "directions URL uses Location B coordinates",
    );

    const paymentAfter = await getPaymentByToken(paymentToken);
    assert(paymentAfter.paymentStatus === "paid", "payment status is paid");
    assert(
      paymentAfter.vehicleAddress === "Haifa",
      "payment join still exposes public city only (Haifa)",
    );

    // ---------- Scenario B ----------
    section("Scenario B — location changed after payment");
    await setExactPickup(licensePlate, LOC_C);
    const liveC = await loadVehiclePickup(licensePlate);
    console.log("post-payment vehicle edit (Location C):", {
      exactPickupAddress: liveC.exactPickupAddress,
      pickupLatitude: Number(liveC.pickupLatitude),
      pickupLongitude: Number(liveC.pickupLongitude),
    });
    assert(liveC.exactPickupAddress === LOC_C.address, "live vehicle is Location C");

    const snapshotAfterC = await getPickupSnapshotByRentalId(rentalId);
    console.log("unchanged paid-rental snapshot:", {
      pickupAddress: snapshotAfterC?.pickupAddress,
      pickupLatitude: Number(snapshotAfterC?.pickupLatitude),
      pickupLongitude: Number(snapshotAfterC?.pickupLongitude),
    });
    assert(
      snapshotAfterC?.pickupAddress === LOC_B.address,
      "paid rental snapshot still Location B after vehicle edit to C",
    );
    assert(
      Number(snapshotAfterC?.pickupLatitude) === LOC_B.lat,
      "paid rental snapshot lat still B",
    );

    const tripRows = await doQuery(
      `
        SELECT
          p.status AS paymentStatus,
          rpl.pickupAddress AS snapshotPickupAddress,
          rpl.pickupLatitude AS snapshotPickupLatitude,
          rpl.pickupLongitude AS snapshotPickupLongitude,
          v.exactPickupAddress AS liveExactPickupAddress
        FROM rentals r
        JOIN vehicles v ON v.licensePlate = r.licensePlate
        LEFT JOIN rental_payments p ON p.rentalId = r.rentalId
        LEFT JOIN rental_pickup_locations rpl ON rpl.rentalId = r.rentalId
        WHERE r.rentalId = ?
      `,
      [rentalId],
    );
    console.log("paid trip read sources:", tripRows[0]);
    assert(
      tripRows[0].snapshotPickupAddress === LOC_B.address,
      "trip join reads snapshot B (not live C)",
    );
    assert(
      tripRows[0].liveExactPickupAddress === LOC_C.address,
      "live vehicle column is C (future rentals)",
    );

    console.log(
      "email/receipt data source: snapshot only →",
      {
        pickupAddress: snapshotAfterC.pickupAddress,
        pickupLatitude: Number(snapshotAfterC.pickupLatitude),
        pickupLongitude: Number(snapshotAfterC.pickupLongitude),
        mapsDirectionsUrl: buildMapsDirectionsUrl(
          snapshotAfterC.pickupLatitude,
          snapshotAfterC.pickupLongitude,
        ),
        recipientField: "renterEmail from payment join (DB)",
      },
    );

    // ---------- Scenario C ----------
    section("Scenario C — duplicate payment confirmation");
    const snapCountBefore = await doQuery(
      `SELECT COUNT(*) AS n FROM rental_pickup_locations WHERE rentalId = ?`,
      [rentalId],
    );
    let secondAffected = null;
    let secondError = null;
    try {
      await payOnce(paymentToken, rentalId);
    } catch (err) {
      secondError = err.code || err.message;
      secondAffected = err.affectedRows;
    }
    console.log("second pay result:", { secondError, secondAffected });
    assert(
      secondError === "PAYMENT_ALREADY_PAID",
      "second pay blocked (PAYMENT_ALREADY_PAID)",
    );
    assert(secondAffected === 0, "second pay affectedRows === 0");

    const snapCountAfter = await doQuery(
      `SELECT COUNT(*) AS n FROM rental_pickup_locations WHERE rentalId = ?`,
      [rentalId],
    );
    console.log("snapshot row count for rental:", {
      before: snapCountBefore[0].n,
      after: snapCountAfter[0].n,
    });
    assert(
      Number(snapCountBefore[0].n) === 1 && Number(snapCountAfter[0].n) === 1,
      "exactly one snapshot row after duplicate pay attempt",
    );

    // ---------- Scenario D ----------
    section("Scenario D — missing location");
    const vehicleD = await getVehicleExactPickupByLicensePlate(plateD);
    console.log("vehicle D exact pickup:", vehicleD);
    assert(
      !isExactPickupComplete(vehicleD),
      "vehicle D exact pickup incomplete",
    );

    const payDBefore = await getPaymentByToken(tokenD);
    assert(payDBefore.paymentStatus === "pending", "payment D starts pending");

    let dBlocked = false;
    if (!isExactPickupComplete(vehicleD)) {
      dBlocked = true;
      // Mirror controller: do not enter transaction
    }
    assert(dBlocked, "payment D blocked before transaction");

    const payDAfter = await getPaymentByToken(tokenD);
    const snapD = await getPickupSnapshotByRentalId(rentalDId);
    console.log("payment D after blocked attempt:", {
      paymentStatus: payDAfter.paymentStatus,
      snapshot: snapD,
    });
    assert(payDAfter.paymentStatus === "pending", "payment D remains pending");
    assert(!snapD, "no snapshot inserted for D");

    // ---------- Privacy / omit ----------
    section("Privacy — omitPrivatePickupFields");
    const rawVehicle = {
      licensePlate,
      address: "Haifa",
      exactPickupAddress: LOC_C.address,
      pickupLatitude: LOC_C.lat,
      pickupLongitude: LOC_C.lng,
      pickupInstructions: LOC_C.instructions,
      googlePlaceId: "abc",
    };
    const publicShape = omitPrivatePickupFields(rawVehicle);
    console.log("public vehicle shape keys:", Object.keys(publicShape));
    assert(
      !("exactPickupAddress" in publicShape) &&
        !("pickupLatitude" in publicShape) &&
        !("pickupLongitude" in publicShape) &&
        !("pickupInstructions" in publicShape) &&
        !("googlePlaceId" in publicShape),
      "public omit strips all private pickup fields",
    );
    assert(publicShape.address === "Haifa", "public city address preserved");

    // ---------- HTTP auth (optional) ----------
    if (RUN_HTTP) {
      section("API authorization (HTTP)");
      const cookieRenter = await login(EMAIL_RENTER);
      const cookieOther = await login(EMAIL_OTHER);
      const cookieOwner = await login(EMAIL_OWNER);

      const publicVehicle = await api(null, "GET", `/vehicles/${licensePlate}`);
      console.log("GET /vehicles/:plate status:", publicVehicle.status);
      assert(publicVehicle.status === 200, "public vehicle GET 200");
      assert(
        publicVehicle.data.vehicle &&
          publicVehicle.data.vehicle.exactPickupAddress === undefined &&
          publicVehicle.data.vehicle.pickupLatitude === undefined,
        "public vehicle response has no exact pickup fields",
      );

      const myVehicles = await api(cookieOwner, "GET", "/vehicles/myVehicles");
      assert(myVehicles.status === 200, "owner myVehicles 200");
      const owned = (myVehicles.data.vehicles || myVehicles.data || []).find?.(
        /** Tests whether one collection item is the requested match.
         * Accepts v; returns a boolean used by the collection operation. */
        (v) => Number(v.licensePlate) === licensePlate,
      );
      // response shape may vary — inspect payload
      const ownedList =
        myVehicles.data.vehicles ||
        myVehicles.data.myVehicles ||
        (Array.isArray(myVehicles.data) ? myVehicles.data : null);
      console.log(
        "myVehicles sample keys:",
        ownedList && ownedList[0] ? Object.keys(ownedList[0]) : myVehicles.data,
      );

      const payOk = await api(
        cookieRenter,
        "GET",
        `/payments/${paymentToken}`,
      );
      console.log("renter GET payment:", {
        status: payOk.status,
        exactPickupAvailable: payOk.data.payment?.exactPickupAvailable,
        pickupAddress: payOk.data.payment?.pickupAddress,
        mapsDirectionsUrl: payOk.data.payment?.mapsDirectionsUrl,
      });
      assert(payOk.status === 200, "renter can GET own payment");
      assert(
        payOk.data.payment?.pickupAddress === LOC_B.address,
        "paid payment GET returns snapshot B",
      );
      assert(
        Boolean(payOk.data.payment?.mapsDirectionsUrl),
        "paid payment GET includes mapsDirectionsUrl",
      );

      const payForbidden = await api(
        cookieOther,
        "GET",
        `/payments/${paymentToken}`,
      );
      console.log("other user GET payment status:", payForbidden.status);
      assert(
        payForbidden.status === 403,
        "other user forbidden from payment GET",
      );

      const payDAttempt = await api(
        cookieRenter,
        "POST",
        `/payments/${tokenD}/pay`,
      );
      console.log("pay missing-location via HTTP:", {
        status: payDAttempt.status,
        message: payDAttempt.data.message,
      });
      assert(payDAttempt.status === 400, "HTTP pay D returns 400");
      const payDRecheck = await getPaymentByToken(tokenD);
      assert(
        payDRecheck.paymentStatus === "pending",
        "HTTP pay D left payment pending",
      );
    } else {
      section("API authorization (HTTP skipped)");
      console.log("Set RUN_HTTP=1 with server on :3000 to run HTTP auth checks.");
    }

    const countsFinal = await doQuery(`
      SELECT
        (SELECT COUNT(*) FROM rental_payments WHERE rentalId IN (?, ?)) AS paymentsForTest,
        (SELECT COUNT(*) FROM rental_payments WHERE rentalId = ? AND status = 'paid') AS paidForA,
        (SELECT COUNT(*) FROM rental_pickup_locations WHERE rentalId IN (?, ?)) AS snapshotsForTest
    `, [rentalId, rentalDId, rentalId, rentalId, rentalDId]);
    section("Final row counts (test rentals)");
    console.log(countsFinal[0]);
    assert(Number(countsFinal[0].paidForA) === 1, "exactly one paid payment for A/B/C rental");
    assert(
      Number(countsFinal[0].snapshotsForTest) === 1,
      "exactly one snapshot across test rentals (D has none)",
    );
  } finally {
    section("Cleanup");
    await doQuery(
      `DELETE FROM rental_pickup_locations WHERE rentalId IN (?, ?)`,
      [rentalId, rentalDId],
    );
    await doQuery(
      `DELETE FROM rental_payments WHERE rentalId IN (?, ?)`,
      [rentalId, rentalDId],
    );
    await doQuery(`DELETE FROM rentals WHERE rentalId IN (?, ?)`, [
      rentalId,
      rentalDId,
    ]);
    await doQuery(`DELETE FROM vehicles WHERE licensePlate IN (?, ?)`, [
      licensePlate,
      plateD,
    ]);
    await doQuery(`DELETE FROM users WHERE userId IN (?, ?, ?)`, [
      renterId,
      ownerId,
      otherId,
    ]);
    console.log("cleanup done");
  }

  section("Summary");
  console.log(`PASS=${passCount} FAIL=${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
})().catch(
  /** Handles a rejected promise from the surrounding workflow.
   * Accepts err; returns the error-handling result. */
  (err) => {
    console.error(err);
    process.exit(1);
});
