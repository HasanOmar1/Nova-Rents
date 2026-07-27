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

module.exports = {
  sendOTPEmail,
  handleEmailVerification,
  sendComplaintResponseEmail,
};
