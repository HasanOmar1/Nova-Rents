const nodemailer = require("nodemailer");
const generateOTP = require("../utils/generateOTP");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTPEmail = async (email, otp) => {
  return transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verification Code",
    html: `<h1>${otp}</h1>`,
  });
};

const handleEmailVerification = async (email) => {
  const otp = generateOTP();

  await sendOTPEmail(email, otp);

  return otp;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatComplaintStatus = (status) => {
  if (!status) {
    return "Unknown";
  }

  return status
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
};

const formatComplaintType = (complaintType) => {
  if (!complaintType) {
    return "General Complaint";
  }

  const formattedType =
    complaintType.charAt(0).toUpperCase() + complaintType.slice(1);

  return `${formattedType} Complaint`;
};

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

  if (!responseToUser?.trim()) {
    throw new Error("Complaint response is required");
  }

  const formattedComplaintType = formatComplaintType(complaintType);
  const formattedStatus = formatComplaintStatus(status);
  const formattedResponseDate = formatResponseDate(respondedAt);

  const safeFirstName = escapeHtml(firstName || "there");
  const safeComplaintId = escapeHtml(complaintId);
  const safeComplaintType = escapeHtml(formattedComplaintType);
  const safeComplaintTitle = escapeHtml(complaintTitle || "No title available");
  const safeStatus = escapeHtml(formattedStatus);
  const safeResponseDate = escapeHtml(formattedResponseDate);
  const safeResponse = escapeHtml(responseToUser).replace(/\r?\n/g, "<br />");

  return transporter.sendMail({
    from: `"Nova Rents" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Nova Rents - Update regarding complaint #${complaintId}`,

    text: `
Hello ${firstName || "there"},

We have reviewed your complaint and there is an update.

Complaint ID:
#${complaintId}

Complaint Type:
${formattedComplaintType}

Complaint Title:
${complaintTitle || "No title available"}

Current Status:
${formattedStatus}

Response Date:
${formattedResponseDate}

Administrator Response:
${responseToUser}

If you need further assistance or have additional information,
please contact our support team.

Thank you for using Nova Rents.

Best regards,
Nova Rents Support Team
    `.trim(),

    html: `
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
            <h1
              style="
                margin: 0;
                font-size: 24px;
              "
            >
              Nova Rents
            </h1>

            <p
              style="
                margin: 8px 0 0;
                color: #d1d5db;
              "
            >
              Complaint Update
            </p>
          </div>

          <div style="padding: 24px;">
            <p>Hello ${safeFirstName},</p>

            <p>
              We have reviewed your complaint and there is an update.
            </p>

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
                <strong>Complaint Type:</strong><br />
                ${safeComplaintType}
              </p>

              <p style="margin: 0 0 12px;">
                <strong>Complaint Title:</strong><br />
                ${safeComplaintTitle}
              </p>

              <p style="margin: 0 0 12px;">
                <strong>Current Status:</strong><br />
                ${safeStatus}
              </p>

              <p style="margin: 0;">
                <strong>Response Date:</strong><br />
                ${safeResponseDate}
              </p>
            </div>

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
                <strong>Administrator Response:</strong>
              </p>

              <p style="margin: 0;">
                ${safeResponse}
              </p>
            </div>

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
    `,
  });
};

// ---------------------------------------------------------------------------
// Rental & payment transactional emails
// ---------------------------------------------------------------------------

const TEST_ENV_DISCLOSURE =
  "This receipt was generated in the Nova Rents test environment. No real funds were transferred.";

const TEST_ENV_CONFIRMATION_DISCLOSURE =
  "This confirmation was generated in the Nova Rents test environment. No real funds were transferred.";

const logEmailResult = (label, info) => {
  console.log(
    `[email] ${label}: accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)} messageId=${info.messageId} response=${info.response}`,
  );
};

const displayName = (firstName, lastName, email) => {
  const full = `${firstName || ""} ${lastName || ""}`.trim();
  if (full) return full;
  if (firstName) return firstName;
  if (email) return email;
  return "Nova Rents member";
};

const vehicleDisplayName = (brandName, modelName) =>
  `${brandName || ""} ${modelName || ""}`.trim() || "your vehicle";

const formatEmailDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "Asia/Jerusalem",
  }).format(date);
};

const formatEmailDateTime = (value) => formatResponseDate(value);

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

const computeRentalDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : null;
};

const formatDuration = (startDate, endDate) => {
  const days = computeRentalDays(startDate, endDate);
  if (!days) return null;
  return `${days} day${days === 1 ? "" : "s"}`;
};

const buildReceiptNumber = (paymentId) => {
  const id = Number(paymentId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return `NR-PAY-${String(id).padStart(6, "0")}`;
};

const buildMapsUrl = (vehicleAddress) => {
  const address = String(vehicleAddress || "").trim();
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

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

const buildDetailBlock = (title, rowsHtml) => `
  <div style="margin: 24px 0; padding: 18px; background-color: #f3f4f6; border-radius: 8px;">
    <p style="margin: 0 0 12px; font-weight: 700; color: #111827;">${escapeHtml(title)}</p>
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      ${rowsHtml}
    </table>
  </div>
`;

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

const buildPickupHtml = (vehicleAddress) => {
  const address = String(vehicleAddress || "").trim();
  if (!address) return "";

  const mapsUrl = buildMapsUrl(address);
  const safeAddress = escapeHtml(address);
  const safeMapsUrl = escapeHtml(mapsUrl);

  return `
    <p style="margin: 0 0 8px; color: #6b7280;">Pickup location</p>
    <p style="margin: 0 0 12px; color: #111827; word-break: break-word;">${safeAddress}</p>
    <p style="margin: 0 0 8px;">
      <a
        href="${safeMapsUrl}"
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
        View pickup location on Google Maps
      </a>
    </p>
    <p style="margin: 0 0 16px; font-size: 12px; color: #6b7280; word-break: break-all;">
      ${safeMapsUrl}
    </p>
  `;
};

const buildPickupText = (vehicleAddress) => {
  const address = String(vehicleAddress || "").trim();
  if (!address) return "";
  const mapsUrl = buildMapsUrl(address);
  return `Pickup location:\n${address}\nView on Google Maps: ${mapsUrl}\n`;
};

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

const closingText = (footerNote = null) =>
  `Best regards,\nNova Rents Team${footerNote ? `\n\n${footerNote}` : ""}`;

// --- New rental request → vehicle owner (no pickup Maps link) ---
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
  vehicleAddress,
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
  const pickupText = buildPickupText(vehicleAddress);

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
      ${buildPickupHtml(vehicleAddress)}
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

module.exports = {
  sendOTPEmail,
  handleEmailVerification,
  sendComplaintResponseEmail,
  sendTestPaymentRequestEmail,
  sendTestPaymentReceiptEmail,
  sendOwnerPaymentReceivedEmail,
  sendRentalRequestEmail,
  sendRentalRejectedEmail,
};
