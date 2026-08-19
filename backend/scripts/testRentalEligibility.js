require("dotenv").config();
const doQuery = require("../database/query");
const {
  getUserRentalEligibility,
  getVehicleRentalEligibility,
  getVehicleRentalEligibilityForNewRental,
} = require("../database/queries/eligibilityQueries");
const {
  evaluateUserRentalEligibility,
  evaluateVehicleRentalEligibility,
  evaluateInsuranceCoversRentalPeriod,
} = require("../utils/documentEligibility");

const TEST_FILE_PATH = "elig-test.jpg";

const assert = (condition, label) => {
  console.log(`${condition ? "PASS" : "FAIL"} - ${label}`);
  if (!condition) process.exitCode = 1;
};

const DOC_USER_TYPES = ["identity_card", "passport", "driver_license"];
const DOC_VEHICLE_TYPES = ["insurance", "vehicle_registration"];

async function getRestorableColumns(tableName) {
  const rows = await doQuery(`SHOW COLUMNS FROM ${tableName}`);
  return rows
    .filter((row) => !String(row.Extra || "").toLowerCase().includes("generated"))
    .map((row) => row.Field);
}

async function insertRows(tableName, columns, rows) {
  if (!rows.length) return;
  const colSql = columns.join(", ");
  const placeholders = `(${columns.map(() => "?").join(", ")})`;
  const sql = `INSERT INTO ${tableName} (${colSql}) VALUES ${placeholders}`;
  for (const row of rows) {
    const values = columns.map((col) => row[col] ?? null);
    await doQuery(sql, values);
  }
}

async function fetchSnapshot({ ownerId, renterId, plate, otherPlate }) {
  const [docColumns, govColumns] = await Promise.all([
    getRestorableColumns("documents"),
    getRestorableColumns("vehicle_government_checks"),
  ]);

  const userIds = [...new Set([ownerId, renterId])];
  const userPlaceholders = userIds.map(() => "?").join(", ");
  const docTypePlaceholders = DOC_USER_TYPES.map(() => "?").join(", ");
  const plateDocTypesPlaceholders = DOC_VEHICLE_TYPES.map(() => "?").join(", ");

  const userScopedDocs = await doQuery(
    `
      SELECT *
      FROM documents
      WHERE userId IN (${userPlaceholders})
        AND licensePlate IS NULL
        AND documentType IN (${docTypePlaceholders})
    `,
    [...userIds, ...DOC_USER_TYPES],
  );

  const vehicleScopedDocs = await doQuery(
    `
      SELECT *
      FROM documents
      WHERE licensePlate = ?
        AND documentType IN (${plateDocTypesPlaceholders})
    `,
    [plate, ...DOC_VEHICLE_TYPES],
  );

  const otherPlateInsurance = otherPlate
    ? await doQuery(
        `
          SELECT *
          FROM documents
          WHERE licensePlate = ?
            AND documentType = 'insurance'
      `,
        [otherPlate],
      )
    : [];

  const govRows = await doQuery(
    `SELECT * FROM vehicle_government_checks WHERE licensePlate = ?`,
    [plate],
  );

  return {
    docColumns,
    govColumns,
    userScopedDocs,
    vehicleScopedDocs,
    otherPlateInsurance,
    govRows,
  };
}

async function restoreSnapshot(snapshot, { ownerId, renterId, plate, otherPlate }) {
  const userIds = [...new Set([ownerId, renterId])];
  for (const userId of userIds) {
    for (const documentType of DOC_USER_TYPES) {
      await doQuery(
        `DELETE FROM documents WHERE userId=? AND licensePlate IS NULL AND documentType=?`,
        [userId, documentType],
      );
    }
  }

  for (const documentType of DOC_VEHICLE_TYPES) {
    await doQuery(
      `DELETE FROM documents WHERE licensePlate=? AND documentType=?`,
      [plate, documentType],
    );
  }

  if (otherPlate) {
    await doQuery(
      `DELETE FROM documents WHERE licensePlate=? AND documentType='insurance'`,
      [otherPlate],
    );
  }

  await doQuery(`DELETE FROM documents WHERE filePath=?`, [TEST_FILE_PATH]);
  await insertRows("documents", snapshot.docColumns, [
    ...snapshot.userScopedDocs,
    ...snapshot.vehicleScopedDocs,
    ...snapshot.otherPlateInsurance,
  ]);

  await doQuery(
    `DELETE FROM vehicle_government_checks WHERE licensePlate=?`,
    [plate],
  );
  await insertRows("vehicle_government_checks", snapshot.govColumns, snapshot.govRows);
}

const upsertUserDoc = async ({
  userId,
  documentType,
  status,
  expirationSql = "NULL",
}) => {
  await doQuery(
    `DELETE FROM documents WHERE userId=? AND licensePlate IS NULL AND documentType=?`,
    [userId, documentType],
  );
  if (status == null) return;
  await doQuery(
    `INSERT INTO documents (
      userId, licensePlate, documentType, filePath, originalFilename, mimeType, fileSize,
      status, expirationDate
    ) VALUES (?, NULL, ?, ?, 'test.jpg', 'image/jpeg', 22, ?, ${expirationSql})`,
    [userId, documentType, TEST_FILE_PATH, status],
  );
};

const upsertVehicleDoc = async ({
  userId,
  licensePlate,
  documentType,
  status,
  expirationSql = "NULL",
}) => {
  await doQuery(
    `DELETE FROM documents WHERE licensePlate=? AND documentType=?`,
    [licensePlate, documentType],
  );
  if (status == null) return;
  await doQuery(
    `INSERT INTO documents (
      userId, licensePlate, documentType, filePath, originalFilename, mimeType, fileSize,
      status, expirationDate
    ) VALUES (?, ?, ?, ?, 'test.jpg', 'image/jpeg', 22, ?, ${expirationSql})`,
    [userId, licensePlate, documentType, TEST_FILE_PATH, status],
  );
};

const setGovStatus = async (licensePlate, status) => {
  await doQuery(
    `INSERT INTO vehicle_government_checks (licensePlate, status, checkedAt, governmentSource)
     VALUES (?, ?, NOW(), 'test')
     ON DUPLICATE KEY UPDATE status=VALUES(status), checkedAt=NOW(), governmentSource='test'`,
    [licensePlate, status],
  );
};

(async () => {
  const vehicle = (
    await doQuery(
      `SELECT ownerId, licensePlate FROM vehicles ORDER BY licensePlate LIMIT 1`,
    )
  )[0];
  if (!vehicle) throw new Error("No vehicles found for eligibility test");
  const ownerId = Number(vehicle.ownerId);
  const plate = String(vehicle.licensePlate);

  const renter = (
    await doQuery(
      `SELECT userId FROM users WHERE role='user' AND userId<>? ORDER BY userId LIMIT 1`,
      [ownerId],
    )
  )[0];
  if (!renter) throw new Error("No renter user found for eligibility test");
  const renterId = Number(renter.userId);

  const otherPlate = (
    await doQuery(
      `SELECT licensePlate FROM vehicles WHERE licensePlate<>? ORDER BY licensePlate LIMIT 1`,
      [plate],
    )
  )[0]?.licensePlate;

  const snapshot = await fetchSnapshot({ ownerId, renterId, plate, otherPlate });

  try {
    // Renter: identity + license verified
    await upsertUserDoc({
      userId: renterId,
      documentType: "identity_card",
      status: "verified",
    });
    await upsertUserDoc({
      userId: renterId,
      documentType: "driver_license",
      status: "verified",
      expirationSql: "DATE_ADD(CURDATE(), INTERVAL 365 DAY)",
    });
    let renterElig = await getUserRentalEligibility(renterId);
    assert(
      renterElig.eligible,
      "Identity verified + license verified + future expiration => CAN RENT",
    );

    // Passport + license
    await upsertUserDoc({
      userId: renterId,
      documentType: "identity_card",
      status: null,
    });
    await upsertUserDoc({
      userId: renterId,
      documentType: "passport",
      status: "verified",
    });
    renterElig = await getUserRentalEligibility(renterId);
    assert(renterElig.eligible, "Passport verified + license verified => CAN RENT");

    // No identity
    await upsertUserDoc({ userId: renterId, documentType: "passport", status: null });
    await upsertUserDoc({
      userId: renterId,
      documentType: "identity_card",
      status: null,
    });
    renterElig = await getUserRentalEligibility(renterId);
    assert(
      !renterElig.eligible &&
        renterElig.reasons.includes("IDENTITY_NOT_UPLOADED"),
      "No identity => BLOCK",
    );

    // Identity pending
    await upsertUserDoc({
      userId: renterId,
      documentType: "identity_card",
      status: "pending_review",
    });
    renterElig = await getUserRentalEligibility(renterId);
    assert(
      !renterElig.eligible &&
        renterElig.reasons.includes("IDENTITY_PENDING_REVIEW"),
      "Identity pending => BLOCK",
    );

    // Identity rejected
    await upsertUserDoc({
      userId: renterId,
      documentType: "identity_card",
      status: "rejected",
    });
    renterElig = await getUserRentalEligibility(renterId);
    assert(
      !renterElig.eligible && renterElig.reasons.includes("IDENTITY_REJECTED"),
      "Identity rejected => BLOCK",
    );

    // No driver license
    await upsertUserDoc({
      userId: renterId,
      documentType: "identity_card",
      status: "verified",
    });
    await upsertUserDoc({
      userId: renterId,
      documentType: "driver_license",
      status: null,
    });
    renterElig = await getUserRentalEligibility(renterId);
    assert(
      !renterElig.eligible &&
        renterElig.reasons.includes("DRIVER_LICENSE_NOT_UPLOADED"),
      "No driver license => BLOCK",
    );

    // License pending/rejected/expired
    await upsertUserDoc({
      userId: renterId,
      documentType: "driver_license",
      status: "pending_review",
    });
    renterElig = await getUserRentalEligibility(renterId);
    assert(
      renterElig.reasons.includes("DRIVER_LICENSE_PENDING_REVIEW"),
      "License pending => BLOCK",
    );

    await upsertUserDoc({
      userId: renterId,
      documentType: "driver_license",
      status: "rejected",
    });
    renterElig = await getUserRentalEligibility(renterId);
    assert(
      renterElig.reasons.includes("DRIVER_LICENSE_REJECTED"),
      "License rejected => BLOCK",
    );

    await upsertUserDoc({
      userId: renterId,
      documentType: "driver_license",
      status: "verified",
      expirationSql: "DATE_SUB(CURDATE(), INTERVAL 1 DAY)",
    });
    renterElig = await getUserRentalEligibility(renterId);
    assert(
      renterElig.reasons.includes("DRIVER_LICENSE_EXPIRED"),
      "License expired => BLOCK",
    );

    // Restore renter for vehicle tests
    await upsertUserDoc({
      userId: renterId,
      documentType: "identity_card",
      status: "verified",
    });
    await upsertUserDoc({
      userId: renterId,
      documentType: "driver_license",
      status: "verified",
      expirationSql: "DATE_ADD(CURDATE(), INTERVAL 365 DAY)",
    });

    // Vehicle eligibility baseline
    await upsertUserDoc({
      userId: ownerId,
      documentType: "identity_card",
      status: "verified",
    });
    await upsertVehicleDoc({
      userId: ownerId,
      licensePlate: plate,
      documentType: "insurance",
      status: "verified",
      expirationSql: "DATE_ADD(CURDATE(), INTERVAL 30 DAY)",
    });
    await upsertVehicleDoc({
      userId: ownerId,
      licensePlate: plate,
      documentType: "vehicle_registration",
      status: "verified",
    });
    await setGovStatus(plate, "verified");
    let vehicleElig = await getVehicleRentalEligibility(plate, ownerId);
    assert(
      vehicleElig.eligible,
      "Owner identity + insurance + registration + gov verified => eligible",
    );

    // Owner identity missing
    await upsertUserDoc({
      userId: ownerId,
      documentType: "identity_card",
      status: null,
    });
    await upsertUserDoc({
      userId: ownerId,
      documentType: "passport",
      status: null,
    });
    vehicleElig = await getVehicleRentalEligibility(plate, ownerId);
    assert(
      vehicleElig.reasons.some((r) => r.startsWith("OWNER_IDENTITY_")),
      "Owner identity missing => NOT eligible",
    );
    await upsertUserDoc({
      userId: ownerId,
      documentType: "identity_card",
      status: "verified",
    });

    // Insurance states
    await upsertVehicleDoc({
      userId: ownerId,
      licensePlate: plate,
      documentType: "insurance",
      status: null,
    });
    vehicleElig = await getVehicleRentalEligibility(plate, ownerId);
    assert(
      vehicleElig.reasons.includes("INSURANCE_NOT_UPLOADED"),
      "Insurance missing => NOT eligible",
    );

    await upsertVehicleDoc({
      userId: ownerId,
      licensePlate: plate,
      documentType: "insurance",
      status: "pending_review",
    });
    vehicleElig = await getVehicleRentalEligibility(plate, ownerId);
    assert(
      vehicleElig.reasons.includes("INSURANCE_PENDING_REVIEW"),
      "Insurance pending => NOT eligible",
    );

    await upsertVehicleDoc({
      userId: ownerId,
      licensePlate: plate,
      documentType: "insurance",
      status: "rejected",
    });
    vehicleElig = await getVehicleRentalEligibility(plate, ownerId);
    assert(
      vehicleElig.reasons.includes("INSURANCE_REJECTED"),
      "Insurance rejected => NOT eligible",
    );

    await upsertVehicleDoc({
      userId: ownerId,
      licensePlate: plate,
      documentType: "insurance",
      status: "expired",
    });
    vehicleElig = await getVehicleRentalEligibility(plate, ownerId);
    assert(
      vehicleElig.reasons.includes("INSURANCE_EXPIRED"),
      "Insurance expired => NOT eligible",
    );

    await upsertVehicleDoc({
      userId: ownerId,
      licensePlate: plate,
      documentType: "insurance",
      status: "verified",
      expirationSql: "DATE_ADD(CURDATE(), INTERVAL 30 DAY)",
    });

    // Registration states
    await upsertVehicleDoc({
      userId: ownerId,
      licensePlate: plate,
      documentType: "vehicle_registration",
      status: "pending_review",
    });
    vehicleElig = await getVehicleRentalEligibility(plate, ownerId);
    assert(
      vehicleElig.reasons.includes("VEHICLE_REGISTRATION_PENDING_REVIEW"),
      "Registration pending => NOT eligible",
    );
    await upsertVehicleDoc({
      userId: ownerId,
      licensePlate: plate,
      documentType: "vehicle_registration",
      status: "verified",
    });

    // Wrong plate docs must not satisfy target vehicle
    if (otherPlate) {
      await upsertVehicleDoc({
        userId: ownerId,
        licensePlate: otherPlate,
        documentType: "insurance",
        status: "verified",
        expirationSql: "DATE_ADD(CURDATE(), INTERVAL 30 DAY)",
      });
      await upsertVehicleDoc({
        userId: ownerId,
        licensePlate: plate,
        documentType: "insurance",
        status: null,
      });
      vehicleElig = await getVehicleRentalEligibility(plate, ownerId);
      assert(
        vehicleElig.reasons.includes("INSURANCE_NOT_UPLOADED"),
        "Insurance for another plate does not satisfy vehicle",
      );
      await upsertVehicleDoc({
        userId: ownerId,
        licensePlate: plate,
        documentType: "insurance",
        status: "verified",
        expirationSql: "DATE_ADD(CURDATE(), INTERVAL 30 DAY)",
      });
    }

    // Government policy
    await setGovStatus(plate, "mismatch");
    vehicleElig = await getVehicleRentalEligibility(plate, ownerId);
    assert(
      vehicleElig.reasons.includes("GOVERNMENT_CHECK_MISMATCH"),
      "Gov mismatch => NOT eligible",
    );

    await setGovStatus(plate, "not_found");
    vehicleElig = await getVehicleRentalEligibility(plate, ownerId);
    assert(
      vehicleElig.reasons.includes("GOVERNMENT_CHECK_NOT_FOUND"),
      "Gov not_found => NOT eligible",
    );

    await setGovStatus(plate, "unavailable");
    vehicleElig = await getVehicleRentalEligibility(plate, ownerId);
    assert(
      vehicleElig.reasons.includes("GOVERNMENT_CHECK_UNAVAILABLE"),
      "Gov unavailable blocks new rentals (temporary outage policy)",
    );

    await setGovStatus(plate, "error");
    vehicleElig = await getVehicleRentalEligibility(plate, ownerId);
    assert(
      vehicleElig.reasons.includes("GOVERNMENT_CHECK_ERROR"),
      "Gov error blocks new rentals",
    );

    await doQuery(`DELETE FROM vehicle_government_checks WHERE licensePlate=?`, [plate]);
    vehicleElig = await getVehicleRentalEligibility(plate, ownerId);
    assert(
      vehicleElig.reasons.includes("GOVERNMENT_CHECK_NOT_RUN"),
      "No gov check row => NOT eligible",
    );

    // Pure unit sanity
    const unit = evaluateUserRentalEligibility([
      {
        documentType: "identity_card",
        status: "verified",
        licensePlate: null,
      },
      {
        documentType: "driver_license",
        status: "verified",
        expirationDate: "2099-01-01",
        licensePlate: null,
      },
    ]);
    assert(unit.eligible, "Unit evaluateUserRentalEligibility works");

    const unitVehicle = evaluateVehicleRentalEligibility({
      ownerDocuments: [
        { documentType: "passport", status: "verified", licensePlate: null },
      ],
      vehicleDocuments: [
        {
          documentType: "insurance",
          status: "verified",
          licensePlate: plate,
          expirationDate: "2099-01-01",
        },
        {
          documentType: "vehicle_registration",
          status: "verified",
          licensePlate: plate,
        },
      ],
      governmentStatus: "verified",
    });
    assert(unitVehicle.eligible, "Unit evaluateVehicleRentalEligibility works");

    // Insurance must cover the full requested rental period (new rentals only).
    const rentalEnd = (
      await doQuery(
        `SELECT DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 10 DAY), '%Y-%m-%d') AS d`,
      )
    )[0].d;
    const rentalEndStr = String(rentalEnd);

    await upsertUserDoc({
      userId: ownerId,
      documentType: "identity_card",
      status: "verified",
    });
    await upsertVehicleDoc({
      userId: ownerId,
      licensePlate: plate,
      documentType: "vehicle_registration",
      status: "verified",
    });
    await setGovStatus(plate, "verified");

    await upsertVehicleDoc({
      userId: ownerId,
      licensePlate: plate,
      documentType: "insurance",
      status: "verified",
      expirationSql: "DATE_ADD(CURDATE(), INTERVAL 5 DAY)",
    });
    let periodElig = await getVehicleRentalEligibilityForNewRental(
      plate,
      ownerId,
      rentalEndStr,
    );
    assert(
      !periodElig.eligible &&
        periodElig.reasons.includes("INSURANCE_DOES_NOT_COVER_RENTAL_PERIOD"),
      "Insurance expiring before rental.endDate => BLOCK",
    );

    const onEndDate = (
      await doQuery(
        `SELECT DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 10 DAY), '%Y-%m-%d') AS d`,
      )
    )[0].d;
    await upsertVehicleDoc({
      userId: ownerId,
      licensePlate: plate,
      documentType: "insurance",
      status: "verified",
      expirationSql: "DATE_ADD(CURDATE(), INTERVAL 10 DAY)",
    });
    periodElig = await getVehicleRentalEligibilityForNewRental(
      plate,
      ownerId,
      String(onEndDate),
    );
    assert(periodElig.eligible, "Insurance expiring ON rental.endDate => PASS");

    await upsertVehicleDoc({
      userId: ownerId,
      licensePlate: plate,
      documentType: "insurance",
      status: "verified",
      expirationSql: "DATE_ADD(CURDATE(), INTERVAL 20 DAY)",
    });
    periodElig = await getVehicleRentalEligibilityForNewRental(
      plate,
      ownerId,
      rentalEndStr,
    );
    assert(periodElig.eligible, "Insurance expiring AFTER rental.endDate => PASS");

    await upsertVehicleDoc({
      userId: ownerId,
      licensePlate: plate,
      documentType: "insurance",
      status: "verified",
      expirationSql: "DATE_SUB(CURDATE(), INTERVAL 1 DAY)",
    });
    periodElig = await getVehicleRentalEligibilityForNewRental(
      plate,
      ownerId,
      rentalEndStr,
    );
    assert(
      !periodElig.eligible && periodElig.reasons.includes("INSURANCE_EXPIRED"),
      "Insurance already expired => INSURANCE_EXPIRED (not period reason)",
    );

    if (otherPlate) {
      await upsertVehicleDoc({
        userId: ownerId,
        licensePlate: otherPlate,
        documentType: "insurance",
        status: "verified",
        expirationSql: "DATE_ADD(CURDATE(), INTERVAL 365 DAY)",
      });
      await upsertVehicleDoc({
        userId: ownerId,
        licensePlate: plate,
        documentType: "insurance",
        status: null,
      });
      periodElig = await getVehicleRentalEligibilityForNewRental(
        plate,
        ownerId,
        rentalEndStr,
      );
      assert(
        periodElig.reasons.includes("INSURANCE_NOT_UPLOADED"),
        "Insurance on another plate does not satisfy rental",
      );
    }

    const unitPeriod = evaluateInsuranceCoversRentalPeriod(
      {
        documentType: "insurance",
        status: "verified",
        expirationDate: "2026-08-25",
        licensePlate: plate,
      },
      "2026-08-30",
      plate,
    );
    assert(
      !unitPeriod.ok &&
        unitPeriod.reasons.includes("INSURANCE_DOES_NOT_COVER_RENTAL_PERIOD"),
      "Unit period check blocks when expiration is before rental end",
    );

    const unitPeriodPass = evaluateInsuranceCoversRentalPeriod(
      {
        documentType: "insurance",
        status: "verified",
        expirationDate: "2026-08-30",
        licensePlate: plate,
      },
      "2026-08-30",
      plate,
    );
    assert(
      unitPeriodPass.ok,
      "Unit period check passes when expiration equals rental end",
    );
  } finally {
    await restoreSnapshot(snapshot, { ownerId, renterId, plate, otherPlate });
  }

  process.exit(process.exitCode || 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
