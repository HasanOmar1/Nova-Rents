/** Backend service logic for email operations.
 * Integrates domain workflows with external or shared infrastructure. */
const nodemailer = require("nodemailer");
const { buildMapsDirectionsUrl } = require("../utils/mapsDirections");
const { buildInsuranceReminderCopy } = require("../utils/insuranceReminder");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/** Escapes html.
 * Accepts value; returns the derived value. */
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/** Formats complaint status.
 * Accepts status; returns the derived value. */
const formatComplaintStatus = (status) => {
  if (!status) {
    return "Unknown";
  }

  return status
    .split("_")
    .map(
      /** Transforms one collection item for the surrounding mapping operation.
       * Accepts word; returns the transformed collection value. */
      (word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
};

/** Formats complaint type.
 * Accepts complaintType; returns the derived value. */
const formatComplaintType = (complaintType) => {
  if (!complaintType) {
    return "General Complaint";
  }

  const formattedType =
    complaintType.charAt(0).toUpperCase() + complaintType.slice(1);

  return `${formattedType} Complaint`;
};

/** Formats response date.
 * Accepts responseCreatedAt; returns the derived value. */
const formatResponseDate = (responseCreatedAt) => {
  if (!responseCreatedAt) {
    return "Not available";
  }

  const date = new Date(responseCreatedAt);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jerusalem",
  }).format(date);
};

/** Sends complaint response email.
 * Accepts an options object; returns a promise for the email-delivery result. */
const sendComplaintResponseEmail = async ({
  to,
  firstName,
  complaintId,
  complaintType,
  complaintTitle,
  status,
  responseToUser,
  respondedAt,
}) => {
  if (!to) {
    throw new Error("Complaint email recipient is required");
  }

  if (!complaintId) {
    throw new Error("Complaint ID is required");
  }

  const decisionText = String(responseToUser || "").trim();
  if (
    (status === "resolved" || status === "closed") &&
    !decisionText
  ) {
    throw new Error(
      "Complaint response is required for resolved/closed statuses",
    );
  }

  const formattedComplaintType = formatComplaintType(complaintType);
  const formattedStatus = formatComplaintStatus(status);
  const formattedResponseDate = formatResponseDate(respondedAt);
  const issueText = String(complaintTitle || "").trim() || "No title available";
  const greeting = firstName || "there";

  const targetLabel =
    complaintType === "vehicle"
      ? "Vehicle report"
      : complaintType === "owner"
        ? "Owner report"
        : formattedComplaintType;

  let subject;
  let intro;
  let decisionHeading;
  let shellSubtitle;

  if (status === "in_review") {
    subject = `Your Report Is Under Review — Complaint #${complaintId}`;
    shellSubtitle = "Report Under Review";
    intro = "Nova Rents has started reviewing the complaint you submitted.";
    decisionHeading = "Response from Nova Rents";
  } else if (status === "resolved") {
    subject = `Your Report Has Been Resolved — Complaint #${complaintId}`;
    shellSubtitle = "Report Resolved";
    intro = "Nova Rents has completed its review of your complaint.";
    decisionHeading = "Nova Rents decision";
  } else if (status === "closed") {
    subject = `Your Report Has Been Closed — Complaint #${complaintId}`;
    shellSubtitle = "Report Closed";
    intro = "Nova Rents has closed your complaint.";
    decisionHeading = "Nova Rents closing decision";
  } else {
    subject = `Your Report Status Was Updated — Complaint #${complaintId}`;
    shellSubtitle = "Complaint Update";
    intro = "There is an update regarding the complaint you submitted.";
    decisionHeading = "Response from Nova Rents";
  }

  const dateLabel =
    status === "resolved"
      ? "Resolved"
      : status === "closed"
        ? "Closed"
        : "Updated";

  const decisionBlockText = decisionText
    ? `\n${decisionHeading}:\n${decisionText}\n`
    : "";

  const text = `
Hello ${greeting},

${intro}

Complaint ID:
#${complaintId}

Report type:
${targetLabel}

Reported issue:
${issueText}

Status:
${formattedStatus}
${decisionBlockText}
${dateLabel}:
${formattedResponseDate}

If you need further assistance or have additional information,
please contact our support team.

Thank you for using Nova Rents.

Best regards,
Nova Rents Support Team
  `.trim();

  const safeGreeting = escapeHtml(greeting);
  const safeComplaintId = escapeHtml(complaintId);
  const safeTarget = escapeHtml(targetLabel);
  const safeIssue = escapeHtml(issueText);
  const safeStatus = escapeHtml(formattedStatus);
  const safeDecision = escapeHtml(decisionText).replace(/\r?\n/g, "<br />");
  const safeDate = escapeHtml(formattedResponseDate);
  const safeDecisionHeading = escapeHtml(decisionHeading);
  const decisionHtml = decisionText
    ? `
            <div
              style="
                margin: 24px 0;
                padding: 18px;
                background-color: #eff6ff;
                border-left: 4px solid #2563eb;
                border-radius: 8px;
              "
            >
              <p style="margin: 0 0 10px;">
                <strong>${safeDecisionHeading}:</strong>
              </p>
              <p style="margin: 0;">${safeDecision}</p>
            </div>`
    : "";

  const html = `
      <div
        style="
          max-width: 640px;
          margin: 0 auto;
          padding: 24px;
          font-family: Arial, Helvetica, sans-serif;
          color: #1f2937;
          line-height: 1.6;
          background-color: #f8fafc;
        "
      >
        <div
          style="
            overflow: hidden;
            background-color: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
          "
        >
          <div
            style="
              padding: 24px;
              color: #ffffff;
              background-color: #111827;
            "
          >
            <h1 style="margin: 0; font-size: 24px;">Nova Rents</h1>
            <p style="margin: 8px 0 0; color: #d1d5db;">
              ${escapeHtml(shellSubtitle)}
            </p>
          </div>

          <div style="padding: 24px;">
            <p>Hello ${safeGreeting},</p>
            <p>${escapeHtml(intro)}</p>

            <div
              style="
                margin: 24px 0;
                padding: 18px;
                background-color: #f3f4f6;
                border-radius: 8px;
              "
            >
              <p style="margin: 0 0 12px;">
                <strong>Complaint ID:</strong><br />
                #${safeComplaintId}
              </p>
              <p style="margin: 0 0 12px;">
                <strong>Report type:</strong><br />
                ${safeTarget}
              </p>
              <p style="margin: 0 0 12px;">
                <strong>Reported issue:</strong><br />
                ${safeIssue}
              </p>
              <p style="margin: 0 0 12px;">
                <strong>Status:</strong><br />
                ${safeStatus}
              </p>
              <p style="margin: 0;">
                <strong>${escapeHtml(dateLabel)}:</strong><br />
                ${safeDate}
              </p>
            </div>
            ${decisionHtml}

            <p>
              If you need further assistance or have additional
              information, please contact our support team.
            </p>
            <p>Thank you for using Nova Rents.</p>
            <p style="margin-bottom: 0;">
              Best regards,<br />
              <strong>Nova Rents Support Team</strong>
            </p>
          </div>
        </div>
      </div>
    `;

  const info = await transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });

  logEmailResult(`complaint status ${status} #${complaintId} to reporter`, info);
  return info;
};

// ---------------------------------------------------------------------------
// Rental & payment transactional emails
// ---------------------------------------------------------------------------

const TEST_ENV_DISCLOSURE =
  "This receipt was generated in the Nova Rents test environment. No real funds were transferred.";

const TEST_ENV_CONFIRMATION_DISCLOSURE =
  "This confirmation was generated in the Nova Rents test environment. No real funds were transferred.";

/** Logs email result.
 * Accepts label and info; returns no meaningful value after logging provider metadata. */
const logEmailResult = (label, info) => {
  console.log(
    `[email] ${label}: accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)} messageId=${info.messageId} response=${info.response}`,
  );
};

/** Builds a recipient display name with an email fallback.
 * Accepts firstName, lastName, and email; returns the formatted display name. */
const displayName = (firstName, lastName, email) => {
  const full = `${firstName || ""} ${lastName || ""}`.trim();
  if (full) return full;
  if (firstName) return firstName;
  if (email) return email;
  return "Nova Rents member";
};

/** Builds a readable vehicle name from its brand and model.
 * Accepts brandName and modelName; returns the formatted vehicle label. */
const vehicleDisplayName = (brandName, modelName) =>
  `${brandName || ""} ${modelName || ""}`.trim() || "your vehicle";

/** Formats email date.
 * Accepts value; returns the derived value. */
const formatEmailDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "Asia/Jerusalem",
  }).format(date);
};

/** Formats email date time.
 * Accepts value; returns the derived value. */
const formatEmailDateTime = (value) => formatResponseDate(value);

/** Formats amount.
 * Accepts amount and currency; returns the derived value. */
const formatAmount = (amount, currency = "USD") => {
  const numericAmount = Number(amount);
  const code = currency || "USD";

  if (Number.isNaN(numericAmount)) {
    return `${amount} ${code}`.trim();
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(numericAmount);
  } catch {
    return `${numericAmount.toFixed(2)} ${code}`;
  }
};

/** Computes rental days.
 * Accepts startDate and endDate; returns the derived value. */
const computeRentalDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : null;
};

/** Formats duration.
 * Accepts startDate and endDate; returns the derived value. */
const formatDuration = (startDate, endDate) => {
  const days = computeRentalDays(startDate, endDate);
  if (!days) return null;
  return `${days} day${days === 1 ? "" : "s"}`;
};

/** Builds receipt number.
 * Accepts paymentId; returns the derived value. */
const buildReceiptNumber = (paymentId) => {
  const id = Number(paymentId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return `NR-PAY-${String(id).padStart(6, "0")}`;
};

/** Builds maps url.
 * Accepts address; returns the derived value. */
const buildMapsUrl = (address) => {
  const query = String(address || "").trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

/** Normalizes pickup.
 * Accepts pickup; returns the derived value. */
const normalizePickup = (pickup) => {
  if (pickup == null) {
    return {
      address: "",
      instructions: null,
      latitude: null,
      longitude: null,
    };
  }
  if (typeof pickup === "string") {
    return {
      address: pickup.trim(),
      instructions: null,
      latitude: null,
      longitude: null,
    };
  }
  return {
    address: String(pickup.address || "").trim(),
    instructions:
      pickup.instructions == null || pickup.instructions === ""
        ? null
        : String(pickup.instructions).trim(),
    latitude: pickup.latitude ?? pickup.pickupLatitude ?? null,
    longitude: pickup.longitude ?? pickup.pickupLongitude ?? null,
  };
};

/** Builds primary button.
 * Accepts href and label; returns the derived value. */
const buildPrimaryButton = (href, label) => {
  if (!href) return "";
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
    <p style="text-align: center; margin: 28px 0 8px;">
      <a
        href="${safeHref}"
        style="
          display: inline-block;
          padding: 12px 28px;
          background-color: #2563eb;
          color: #ffffff;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
        "
      >
        ${safeLabel}
      </a>
    </p>
  `;
};

/** Builds detail row.
 * Accepts label and value; returns the derived value. */
const buildDetailRow = (label, value) => {
  if (value === null || value === undefined || value === "") return "";
  return `
    <tr>
      <td style="padding: 8px 0; color: #6b7280; vertical-align: top; width: 40%;">
        ${escapeHtml(label)}
      </td>
      <td style="padding: 8px 0; color: #111827; vertical-align: top; word-break: break-word;">
        ${value}
      </td>
    </tr>
  `;
};

/** Builds detail block.
 * Accepts title and rowsHtml; returns the derived value. */
const buildDetailBlock = (title, rowsHtml) => `
  <div style="margin: 24px 0; padding: 18px; background-color: #f3f4f6; border-radius: 8px;">
    <p style="margin: 0 0 12px; font-weight: 700; color: #111827;">${escapeHtml(title)}</p>
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      ${rowsHtml}
    </table>
  </div>
`;

/** Builds status badge.
 * Accepts label; returns the derived value. */
const buildStatusBadge = (label) => `
  <span
    style="
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background-color: #eff6ff;
      color: #1d4ed8;
      font-size: 13px;
      font-weight: 700;
    "
  >
    ${escapeHtml(label)}
  </span>
`;

/** Builds pickup html.
 * Accepts pickup; returns the derived value. */
const buildPickupHtml = (pickup) => {
  const { address, instructions, latitude, longitude } = normalizePickup(pickup);
  if (!address) return "";

  // Snapshot emails pass lat/lng — use directions only (no city/address search fallback).
  // Approval emails pass city address only — keep Maps search by public city.
  const hasCoordIntent = latitude != null && longitude != null;
  const directionsUrl = buildMapsDirectionsUrl(latitude, longitude);
  const mapsUrl = hasCoordIntent ? directionsUrl : buildMapsUrl(address);

  const buttonLabel = directionsUrl
    ? "Get Directions"
    : "View pickup location on Google Maps";
  const safeAddress = escapeHtml(address);
  const instructionsHtml = instructions
    ? `
    <p style="margin: 0 0 8px; color: #6b7280;">Pickup instructions</p>
    <p style="margin: 0 0 12px; color: #111827; word-break: break-word;">${escapeHtml(instructions)}</p>
  `
    : "";

  const mapsHtml = mapsUrl
    ? `
    <p style="margin: 0 0 8px;">
      <a
        href="${escapeHtml(mapsUrl)}"
        target="_blank"
        rel="noopener noreferrer"
        style="
          display: inline-block;
          padding: 10px 18px;
          background-color: #111827;
          color: #ffffff;
          text-decoration: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        "
      >
        ${escapeHtml(buttonLabel)}
      </a>
    </p>
    <p style="margin: 0 0 16px; font-size: 12px; color: #6b7280; word-break: break-all;">
      ${escapeHtml(mapsUrl)}
    </p>
  `
    : `<p style="margin: 0 0 16px;"></p>`;

  return `
    <p style="margin: 0 0 8px; color: #6b7280;">Pickup location</p>
    <p style="margin: 0 0 12px; color: #111827; word-break: break-word;">${safeAddress}</p>
    ${instructionsHtml}
    ${mapsHtml}
  `;
};

/** Builds pickup text.
 * Accepts pickup; returns the derived value. */
const buildPickupText = (pickup) => {
  const { address, instructions, latitude, longitude } = normalizePickup(pickup);
  if (!address) return "";
  const hasCoordIntent = latitude != null && longitude != null;
  const directionsUrl = buildMapsDirectionsUrl(latitude, longitude);
  const mapsUrl = hasCoordIntent ? directionsUrl : buildMapsUrl(address);
  const instructionsText = instructions
    ? `Pickup instructions:\n${instructions}\n`
    : "";
  if (!mapsUrl) {
    return `Pickup location:\n${address}\n${instructionsText}`;
  }
  const linkLabel = directionsUrl ? "Get Directions" : "View on Google Maps";
  return `Pickup location:\n${address}\n${instructionsText}${linkLabel}: ${mapsUrl}\n`;
};

/** Builds email shell.
 * Accepts subtitle, bodyHtml, and footerNote; returns the derived value. */
const buildEmailShell = (subtitle, bodyHtml, footerNote = null) => `
  <div
    style="
      max-width: 640px;
      margin: 0 auto;
      padding: 24px;
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2937;
      line-height: 1.6;
      background-color: #f8fafc;
    "
  >
    <div
      style="
        overflow: hidden;
        background-color: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
      "
    >
      <div style="padding: 24px; color: #ffffff; background-color: #111827;">
        <h1 style="margin: 0; font-size: 24px;">Nova Rents</h1>
        <p style="margin: 8px 0 0; color: #d1d5db;">${escapeHtml(subtitle)}</p>
      </div>
      <div style="padding: 24px;">
        ${bodyHtml}
        <p style="margin: 28px 0 0;">
          Best regards,<br />
          <strong>Nova Rents Team</strong>
        </p>
      </div>
      ${
        footerNote
          ? `<div style="padding: 16px 24px 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                ${escapeHtml(footerNote)}
              </p>
            </div>`
          : ""
      }
    </div>
  </div>
`;

/** Builds the standard plain-text email closing.
 * Accepts footerNote; returns the plain-text closing. */
const closingText = (footerNote = null) =>
  `Best regards,\nNova Rents Team${footerNote ? `\n\n${footerNote}` : ""}`;

// --- User contact form → Nova Rents support ---
/** Sends contact message email.
 * Accepts an options object; returns a promise for the email-delivery result. */
const sendContactMessageEmail = async ({ sender, subject, message }) => {
  const recipient =
    String(process.env.CONTACT_EMAIL || "").trim() ||
    "novarents9@gmail.com";
  const senderEmail = String(sender?.email || "").trim();

  if (!senderEmail) {
    throw new Error("Contact message sender email is required");
  }

  const senderName = displayName(
    sender?.firstName,
    sender?.lastName,
    senderEmail,
  );
  const cleanSubject = String(subject || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const cleanMessage = String(message || "").trim();
  const safeMessage = escapeHtml(cleanMessage).replace(/\r?\n/g, "<br />");
  const senderRows =
    buildDetailRow("Name", escapeHtml(senderName)) +
    buildDetailRow("Email", escapeHtml(senderEmail)) +
    buildDetailRow("User ID", escapeHtml(sender?.userId ?? "Not available")) +
    buildDetailRow("Subject", escapeHtml(cleanSubject));

  const text = `New contact message received through Nova Rents.\n\nFrom: ${senderName}\nEmail: ${senderEmail}\nUser ID: ${sender?.userId ?? "Not available"}\nSubject: ${cleanSubject}\n\nMessage:\n${cleanMessage}`;

  const info = await transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to: recipient,
    replyTo: {
      name: senderName,
      address: senderEmail,
    },
    subject: `[Nova Rents Contact] ${cleanSubject}`,
    text,
    html: buildEmailShell(
      "New contact message",
      `
        <p>A Nova Rents user sent a message to the support team.</p>
        ${buildDetailBlock("Sender details", senderRows)}
        <p style="margin: 0 0 8px; color: #6b7280;">Message</p>
        <p style="margin: 0; color: #111827; word-break: break-word;">${safeMessage}</p>
      `,
      "Replying to this email will send your response directly to the user.",
    ),
  });

  logEmailResult(
    `contact message from user ${sender?.userId ?? "unknown"}`,
    info,
  );
  return info;
};

// --- Vehicle report filed → vehicle owner (no reporter identity) ---
/** Sends owner vehicle report email.
 * Accepts an options object; returns a promise for the email-delivery result. */
const sendOwnerVehicleReportEmail = async ({
  to,
  ownerFirstName,
  brandName,
  modelName,
  licensePlate,
  title,
  description,
  submittedAt,
  complaintId,
  rentalId,
}) => {
  if (!to) {
    throw new Error("Vehicle report email recipient is required");
  }

  const vehicleName = vehicleDisplayName(brandName, modelName);
  const greeting = ownerFirstName || "there";
  const issueText = String(title || "").trim() || "Not provided";
  const detailsText = String(description || "").trim() || "Not provided";
  const submittedLabel = formatEmailDateTime(submittedAt);
  const safeGreeting = escapeHtml(greeting);
  const safeIssue = escapeHtml(issueText);
  const safeDetails = escapeHtml(detailsText).replace(/\r?\n/g, "<br />");
  const safeComplaintId = escapeHtml(complaintId ?? "—");
  const safeSubmitted = escapeHtml(submittedLabel);

  const text = `
Hello ${greeting},

A report has been submitted regarding one of your vehicles on Nova Rents.

Vehicle:
${vehicleName}

License plate:
${licensePlate}

Complaint ID:
#${complaintId ?? "—"}

Reported issue:
${issueText}

Details:
${detailsText}

Status:
Open

Submitted:
${submittedLabel}

Nova Rents support will review the report.
You can track it in the Reports on Your Vehicles section of the Complaints page.
You will be notified when the report status changes.

${closingText()}
  `.trim();

  const rows =
    buildDetailRow("Vehicle", escapeHtml(vehicleName)) +
    buildDetailRow("License plate", escapeHtml(String(licensePlate ?? ""))) +
    buildDetailRow("Complaint ID", `#${safeComplaintId}`) +
    buildDetailRow("Reported issue", safeIssue) +
    buildDetailRow("Details", safeDetails) +
    buildDetailRow("Status", buildStatusBadge("Open")) +
    buildDetailRow("Submitted", safeSubmitted);

  const html = buildEmailShell(
    "Vehicle Report Received",
    `
      <p>Hello ${safeGreeting},</p>
      <p>
        A report has been submitted regarding one of your vehicles on Nova Rents.
      </p>
      ${buildDetailBlock("Report details", rows)}
      <p>Nova Rents support will review the report.</p>
      <p>
        You can track it in the <strong>Reports on Your Vehicles</strong>
        section of the Complaints page.
      </p>
      <p>You will be notified when the report status changes.</p>
    `,
  );

  const info = await transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Vehicle Report Received — ${vehicleName}`,
    text,
    html,
  });

  logEmailResult(
    `vehicle report #${complaintId} to owner (rental ${rentalId})`,
    info,
  );
  return info;
};

// --- Owner report filed → reported owner (no reporter identity) ---
/** Sends reported owner report email.
 * Accepts an options object; returns a promise for the email-delivery result. */
const sendReportedOwnerReportEmail = async ({
  to,
  ownerFirstName,
  title,
  description,
  submittedAt,
  complaintId,
  rentalId,
}) => {
  if (!to) {
    throw new Error("Reported-owner email recipient is required");
  }

  const greeting = ownerFirstName || "there";
  const issueText = String(title || "").trim() || "Not provided";
  const detailsText = String(description || "").trim() || "Not provided";
  const submittedLabel = formatEmailDateTime(submittedAt);
  const safeGreeting = escapeHtml(greeting);
  const safeIssue = escapeHtml(issueText);
  const safeDetails = escapeHtml(detailsText).replace(/\r?\n/g, "<br />");
  const safeComplaintId = escapeHtml(complaintId ?? "—");
  const safeSubmitted = escapeHtml(submittedLabel);

  const text = `
Hello ${greeting},

A report has been submitted regarding your account on Nova Rents.

Complaint ID:
#${complaintId ?? "—"}

Reported issue:
${issueText}

Details:
${detailsText}

Status:
Open

Submitted:
${submittedLabel}

Nova Rents support will review the report and notify you when the status changes.

${closingText()}
  `.trim();

  const rows =
    buildDetailRow("Complaint ID", `#${safeComplaintId}`) +
    buildDetailRow("Reported issue", safeIssue) +
    buildDetailRow("Details", safeDetails) +
    buildDetailRow("Status", buildStatusBadge("Open")) +
    buildDetailRow("Submitted", safeSubmitted);

  const html = buildEmailShell(
    "Account Report Received",
    `
      <p>Hello ${safeGreeting},</p>
      <p>
        A report has been submitted regarding your account on Nova Rents.
      </p>
      ${buildDetailBlock("Report details", rows)}
      <p>
        Nova Rents support will review the report and notify you when the
        status changes.
      </p>
    `,
  );

  const info = await transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to,
    subject: "A Report Has Been Submitted Regarding Your Account",
    text,
    html,
  });

  logEmailResult(
    `owner report #${complaintId} to reported owner (rental ${rentalId})`,
    info,
  );
  return info;
};

// --- Owner report status change → reported owner (no reporter identity) ---
/** Sends reported owner report status email.
 * Accepts an options object; returns a promise for the email-delivery result. */
const sendReportedOwnerReportStatusEmail = async ({
  to,
  ownerFirstName,
  title,
  status,
  resolutionMessage,
  respondedAt,
  complaintId,
  rentalId,
}) => {
  if (!to) {
    throw new Error("Reported-owner status email recipient is required");
  }

  if (!["in_review", "resolved", "closed"].includes(status)) {
    throw new Error(
      "Reported-owner status email supports in_review, resolved, or closed only",
    );
  }

  const greeting = ownerFirstName || "there";
  const issueText = String(title || "").trim() || "Not provided";
  const decisionText = String(resolutionMessage || "").trim();
  const statusLabel = formatComplaintStatus(status);
  const respondedLabel = formatEmailDateTime(respondedAt);
  const safeGreeting = escapeHtml(greeting);
  const safeIssue = escapeHtml(issueText);
  const safeDecision = escapeHtml(decisionText).replace(/\r?\n/g, "<br />");
  const safeComplaintId = escapeHtml(complaintId ?? "—");
  const safeResponded = escapeHtml(respondedLabel);

  let subject;
  let intro;
  let decisionHeading = null;

  if (status === "in_review") {
    subject = "Report Under Review";
    intro =
      "Nova Rents has started reviewing the report concerning your account.";
  } else if (status === "resolved") {
    subject = "Report Resolved";
    intro = "Nova Rents has completed its review of the report concerning your account.";
    decisionHeading = "Nova Rents decision";
  } else {
    subject = "Report Closed";
    intro = "Nova Rents has closed the report concerning your account.";
    decisionHeading = "Closing decision";
  }

  if ((status === "resolved" || status === "closed") && !decisionText) {
    throw new Error(
      "A user-facing resolution is required for resolved/closed reported-owner emails",
    );
  }

  const decisionBlockText =
    decisionHeading && decisionText
      ? `\n${decisionHeading}:\n${decisionText}\n`
      : "";

  const dateLabel =
    status === "resolved" ? "Resolved" : status === "closed" ? "Closed" : "Updated";

  const text = `
Hello ${greeting},

${intro}

Complaint ID:
#${complaintId ?? "—"}

Reported issue:
${issueText}
${decisionBlockText}
Status:
${statusLabel}

${dateLabel}:
${respondedLabel}

${
  status === "in_review"
    ? "You will be notified when the review is completed."
    : "If you have questions, please contact Nova Rents support."
}

${closingText()}
  `.trim();

  let rows =
    buildDetailRow("Complaint ID", `#${safeComplaintId}`) +
    buildDetailRow("Reported issue", safeIssue);

  if (decisionHeading && decisionText) {
    rows += buildDetailRow(decisionHeading, safeDecision);
  }

  rows +=
    buildDetailRow("Status", buildStatusBadge(statusLabel)) +
    buildDetailRow(dateLabel, safeResponded);

  const followUpHtml =
    status === "in_review"
      ? "<p>You will be notified when the review is completed.</p>"
      : "<p>If you have questions, please contact Nova Rents support.</p>";

  const html = buildEmailShell(
    subject,
    `
      <p>Hello ${safeGreeting},</p>
      <p>${escapeHtml(intro)}</p>
      ${buildDetailBlock("Report details", rows)}
      ${followUpHtml}
    `,
  );

  const info = await transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });

  logEmailResult(
    `owner report status ${status} #${complaintId} to reported owner (rental ${rentalId})`,
    info,
  );
  return info;
};

// --- Vehicle report status change → vehicle owner (no reporter identity) ---
/** Sends owner vehicle report status email.
 * Accepts an options object; returns a promise for the email-delivery result. */
const sendOwnerVehicleReportStatusEmail = async ({
  to,
  ownerFirstName,
  brandName,
  modelName,
  licensePlate,
  title,
  status,
  resolutionMessage,
  respondedAt,
  complaintId,
  rentalId,
}) => {
  if (!to) {
    throw new Error("Vehicle report status email recipient is required");
  }

  if (!["in_review", "resolved", "closed"].includes(status)) {
    throw new Error(
      "Vehicle owner status email supports in_review, resolved, or closed only",
    );
  }

  const vehicleName = vehicleDisplayName(brandName, modelName);
  const greeting = ownerFirstName || "there";
  const issueText = String(title || "").trim() || "Not provided";
  const decisionText = String(resolutionMessage || "").trim();
  const statusLabel = formatComplaintStatus(status);
  const respondedLabel = formatEmailDateTime(respondedAt);
  const safeGreeting = escapeHtml(greeting);
  const safeIssue = escapeHtml(issueText);
  const safeDecision = escapeHtml(decisionText).replace(/\r?\n/g, "<br />");
  const safeComplaintId = escapeHtml(complaintId ?? "—");
  const safeResponded = escapeHtml(respondedLabel);

  let subject;
  let intro;
  let decisionHeading = null;

  if (status === "in_review") {
    subject = `Vehicle Report Under Review — ${vehicleName}`;
    intro =
      "Nova Rents has started reviewing the report concerning your vehicle.";
  } else if (status === "resolved") {
    subject = `Vehicle Report Resolved — ${vehicleName}`;
    intro =
      "Nova Rents has completed its review of the report concerning your vehicle.";
    decisionHeading = "Resolution";
  } else {
    subject = `Vehicle Report Closed — ${vehicleName}`;
    intro = "Nova Rents has closed the report concerning your vehicle.";
    decisionHeading = "Closing decision";
  }

  if (
    (status === "resolved" || status === "closed") &&
    !decisionText
  ) {
    throw new Error(
      "A user-facing resolution is required for resolved/closed owner emails",
    );
  }

  const decisionBlockText =
    decisionHeading && decisionText
      ? `\n${decisionHeading}:\n${decisionText}\n`
      : "";

  const text = `
Hello ${greeting},

${intro}

Vehicle:
${vehicleName}

License plate:
${licensePlate}

Complaint ID:
#${complaintId ?? "—"}

Reported issue:
${issueText}
${decisionBlockText}
Final status:
${statusLabel}

${status === "in_review" ? "Updated" : status === "resolved" ? "Resolved" : "Closed"}:
${respondedLabel}

${
  status === "in_review"
    ? "You will be notified when the review is completed."
    : "You can view the final decision in the Reports on Your Vehicles section of the Complaints page."
}

${closingText()}
  `.trim();

  let rows =
    buildDetailRow("Vehicle", escapeHtml(vehicleName)) +
    buildDetailRow("License plate", escapeHtml(String(licensePlate ?? ""))) +
    buildDetailRow("Complaint ID", `#${safeComplaintId}`) +
    buildDetailRow("Reported issue", safeIssue);

  if (decisionHeading && decisionText) {
    rows += buildDetailRow(decisionHeading, safeDecision);
  }

  rows +=
    buildDetailRow("Final status", buildStatusBadge(statusLabel)) +
    buildDetailRow(
      status === "in_review"
        ? "Updated"
        : status === "resolved"
          ? "Resolved"
          : "Closed",
      safeResponded,
    );

  const followUpHtml =
    status === "in_review"
      ? "<p>You will be notified when the review is completed.</p>"
      : "<p>You can view the final decision in the <strong>Reports on Your Vehicles</strong> section of the Complaints page.</p>";

  const html = buildEmailShell(
    subject.replace(` — ${vehicleName}`, ""),
    `
      <p>Hello ${safeGreeting},</p>
      <p>${escapeHtml(intro)}</p>
      ${buildDetailBlock("Report details", rows)}
      ${followUpHtml}
    `,
  );

  const info = await transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });

  logEmailResult(
    `vehicle report status ${status} #${complaintId} to owner (rental ${rentalId})`,
    info,
  );
  return info;
};

// --- New rental request → vehicle owner (no pickup Maps link) ---
/** Sends rental request email.
 * Accepts an options object; returns a promise for the email-delivery result. */
const sendRentalRequestEmail = async ({
  to,
  ownerFirstName,
  ownerLastName,
  renterFirstName,
  renterLastName,
  renterEmail,
  renterPhone,
  brandName,
  modelName,
  licensePlate,
  startDate,
  endDate,
  totalPrice,
  currency = "USD",
  rentalId,
  requestsUrl,
}) => {
  if (!to) {
    throw new Error("Rental request email recipient is required");
  }

  const ownerName = displayName(ownerFirstName, ownerLastName, to);
  const renterName = displayName(renterFirstName, renterLastName, renterEmail);
  const vehicleName = vehicleDisplayName(brandName, modelName);
  const period = `${formatEmailDate(startDate)} – ${formatEmailDate(endDate)}`;
  const duration = formatDuration(startDate, endDate);
  const amount = formatAmount(totalPrice, currency);
  const greeting = ownerFirstName || ownerName.split(" ")[0] || "there";

  const text = `
Hello ${greeting},

${renterName} submitted a request to rent your ${vehicleName}.

Rental details

Vehicle:
${vehicleName}

License plate:
${licensePlate}

Requested period:
${period}
${duration ? `\nDuration:\n${duration}\n` : ""}
Total rental value:
${amount}

Requested by:
${renterName}

Email:
${renterEmail || "Not available"}

Phone:
${renterPhone || "Not available"}

Request status:
Pending your decision

Review the request from your Nova Rents dashboard.
${requestsUrl || ""}

${closingText()}
  `.trim();

  const rows =
    buildDetailRow("Vehicle", escapeHtml(vehicleName)) +
    buildDetailRow("License plate", escapeHtml(licensePlate)) +
    buildDetailRow("Requested period", escapeHtml(period)) +
    (duration ? buildDetailRow("Duration", escapeHtml(duration)) : "") +
    buildDetailRow("Total rental value", escapeHtml(amount)) +
    buildDetailRow("Requested by", escapeHtml(renterName)) +
    buildDetailRow("Email", escapeHtml(renterEmail || "Not available")) +
    buildDetailRow("Phone", escapeHtml(renterPhone || "Not available")) +
    buildDetailRow("Request status", buildStatusBadge("Pending your decision"));

  const html = buildEmailShell(
    "New Rental Request",
    `
      <p>Hello ${escapeHtml(greeting)},</p>
      <p>${escapeHtml(renterName)} submitted a request to rent your ${escapeHtml(vehicleName)}.</p>
      ${buildDetailBlock("Rental details", rows)}
      <p>Review the request from your Nova Rents dashboard.</p>
      ${buildPrimaryButton(requestsUrl, "Review rental request")}
    `,
  );

  const info = await transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to,
    subject: `New rental request for your ${vehicleName}`,
    text,
    html,
  });

  logEmailResult(`rental request #${rentalId} to owner`, info);
  return info;
};

// --- Approval / payment request → requester (includes Maps when address exists) ---
/** Sends test payment request email.
 * Accepts an options object; returns a promise for the email-delivery result. */
const sendTestPaymentRequestEmail = async ({
  to,
  renterFirstName,
  renterLastName,
  ownerFirstName,
  ownerLastName,
  ownerFullName,
  brandName,
  modelName,
  licensePlate,
  vehicleAddress,
  startDate,
  endDate,
  amount,
  currency,
  rentalId,
  paymentUrl,
}) => {
  if (!to) {
    throw new Error("Payment email recipient is required");
  }

  if (!paymentUrl) {
    throw new Error("Payment URL is required");
  }

  const renterName = displayName(renterFirstName, renterLastName, to);
  const ownerName =
    ownerFullName ||
    displayName(ownerFirstName, ownerLastName, null);
  const vehicleName = vehicleDisplayName(brandName, modelName);
  const period = `${formatEmailDate(startDate)} – ${formatEmailDate(endDate)}`;
  const duration = formatDuration(startDate, endDate);
  const formattedAmount = formatAmount(amount, currency);
  const greeting = renterFirstName || renterName.split(" ")[0] || "there";
  const pickupText = buildPickupText(vehicleAddress);

  const text = `
Hello ${greeting},

${ownerName} approved your request to rent the ${vehicleName}.

Rental details

Vehicle:
${vehicleName}

License plate:
${licensePlate}

${pickupText}
Rental period:
${period}
${duration ? `\nDuration:\n${duration}\n` : ""}
Amount due:
${formattedAmount}

Rental status:
Approved

Payment status:
Pending

Complete the payment to finalize the next step of your reservation.
${paymentUrl}

${closingText()}
  `.trim();

  const rows =
    buildDetailRow("Vehicle", escapeHtml(vehicleName)) +
    buildDetailRow("License plate", escapeHtml(licensePlate)) +
    buildDetailRow("Rental period", escapeHtml(period)) +
    (duration ? buildDetailRow("Duration", escapeHtml(duration)) : "") +
    buildDetailRow("Amount due", escapeHtml(formattedAmount)) +
    buildDetailRow("Rental status", buildStatusBadge("Approved")) +
    buildDetailRow("Payment status", buildStatusBadge("Pending"));

  const html = buildEmailShell(
    "Rental Approved",
    `
      <p>Hello ${escapeHtml(greeting)},</p>
      <p>${escapeHtml(ownerName)} approved your request to rent the ${escapeHtml(vehicleName)}.</p>
      ${buildDetailBlock("Rental details", rows)}
      ${buildPickupHtml(vehicleAddress)}
      <p>Complete the payment to finalize the next step of your reservation.</p>
      ${buildPrimaryButton(paymentUrl, "Complete Payment")}
    `,
  );

  const info = await transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Your ${vehicleName} rental request has been approved`,
    text,
    html,
  });

  logEmailResult(`payment request #${rentalId} to requester`, info);
  return info;
};

// --- Rejection → requester (no pickup location) ---
/** Sends rental rejected email.
 * Accepts an options object; returns a promise for the email-delivery result. */
const sendRentalRejectedEmail = async ({
  to,
  renterFirstName,
  renterLastName,
  ownerFirstName,
  ownerLastName,
  ownerFullName,
  brandName,
  modelName,
  licensePlate,
  startDate,
  endDate,
  rentalId,
  browseUrl,
}) => {
  if (!to) {
    throw new Error("Rental rejection email recipient is required");
  }

  const renterName = displayName(renterFirstName, renterLastName, to);
  const ownerName =
    ownerFullName ||
    displayName(ownerFirstName, ownerLastName, null);
  const vehicleName = vehicleDisplayName(brandName, modelName);
  const period = `${formatEmailDate(startDate)} – ${formatEmailDate(endDate)}`;
  const greeting = renterFirstName || renterName.split(" ")[0] || "there";

  const text = `
Hello ${greeting},

${ownerName} was unable to approve your request for the ${vehicleName}.

Request details

Vehicle:
${vehicleName}

License plate:
${licensePlate}

Requested period:
${period}

Request status:
Not approved

You can return to Nova Rents to explore other available vehicles.
${browseUrl || ""}

${closingText()}
  `.trim();

  const rows =
    buildDetailRow("Vehicle", escapeHtml(vehicleName)) +
    buildDetailRow("License plate", escapeHtml(licensePlate)) +
    buildDetailRow("Requested period", escapeHtml(period)) +
    buildDetailRow("Request status", buildStatusBadge("Not approved"));

  const html = buildEmailShell(
    "Rental Request Update",
    `
      <p>Hello ${escapeHtml(greeting)},</p>
      <p>${escapeHtml(ownerName)} was unable to approve your request for the ${escapeHtml(vehicleName)}.</p>
      ${buildDetailBlock("Request details", rows)}
      <p>You can return to Nova Rents to explore other available vehicles.</p>
      ${buildPrimaryButton(browseUrl, "Browse available vehicles")}
    `,
  );

  const info = await transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Update on your ${vehicleName} rental request`,
    text,
    html,
  });

  logEmailResult(`rental rejection #${rentalId} to requester`, info);
  return info;
};

// --- Payment receipt → requester (professional receipt + Maps + disclosure) ---
// Pickup section MUST use the immutable rental_pickup_locations snapshot only.
// Never fall back to live vehicles.exactPickup* or public city for exact Maps.
/** Sends test payment receipt email.
 * Accepts an options object; returns a promise for the email-delivery result. */
const sendTestPaymentReceiptEmail = async ({
  to,
  paymentId,
  renterFirstName,
  renterLastName,
  ownerFirstName,
  ownerLastName,
  brandName,
  modelName,
  licensePlate,
  pickupAddress,
  pickupLatitude,
  pickupLongitude,
  pickupInstructions,
  startDate,
  endDate,
  amount,
  currency,
  rentalId,
  paidAt,
  rentalUrl,
}) => {
  if (!to) {
    throw new Error("Payment email recipient is required");
  }

  const renterName = displayName(renterFirstName, renterLastName, to);
  const ownerName = displayName(ownerFirstName, ownerLastName, null);
  const vehicleName = vehicleDisplayName(brandName, modelName);
  const period = `${formatEmailDate(startDate)} – ${formatEmailDate(endDate)}`;
  const duration = formatDuration(startDate, endDate);
  const formattedAmount = formatAmount(amount, currency);
  const receiptNumber = buildReceiptNumber(paymentId);
  const paymentDate = formatEmailDateTime(paidAt);
  const greeting = renterFirstName || renterName.split(" ")[0] || "there";
  const snapshotPickup = {
    address: pickupAddress,
    instructions: pickupInstructions,
    latitude: pickupLatitude,
    longitude: pickupLongitude,
  };

  if (
    pickupAddress &&
    !buildMapsDirectionsUrl(pickupLatitude, pickupLongitude)
  ) {
    console.error(
      `Receipt pickup Maps skipped: invalid snapshot coordinates for rentalId=${rentalId}`,
    );
  }

  const pickupText = buildPickupText(snapshotPickup);

  const text = `
Nova Rents
Payment Receipt

Hello ${greeting},

Payment status:
Payment confirmed
${receiptNumber ? `\nReceipt number:\n${receiptNumber}\n` : ""}
Payment date:
${paymentDate}

Paid by:
${renterName}

Vehicle provided by:
${ownerName}

Rental details

Vehicle:
${vehicleName}

License plate:
${licensePlate}

${pickupText}
Rental period:
${period}
${duration ? `\nDuration:\n${duration}\n` : ""}
Amount summary

Rental amount:
${formattedAmount}

Total:
${formattedAmount}

Payment status:
Paid

Thank you for using Nova Rents.
${rentalUrl || ""}

${closingText(TEST_ENV_DISCLOSURE)}
  `.trim();

  const rentalRows =
    buildDetailRow("Vehicle", escapeHtml(vehicleName)) +
    buildDetailRow("License plate", escapeHtml(licensePlate)) +
    buildDetailRow("Rental period", escapeHtml(period)) +
    (duration ? buildDetailRow("Duration", escapeHtml(duration)) : "");

  const paymentRows =
    buildDetailRow("Payment status", buildStatusBadge("Payment confirmed")) +
    (receiptNumber
      ? buildDetailRow("Receipt number", escapeHtml(receiptNumber))
      : "") +
    buildDetailRow("Payment date", escapeHtml(paymentDate)) +
    buildDetailRow("Paid by", escapeHtml(renterName)) +
    buildDetailRow("Vehicle provided by", escapeHtml(ownerName));

  const amountRows =
    buildDetailRow("Rental amount", escapeHtml(formattedAmount)) +
    buildDetailRow(
      "Total",
      `<strong style="font-size: 16px;">${escapeHtml(formattedAmount)}</strong>`,
    ) +
    buildDetailRow("Payment status", buildStatusBadge("Paid"));

  const html = buildEmailShell(
    "Payment Receipt",
    `
      <p>Hello ${escapeHtml(greeting)},</p>
      ${buildDetailBlock("Payment confirmation", paymentRows)}
      ${buildDetailBlock("Rental details", rentalRows)}
      ${buildPickupHtml(snapshotPickup)}
      ${buildDetailBlock("Amount summary", amountRows)}
      <p>Thank you for using Nova Rents.</p>
      ${buildPrimaryButton(rentalUrl, "View Rental")}
    `,
    TEST_ENV_DISCLOSURE,
  );

  const info = await transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Payment receipt — ${vehicleName} rental`,
    text,
    html,
  });

  logEmailResult(`payment receipt #${rentalId} to requester`, info);
  return info;
};

// --- Payment confirmation → vehicle owner (no bank-transfer claim, no Maps) ---
/** Sends owner payment received email.
 * Accepts an options object; returns a promise for the email-delivery result. */
const sendOwnerPaymentReceivedEmail = async ({
  to,
  ownerFirstName,
  ownerLastName,
  renterFirstName,
  renterLastName,
  renterFullName,
  brandName,
  modelName,
  licensePlate,
  startDate,
  endDate,
  amount,
  currency,
  rentalId,
  rentalUrl,
}) => {
  if (!to) {
    throw new Error("Payment email recipient is required");
  }

  const ownerName = displayName(ownerFirstName, ownerLastName, to);
  const renterName =
    renterFullName ||
    displayName(renterFirstName, renterLastName, null);
  const vehicleName = vehicleDisplayName(brandName, modelName);
  const period = `${formatEmailDate(startDate)} – ${formatEmailDate(endDate)}`;
  const duration = formatDuration(startDate, endDate);
  const formattedAmount = formatAmount(amount, currency);
  const greeting = ownerFirstName || ownerName.split(" ")[0] || "there";

  const text = `
Hello ${greeting},

Payment has been confirmed for ${renterName}'s ${vehicleName} rental.

Rental details

Vehicle:
${vehicleName}

License plate:
${licensePlate}

Rental period:
${period}
${duration ? `\nDuration:\n${duration}\n` : ""}
Rental value:
${formattedAmount}

Payment status:
Paid

Requested by:
${renterName}
${rentalUrl || ""}

${closingText(TEST_ENV_CONFIRMATION_DISCLOSURE)}
  `.trim();

  const rows =
    buildDetailRow("Vehicle", escapeHtml(vehicleName)) +
    buildDetailRow("License plate", escapeHtml(licensePlate)) +
    buildDetailRow("Rental period", escapeHtml(period)) +
    (duration ? buildDetailRow("Duration", escapeHtml(duration)) : "") +
    buildDetailRow("Rental value", escapeHtml(formattedAmount)) +
    buildDetailRow("Payment status", buildStatusBadge("Paid")) +
    buildDetailRow("Requested by", escapeHtml(renterName));

  const html = buildEmailShell(
    "Payment Confirmed",
    `
      <p>Hello ${escapeHtml(greeting)},</p>
      <p>
        Payment has been confirmed for ${escapeHtml(renterName)}'s
        ${escapeHtml(vehicleName)} rental.
      </p>
      ${buildDetailBlock("Rental details", rows)}
      ${buildPrimaryButton(rentalUrl, "View Rental")}
    `,
    TEST_ENV_CONFIRMATION_DISCLOSURE,
  );

  const info = await transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Payment confirmed for your ${vehicleName} rental`,
    text,
    html,
  });

  logEmailResult(`payment received #${rentalId} to owner`, info);
  return info;
};

/** Sends account warning email.
 * Accepts an options object; returns a promise for the email-delivery result. */
const sendAccountWarningEmail = async ({ to, firstName, reason, warningCount, blocked }) => {
  if (!to) throw new Error("Warning email recipient is required");
  const greeting = escapeHtml(firstName || "there");
  const subject = blocked ? "Nova Rents Account Blocked" : "Nova Rents Account Warning";
  const statusText = blocked
    ? "Your account has received its third warning and has now been blocked. You can no longer sign in or use restricted Nova Rents functionality."
    : `You currently have ${warningCount} of 3 warnings. If your account reaches 3 warnings, it will be blocked.`;
  const text = `Hello ${firstName || "there"},\n\nYour Nova Rents account has received an official warning.\n\nReason: ${reason}\nCurrent warning count: ${warningCount}/3\n\n${statusText}\n\nAccounts that receive 3 warnings will be blocked from Nova Rents.\n\nNova Rents Support Team`;
  const info = await transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`, to, subject, text,
    html: buildEmailShell(blocked ? "Account Blocked" : "Account Warning", `
      <p>Hello ${greeting},</p><p>Your Nova Rents account has received an official warning.</p>
      ${buildDetailBlock("Warning details", buildDetailRow("Reason", escapeHtml(reason)) + buildDetailRow("Warning count", `${warningCount}/3`))}
      <p>${escapeHtml(statusText)}</p><p><strong>Accounts that receive 3 warnings will be blocked from Nova Rents.</strong></p>`),
  });

  const normalizedRecipient = String(to).trim().toLowerCase();
  const accepted = (info.accepted || []).map(
    /** Transforms one collection item for the surrounding mapping operation.
     * Accepts email; returns the transformed collection value. */
    (email) => String(email).toLowerCase());
  if (!accepted.includes(normalizedRecipient)) {
    const rejected = (info.rejected || []).join(", ") || normalizedRecipient;
    throw new Error(`Warning email recipient was rejected: ${rejected}`);
  }

  logEmailResult(
    `${blocked ? "account blocked" : `account warning ${warningCount}/3`} to ${normalizedRecipient}`,
    info,
  );
  return info;
};

/** Sends account blocked email.
 * Accepts an options object; returns a promise for the email-delivery result. */
const sendAccountBlockedEmail = async ({
  to,
  firstName,
  blockedAt = new Date(),
}) => {
  const recipient = String(to || "").trim();
  if (!recipient) throw new Error("Blocked account email recipient is required");

  const greeting = String(firstName || "there").trim() || "there";
  const formattedBlockedAt = formatEmailDateTime(blockedAt);
  const subject = "Nova Rents Account Blocked";
  const text = `Hello ${greeting},\n\nYour Nova Rents account has been blocked by an administrator.\n\nAccount status: Blocked\nBlocked on: ${formattedBlockedAt}\n\nFuture sign-ins are disabled while your account remains blocked. If you believe this was a mistake, please contact Nova Rents support.\n\nNova Rents Support Team`;

  const blockedBadge = `
    <span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:#fff1f2;color:#be123c;font-size:13px;font-weight:700;">
      Blocked
    </span>
  `;
  const rows =
    buildDetailRow("Account status", blockedBadge) +
    buildDetailRow("Blocked on", escapeHtml(formattedBlockedAt));

  const info = await transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to: recipient,
    subject,
    text,
    html: buildEmailShell(
      "Account Blocked",
      `
        <p>Hello ${escapeHtml(greeting)},</p>
        <p>Your Nova Rents account has been blocked by an administrator.</p>
        ${buildDetailBlock("Account update", rows)}
        <p>Future sign-ins are disabled while your account remains blocked.</p>
        <div style="margin-top:20px;padding:14px 16px;border-left:4px solid #e11d48;border-radius:8px;background-color:#fff1f2;color:#881337;">
          If you believe this was a mistake, please contact Nova Rents support.
        </div>
      `,
    ),
  });

  const normalizedRecipient = recipient.toLowerCase();
  const accepted = (info.accepted || []).map(
    /** Transforms one collection item for the surrounding mapping operation.
     * Accepts email; returns the transformed collection value. */
    (email) =>
    String(email).toLowerCase(),
  );
  if (!accepted.includes(normalizedRecipient)) {
    const rejected = (info.rejected || []).join(", ") || normalizedRecipient;
    throw new Error(`Blocked account email recipient was rejected: ${rejected}`);
  }

  logEmailResult(`account blocked to ${normalizedRecipient}`, info);
  return info;
};

/** Sends account unblocked email.
 * Accepts an options object; returns a promise for the email-delivery result. */
const sendAccountUnblockedEmail = async ({
  to,
  firstName,
  unblockedAt = new Date(),
}) => {
  const recipient = String(to || "").trim();
  if (!recipient) {
    throw new Error("Unblocked account email recipient is required");
  }

  const greeting = String(firstName || "there").trim() || "there";
  const formattedUnblockedAt = formatEmailDateTime(unblockedAt);
  const subject = "Nova Rents Account Unblocked";
  const text = `Hello ${greeting},\n\nYour Nova Rents account has been unblocked by an administrator.\n\nAccount status: Active\nUnblocked on: ${formattedUnblockedAt}\n\nYou can sign in to Nova Rents again. If you did not expect this change or need assistance, please contact Nova Rents support.\n\nNova Rents Support Team`;

  const activeBadge = `
    <span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:#f0fdf4;color:#15803d;font-size:13px;font-weight:700;">
      Active
    </span>
  `;
  const rows =
    buildDetailRow("Account status", activeBadge) +
    buildDetailRow("Unblocked on", escapeHtml(formattedUnblockedAt));

  const info = await transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to: recipient,
    subject,
    text,
    html: buildEmailShell(
      "Account Unblocked",
      `
        <p>Hello ${escapeHtml(greeting)},</p>
        <p>Your Nova Rents account has been unblocked by an administrator.</p>
        ${buildDetailBlock("Account update", rows)}
        <p>You can sign in to Nova Rents again.</p>
        <div style="margin-top:20px;padding:14px 16px;border-left:4px solid #22c55e;border-radius:8px;background-color:#f0fdf4;color:#166534;">
          If you did not expect this change or need assistance, please contact Nova Rents support.
        </div>
      `,
    ),
  });

  const normalizedRecipient = recipient.toLowerCase();
  const accepted = (info.accepted || []).map(
    /** Transforms one collection item for the surrounding mapping operation.
     * Accepts email; returns the transformed collection value. */
    (email) =>
    String(email).toLowerCase(),
  );
  if (!accepted.includes(normalizedRecipient)) {
    const rejected = (info.rejected || []).join(", ") || normalizedRecipient;
    throw new Error(
      `Unblocked account email recipient was rejected: ${rejected}`,
    );
  }

  logEmailResult(`account unblocked to ${normalizedRecipient}`, info);
  return info;
};

/** Sends insurance expiration email.
 * Accepts an options object; returns a promise for the email-delivery result. */
const sendInsuranceExpirationEmail = async ({
  to,
  firstName,
  stage,
  vehicleLabel,
  licensePlateDisplay,
  expirationDate,
}) => {
  const recipient = String(to || "").trim();
  if (!recipient) throw new Error("Insurance reminder email recipient is required");
  if (!["7d", "1d", "expired"].includes(stage)) {
    throw new Error("Invalid insurance reminder stage");
  }

  const greeting = String(firstName || "there").trim() || "there";
  const { emailSubject, emailIntro, emailAction } = buildInsuranceReminderCopy(
    stage,
    vehicleLabel,
  );

  const formattedExpiration = expirationDate
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jerusalem",
      }).format(new Date(expirationDate))
    : "Not available";

  const subtitle =
    stage === "7d"
      ? "Insurance Expiring Soon"
      : stage === "1d"
        ? "Insurance Expires Tomorrow"
        : "Insurance Expired";

  const text = `Hello ${greeting},\n\n${emailIntro}\n\nVehicle: ${vehicleLabel}\nLicense plate: ${licensePlateDisplay}\nExpiration date: ${formattedExpiration}\n\n${emailAction}\n\nYou can update your documents from your Nova Rents profile.\n\nNova Rents Support Team`;

  const rows =
    buildDetailRow("Vehicle", escapeHtml(vehicleLabel)) +
    buildDetailRow("License plate", escapeHtml(licensePlateDisplay)) +
    buildDetailRow("Expiration date", escapeHtml(formattedExpiration));

  const info = await transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to: recipient,
    subject: emailSubject,
    text,
    html: buildEmailShell(
      subtitle,
      `
        <p>Hello ${escapeHtml(greeting)},</p>
        <p>${escapeHtml(emailIntro)}</p>
        ${buildDetailBlock("Insurance details", rows)}
        <p>${escapeHtml(emailAction)}</p>
        <p>You can update your documents from your Nova Rents profile.</p>
      `,
    ),
  });

  logEmailResult(`insurance ${stage} reminder to ${recipient}`, info);
  return info;
};

module.exports = {
  sendContactMessageEmail,
  sendComplaintResponseEmail,
  sendOwnerVehicleReportEmail,
  sendReportedOwnerReportEmail,
  sendReportedOwnerReportStatusEmail,
  sendOwnerVehicleReportStatusEmail,
  sendTestPaymentRequestEmail,
  sendTestPaymentReceiptEmail,
  sendOwnerPaymentReceivedEmail,
  sendRentalRequestEmail,
  sendRentalRejectedEmail,
  sendAccountWarningEmail,
  sendAccountBlockedEmail,
  sendAccountUnblockedEmail,
  sendInsuranceExpirationEmail,
};
