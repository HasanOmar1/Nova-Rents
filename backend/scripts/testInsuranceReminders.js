/** Executable backend script for the test insurance reminders workflow.
 * Runs its checks or maintenance steps and reports the resulting outcome. */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const doQuery = require("../database/query");
const emailService = require("../services/emailService");
const { PRIVATE_DOCUMENTS_DIR, deletePrivateDocumentFile } = require("../utils/documentFile");
const { replaceDocumentFileOnConnection } = require("../database/queries/documentQueries");
const { withTransaction } = require("../database/withTransaction");

const emails = [];
const originalSend = emailService.sendInsuranceExpirationEmail;
/** Captures an outgoing insurance-expiration email for test assertions.
 * Accepts payload; returns a promise for a simulated delivery result. */
emailService.sendInsuranceExpirationEmail = async (payload) => {
  emails.push(payload);
  return { accepted: [payload.to] };
};

const {
  sendInsuranceReminders,
  expireOverdueDocuments,
  processDocumentExpiration,
} = require("../jobs/documentExpirationJob");

/** Asserts that a verification condition is true.
 * Accepts c and l; returns no value and throws when the condition fails. */
const assert = (c, l) => {
  console.log(`${c ? "PASS" : "FAIL"} - ${l}`);
  if (!c) process.exitCode = 1;
};

const jpegBytes = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);

(
 /** Runs the script's main asynchronous workflow.
  * Accepts no arguments; returns a promise for the operation result. */
 async () => {
  const vehicle = (await doQuery(`SELECT ownerId, licensePlate FROM vehicles LIMIT 1`))[0];
  const user = (await doQuery(
    `SELECT userId, email, firstName FROM users WHERE userId=?`,
    [vehicle.ownerId],
  ))[0];
  const plate = String(vehicle.licensePlate);
  const files = [];
  let documentId = null;

  /** Writes a temporary JPEG fixture into private document storage.
   * Accepts no arguments; returns the stored fixture filename. */
  const writeFile = () => {
    const name = `ins-rem-${Date.now()}-${Math.floor(Math.random() * 9999)}.jpg`;
    fs.writeFileSync(path.join(PRIVATE_DOCUMENTS_DIR, name), jpegBytes);
    files.push(name);
    return name;
  };

  /** Recreates the insurance document fixture with the requested reminder state.
   * Accepts an options object; returns a promise for the operation result. */
  const resetInsuranceDoc = async ({
    status,
    expirationSql,
    reminder7 = null,
    reminder1 = null,
  }) => {
    if (documentId) {
      await doQuery(`DELETE FROM documents WHERE documentId=?`, [documentId]);
      documentId = null;
    }
    await doQuery(
      `DELETE FROM documents WHERE licensePlate=? AND documentType='insurance'`,
      [plate],
    );

    const f = writeFile();
    const ins = await doQuery(
      `INSERT INTO documents (
        userId, licensePlate, documentType, filePath, originalFilename, mimeType, fileSize,
        status, expirationDate, insuranceReminder7SentAt, insuranceReminder1SentAt
      ) VALUES (?, ?, 'insurance', ?, 'ins.jpg', 'image/jpeg', ?, ?, ${expirationSql}, ?, ?)`,
      [user.userId, plate, f, jpegBytes.length, status, reminder7, reminder1],
    );
    documentId = ins.insertId;
    return documentId;
  };

  try {
    // 7-day reminder once
    emails.length = 0;
    await resetInsuranceDoc({
      status: "verified",
      expirationSql: "DATE_ADD(CURDATE(), INTERVAL 7 DAY)",
    });
    const r7a = await sendInsuranceReminders(7);
    assert(r7a.sentCount === 1, `7-day reminder sent once (${r7a.sentCount})`);
    assert(emails.length === 1 && emails[0].stage === "7d", "7-day email captured");
    const n7 = await doQuery(
      `SELECT COUNT(*) n FROM notifications WHERE userId=? AND title='Insurance Expiring Soon'`,
      [user.userId],
    );
    assert(Number(n7[0].n) >= 1, "7-day in-app notification created");
    const r7b = await sendInsuranceReminders(7);
    assert(r7b.sentCount === 0, `7-day rerun sends nothing (${r7b.sentCount})`);
    assert(emails.length === 1, "7-day email not duplicated");

    // 1-day reminder once
    emails.length = 0;
    await resetInsuranceDoc({
      status: "verified",
      expirationSql: "DATE_ADD(CURDATE(), INTERVAL 1 DAY)",
    });
    const r1a = await sendInsuranceReminders(1);
    assert(r1a.sentCount === 1, `1-day reminder sent once (${r1a.sentCount})`);
    assert(emails.length === 1 && emails[0].stage === "1d", "1-day email captured");
    const r1b = await sendInsuranceReminders(1);
    assert(r1b.sentCount === 0, `1-day rerun sends nothing (${r1b.sentCount})`);
    assert(emails.length === 1, "1-day email not duplicated");

    // expiration notification + email once
    emails.length = 0;
    await resetInsuranceDoc({
      status: "verified",
      expirationSql: "DATE_SUB(CURDATE(), INTERVAL 1 DAY)",
    });
    const expA = await expireOverdueDocuments();
    assert(expA.expiredCount >= 1, "expiration transition runs");
    const expRow = (await doQuery(`SELECT status FROM documents WHERE documentId=?`, [documentId]))[0];
    assert(expRow.status === "expired", "insurance marked expired");
    assert(emails.some(
      /** Tests whether one collection item satisfies the surrounding condition.
       * Accepts e; returns a boolean used by the collection operation. */
      (e) => e.stage === "expired"), "expiration email sent");
    const expB = await expireOverdueDocuments();
    assert(expB.expiredCount === 0, "expiration rerun does not re-expire");
    assert(emails.filter(
      /** Tests whether one collection item should remain in the filtered result.
       * Accepts e; returns a boolean used by the collection operation. */
      (e) => e.stage === "expired").length === 1, "expiration email once");

    // rejected -> no reminder
    emails.length = 0;
    await resetInsuranceDoc({
      status: "rejected",
      expirationSql: "DATE_ADD(CURDATE(), INTERVAL 7 DAY)",
    });
    const rej = await sendInsuranceReminders(7);
    assert(rej.sentCount === 0, "rejected insurance gets no 7-day reminder");
    assert(emails.length === 0, "rejected insurance sends no email");

    // future outside window
    emails.length = 0;
    await resetInsuranceDoc({
      status: "verified",
      expirationSql: "DATE_ADD(CURDATE(), INTERVAL 30 DAY)",
    });
    const future = await sendInsuranceReminders(7);
    assert(future.sentCount === 0, "future insurance outside 7-day window");
    assert(emails.length === 0, "future insurance sends no email");

    // replaced pending insurance -> no reminder
    emails.length = 0;
    await resetInsuranceDoc({
      status: "verified",
      expirationSql: "DATE_ADD(CURDATE(), INTERVAL 7 DAY)",
    });
    await sendInsuranceReminders(7);
    emails.length = 0;
    const newFile = writeFile();
    await withTransaction(
      /** Executes the database work within the surrounding transaction.
       * Accepts connection; returns a promise for the transactional result. */
      async (connection) => {
        await replaceDocumentFileOnConnection(connection, documentId, {
          filePath: newFile,
          originalFilename: "new.jpg",
          mimeType: "image/jpeg",
          fileSize: jpegBytes.length,
          documentNumber: null,
          insuranceCompany: "Test Co",
          startDate: null,
          expirationDate: (await doQuery(`SELECT DATE_ADD(CURDATE(), INTERVAL 7 DAY) d`))[0].d,
          lastVerifiedFilePath: null,
          lastVerifiedAt: null,
        });
    });
    const pendingRow = (await doQuery(
      `SELECT status, insuranceReminder7SentAt FROM documents WHERE documentId=?`,
      [documentId],
    ))[0];
    assert(pendingRow.status === "pending_review", "replace resets to pending");
    assert(pendingRow.insuranceReminder7SentAt == null, "replace clears 7-day claim");
    const afterReplace = await sendInsuranceReminders(7);
    assert(afterReplace.sentCount === 0, "pending replaced insurance gets no reminder until verified");

    // re-verify after replace allows fresh 7-day reminder
    await doQuery(
      `UPDATE documents SET status='verified', reviewedAt=NOW(), insuranceReminder7SentAt=NULL, insuranceReminder1SentAt=NULL WHERE documentId=?`,
      [documentId],
    );
    emails.length = 0;
    const reverify = await sendInsuranceReminders(7);
    assert(reverify.sentCount === 1, "re-verified replacement can receive 7-day reminder");

    // full job orchestration
    emails.length = 0;
    const full = await processDocumentExpiration();
    assert(full.reminder7 && full.reminder1 && full.expired, "processDocumentExpiration returns all stages");
  } finally {
    if (documentId) {
      await doQuery(`DELETE FROM documents WHERE documentId=?`, [documentId]);
    }
    for (const f of files) deletePrivateDocumentFile(f);
    emailService.sendInsuranceExpirationEmail = originalSend;
  }

  process.exit(process.exitCode || 0);
})().catch(
  /** Handles a rejected promise from the surrounding workflow.
   * Accepts e; returns the error-handling result. */
  (e) => {
    console.error(e);
    process.exit(1);
});
