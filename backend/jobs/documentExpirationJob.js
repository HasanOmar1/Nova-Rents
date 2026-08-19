const cron = require("node-cron");
const { createActivity } = require("../database/queries/activityQueries");
const { createSystemHistory } = require("../database/queries/systemHistoryQueries");
const { createNotification } = require("../database/queries/notificationQueries");
const {
  findDocumentsDueForExpiration,
  markDocumentExpired,
  findVerifiedInsuranceDueForReminder,
  claimInsuranceReminder,
} = require("../database/queries/documentQueries");
const { isVehicleScopedDocumentType } = require("../utils/documentFile");
const { sendInsuranceExpirationEmail } = require("../services/emailService");
const {
  formatLicensePlateDisplay,
  buildVehicleLabel,
  buildInsuranceReminderCopy,
} = require("../utils/insuranceReminder");

async function notifyInsuranceReminder(row, daysBeforeExpiration) {
  const stage = daysBeforeExpiration === 7 ? "7d" : "1d";
  const vehicleLabel = buildVehicleLabel(row);
  const copy = buildInsuranceReminderCopy(stage, vehicleLabel);
  const plateDisplay = formatLicensePlateDisplay(row.licensePlate);

  await createNotification(
    row.userId,
    null,
    "document_update",
    copy.title,
    copy.notification.slice(0, 255),
  );

  if (row.email) {
    await sendInsuranceExpirationEmail({
      to: row.email,
      firstName: row.firstName,
      stage,
      vehicleLabel,
      licensePlateDisplay: plateDisplay,
      expirationDate: row.expirationDate,
    });
  }

  await createSystemHistory(
    row.userId,
    "vehicle",
    "other",
    daysBeforeExpiration === 7
      ? "insurance_reminder_7d"
      : "insurance_reminder_1d",
    "vehicle",
    String(row.documentId),
    null,
    row.licensePlate,
    copy.notification.slice(0, 255),
  );
}

async function sendInsuranceReminders(daysBeforeExpiration) {
  const candidates = await findVerifiedInsuranceDueForReminder(
    daysBeforeExpiration,
  );
  let sentCount = 0;

  for (const row of candidates) {
    const claimed = await claimInsuranceReminder(
      row.documentId,
      daysBeforeExpiration,
    );
    if (!claimed) continue;

    try {
      await notifyInsuranceReminder(row, daysBeforeExpiration);
      sentCount += 1;
    } catch (error) {
      console.error(
        `Insurance ${daysBeforeExpiration}-day reminder failed for document #${row.documentId}:`,
        error.message,
      );
    }
  }

  return { scanned: candidates.length, sentCount };
}

async function expireOverdueDocuments() {
  const due = await findDocumentsDueForExpiration();
  let expiredCount = 0;

  for (const row of due) {
    const result = await markDocumentExpired(row.documentId);
    if (!result.affectedRows) continue;
    expiredCount += 1;

    const isInsurance = row.documentType === "insurance";
    const vehicleLabel = isInsurance ? buildVehicleLabel(row) : null;
    const description = isInsurance
      ? `Insurance for ${vehicleLabel} expired`.slice(0, 255)
      : `Document #${row.documentId} expired`.slice(0, 255);

    await createActivity(
      row.userId,
      "Document Expired",
      description,
      row.documentId,
    );
    await createSystemHistory(
      row.userId,
      isVehicleScopedDocumentType(row.documentType) ? "vehicle" : "user",
      "update",
      "document_expired",
      isVehicleScopedDocumentType(row.documentType) ? "vehicle" : "user",
      String(row.documentId),
      null,
      row.licensePlate || null,
      description,
    );

    try {
      const notifyMessage = isInsurance
        ? buildInsuranceReminderCopy("expired", vehicleLabel).notification
        : `Your ${String(row.documentType || "document").replace(/_/g, " ")} has expired and needs to be replaced.`;

      await createNotification(
        row.userId,
        null,
        "document_update",
        "Document Expired",
        notifyMessage.slice(0, 255),
      );

      if (isInsurance && row.email) {
        await sendInsuranceExpirationEmail({
          to: row.email,
          firstName: row.firstName,
          stage: "expired",
          vehicleLabel,
          licensePlateDisplay: formatLicensePlateDisplay(row.licensePlate),
          expirationDate: row.expirationDate,
        });
      }
    } catch (notifyError) {
      console.error(
        "Failed to notify user about expired document:",
        notifyError.message,
      );
    }
  }

  return { scanned: due.length, expiredCount };
}

async function processDocumentExpiration() {
  const reminder7 = await sendInsuranceReminders(7);
  const reminder1 = await sendInsuranceReminders(1);
  const expired = await expireOverdueDocuments();
  return { reminder7, reminder1, expired };
}

function startDocumentExpirationJob() {
  cron.schedule("0 9 * * *", async () => {
    console.log("Running document expiration job...");
    try {
      const result = await processDocumentExpiration();
      console.log(
        `Document expiration job finished. 7d=${result.reminder7.sentCount} 1d=${result.reminder1.sentCount} expired=${result.expired.expiredCount}`,
      );
    } catch (error) {
      console.error("Document expiration job failed:", error.message);
    }
  });
}

module.exports = {
  startDocumentExpirationJob,
  processDocumentExpiration,
  sendInsuranceReminders,
  expireOverdueDocuments,
};
