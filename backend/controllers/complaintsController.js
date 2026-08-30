const STATUS_CODE = require("../constants/statusCodes");
const doQuery = require("../database/query");
const fs = require("fs");
const path = require("path");

const {
  getVehicleByLicensePlate,
} = require("../database/queries/vehicleQueries");

const {
  findEligibleRentalForVehicleReport,
  findEligibleRentalForVehicleReportOnConnection,
  findEligibleRentalForOwnerReport,
  findEligibleRentalForOwnerReportOnConnection,
  lockRentalRowForUpdate,
  findActiveComplaintForRentalTypeOnConnection,
  createComplaintOnConnection,
  getComplaintEvidenceById,
  getActiveVehicleComplaintsForOwner,
  getComplaintsAboutOwner,
  countComplaintsAboutOwner,
  getComplaintsAboutOwnerVehicles,
  countComplaintsAboutOwnerVehicles,
  getVehicleComplaintsForOwnerByPlate,
  getComplaintsByUserId,
  countComplaintsByUserId,
  getAllComplaints,
  countAllComplaints,
  getComplaintStats,
  updateComplaintStatusOnConnection,
  getComplaintReporterByIdForUpdateOnConnection,
  getComplaintRespondedAtOnConnection,
  getComplaintTrendsByRange,
} = require("../database/queries/complaintQueries");
const {
  COMPLAINT_EVIDENCE_DIR,
  UPLOADS_DIR,
  isSafeStoredImageName,
  parseStoredImageNames,
  safeMimeForStoredFile,
} = require("../utils/imageFile");
const { withTransaction } = require("../database/withTransaction");
const {
  parseLocalDate,
  resolveGranularity,
  buildPeriodKeys,
} = require("../utils/periodBuckets");

const {
  createActivityOnConnection,
} = require("../database/queries/activityQueries");
const {
  createSystemHistoryOnConnection,
} = require("../database/queries/systemHistoryQueries");

const {
  validateAuthenticatedUser,
  validateComplaintFields,
} = require("../utils/validsController");

const {
  getUserByEmail,
  getUserById,
} = require("../database/queries/userQueries");
const {
  createNotification,
} = require("../database/queries/notificationQueries");
const {
  sendComplaintResponseEmail,
  sendOwnerVehicleReportEmail,
  sendReportedOwnerReportEmail,
  sendReportedOwnerReportStatusEmail,
  sendOwnerVehicleReportStatusEmail,
} = require("../services/emailService");
const { clearFailedUploads } = require("../utils/handleUploads");

async function getVehicleLabelForOwnerNotice(licensePlate) {
  // Owner email/name from users join — never reporter identity.
  const rows = await doQuery(
    `
      SELECT
        v.ownerId,
        v.licensePlate,
        cb.brandName,
        cm.modelName,
        u.email AS ownerEmail,
        u.firstName AS ownerFirstName
      FROM vehicles v
      JOIN carmodels cm ON v.modelId = cm.modelId
      JOIN carbrands cb ON cm.brandId = cb.brandId
      JOIN users u ON u.userId = v.ownerId
      WHERE v.licensePlate = ?
      LIMIT 1
    `,
    [licensePlate],
  );
  return rows[0] || null;
}

function formatComplaintStatusLabel(status) {
  if (status === "in_review") return "In Review";
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

async function findStoredComplaintEvidence(filename) {
  for (const directory of [COMPLAINT_EVIDENCE_DIR, UPLOADS_DIR]) {
    const filePath = path.join(directory, filename);
    try {
      const stats = await fs.promises.stat(filePath);
      if (stats.isFile()) return filePath;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return null;
}

async function getComplaintEvidence_controller(req, res, next) {
  try {
    const complaintId = Number(req.params.complaintId);
    const filename = String(req.params.filename || "").trim();

    if (
      !Number.isInteger(complaintId) ||
      complaintId <= 0 ||
      !isSafeStoredImageName(filename)
    ) {
      return res.sendStatus(STATUS_CODE.NOT_FOUND);
    }

    const complaint = await getComplaintEvidenceById(complaintId);
    const sessionUser = req.session.user;
    const canViewEvidence =
      complaint &&
      (sessionUser.role === "admin" ||
        Number(complaint.userId) === Number(sessionUser.userId));

    const storedFilename = complaint
      ? parseStoredImageNames(complaint.images).find(
          (candidate) => candidate.toLowerCase() === filename.toLowerCase(),
        )
      : null;

    if (!canViewEvidence || !storedFilename) {
      return res.sendStatus(STATUS_CODE.NOT_FOUND);
    }

    const filePath = await findStoredComplaintEvidence(storedFilename);
    const safeMime = filePath ? safeMimeForStoredFile(filePath) : null;
    if (!filePath || !safeMime) {
      return res.sendStatus(STATUS_CODE.NOT_FOUND);
    }

    res.set({
      "Cache-Control": "private, no-store",
      "Content-Security-Policy":
        "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      "Content-Type": safeMime,
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
    });

    return res.sendFile(
      filePath,
      { acceptRanges: false, cacheControl: false, dotfiles: "deny" },
      (error) => {
        if (error) next(error);
      },
    );
  } catch (error) {
    return next(error);
  }
}

async function createComplaint_controller(req, res, next) {
  let complaintCommitted = false;
  let insertResult = null;

  try {
    if (
      validateAuthenticatedUser(req, res, "Unauthorized, Login first!") !==
      true
    ) {
      return;
    }

    // Identity always from the session — never from client body.
    const userId = req.session.user.userId;

    const {
      complaintType,
      vehicleLicensePlate,
      ownerEmail,
      ownerId,
      title,
      description,
      rentalId,
    } = req.body;

    const images =
      req.files && req.files.length > 0
        ? JSON.stringify(req.files.map((file) => file.filename))
        : null;

    if (validateComplaintFields(req.body, res) !== true) {
      return;
    }

    const parsedRentalId = Number(rentalId);

    // Validate vehicle complaint target exists / not own vehicle
    if (complaintType === "vehicle") {
      const vehicle = await getVehicleByLicensePlate(vehicleLicensePlate);

      if (!vehicle) {
        return res.status(STATUS_CODE.NOT_FOUND).json({
          message: "Vehicle not found",
        });
      }

      if (Number(vehicle.ownerId) === Number(userId)) {
        return res.status(STATUS_CODE.FORBIDDEN).json({
          message: "You cannot complain against your own vehicle",
        });
      }
    }

    // Validate owner complaint — prefer ownerId (stable, no email in URL);
    // ownerEmail remains supported for the manual complaint form.
    let resolvedOwnerId = null;

    if (complaintType === "owner") {
      let owner = null;

      if (ownerId) {
        const parsedOwnerId = Number(ownerId);
        if (!Number.isInteger(parsedOwnerId) || parsedOwnerId <= 0) {
          return res.status(STATUS_CODE.BAD_REQUEST).json({
            message: "Invalid owner ID",
          });
        }
        owner = await getUserById(parsedOwnerId);
      } else if (ownerEmail) {
        owner = await getUserByEmail(ownerEmail);
      }

      if (!owner) {
        return res.status(STATUS_CODE.NOT_FOUND).json({
          message: "Owner not found",
        });
      }

      resolvedOwnerId = owner.userId;

      if (Number(resolvedOwnerId) === Number(userId)) {
        return res.status(STATUS_CODE.FORBIDDEN).json({
          message: "You cannot complain against yourself",
        });
      }
    }

    // Fast eligibility check (session renter + paid rental + target match).
    // Authoritative re-check happens inside the transaction after FOR UPDATE.
    let eligibleRental = null;
    if (complaintType === "vehicle") {
      eligibleRental = await findEligibleRentalForVehicleReport(
        userId,
        parsedRentalId,
        vehicleLicensePlate,
      );
    } else {
      eligibleRental = await findEligibleRentalForOwnerReport(
        userId,
        parsedRentalId,
        resolvedOwnerId,
      );
    }

    if (!eligibleRental) {
      return res.status(STATUS_CODE.FORBIDDEN).json({
        message:
          "Reporting is only available after a paid rental with this target.",
      });
    }

    const plateForInsert =
      complaintType === "vehicle" ? eligibleRental.licensePlate : null;
    const ownerForInsert = complaintType === "owner" ? resolvedOwnerId : null;

    // Build the audit descriptions before the transaction so the complaint
    // and both required audit rows can be committed as one unit.
    const fullName = `${req.session.user.firstName || ""} ${
      req.session.user.lastName || ""
    }`.trim();

    const actorName = fullName
      ? `${fullName} (${req.session.user.email})`
      : req.session.user.email || "A user";

    const typeArticle = /^[aeiou]/i.test(complaintType) ? "an" : "a";
    const userActivityDescription =
      `You filed ${typeArticle} ${complaintType} complaint: ${title}`.slice(
        0,
        255,
      );
    const adminHistoryDescription =
      `${actorName} filed ${typeArticle} ${complaintType} complaint: ${title}`.slice(
        0,
        255,
      );

    try {
      insertResult = await withTransaction(async (connection) => {
        const lockedRental = await lockRentalRowForUpdate(
          connection,
          parsedRentalId,
        );
        if (!lockedRental) {
          const err = new Error("Rental not found");
          err.code = "RENTAL_NOT_FOUND";
          throw err;
        }

        // Re-validate paid relationship on the same connection after the lock.
        let stillEligible = null;
        if (complaintType === "vehicle") {
          stillEligible = await findEligibleRentalForVehicleReportOnConnection(
            connection,
            userId,
            parsedRentalId,
            plateForInsert,
          );
        } else {
          stillEligible = await findEligibleRentalForOwnerReportOnConnection(
            connection,
            userId,
            parsedRentalId,
            ownerForInsert,
          );
        }

        if (!stillEligible) {
          const err = new Error("Rental is no longer eligible for reporting");
          err.code = "RENTAL_NOT_ELIGIBLE";
          throw err;
        }

        const activeComplaint =
          await findActiveComplaintForRentalTypeOnConnection(
            connection,
            parsedRentalId,
            complaintType,
          );

        if (activeComplaint) {
          const err = new Error(
            "You already have an active report for this rental.",
          );
          err.code = "ACTIVE_COMPLAINT_EXISTS";
          throw err;
        }

        const result = await createComplaintOnConnection(
          connection,
          userId,
          parsedRentalId,
          complaintType,
          plateForInsert,
          ownerForInsert,
          title,
          description,
          images,
        );

        if (!result || result.affectedRows !== 1) {
          const err = new Error("Failed to create complaint");
          err.code = "COMPLAINT_INSERT_FAILED";
          throw err;
        }

        await createActivityOnConnection(
          connection,
          userId,
          "Created a Complaint",
          userActivityDescription,
          result.insertId,
        );

        await createSystemHistoryOnConnection(
          connection,
          userId,
          "complaint",
          "create",
          "Created a Complaint",
          "complaint",
          String(result.insertId),
          parsedRentalId,
          complaintType === "vehicle" ? plateForInsert : null,
          adminHistoryDescription,
        );

        return result;
      });
    } catch (txError) {
      if (txError.code === "ACTIVE_COMPLAINT_EXISTS") {
        return res.status(STATUS_CODE.CONFLICT).json({
          message: "You already have an active report for this rental.",
        });
      }
      if (
        txError.code === "RENTAL_NOT_FOUND" ||
        txError.code === "RENTAL_NOT_ELIGIBLE"
      ) {
        return res.status(STATUS_CODE.FORBIDDEN).json({
          message:
            "Reporting is only available after a paid rental with this target.",
        });
      }
      throw txError;
    }

    // From this point onward the complaint owns its evidence. Later activity,
    // notification, or email failures must never delete committed attachments.
    complaintCommitted = true;

    // Optional post-commit notifications and emails are best effort.
    try {
      const admins = await doQuery(
        "SELECT userId FROM users WHERE role = 'admin'",
      );

      for (const admin of admins) {
        await createNotification(
          admin.userId,
          parsedRentalId,
          "complaint_admin",
          "New Complaint Received",
          adminHistoryDescription.slice(0, 255),
        );
      }
    } catch (adminNotifyError) {
      // Admin delivery must never prevent notifying the reported user below.
      console.error(
        "Failed to notify admins about complaint:",
        adminNotifyError.message,
      );
    }

    // Vehicle complaints: notify the authoritative vehicle owner (DB ownerId).
    // In-app + email. Never include reporter identity.
    // Failure must not undo the committed complaint.
    if (complaintType === "vehicle" && plateForInsert != null) {
      try {
        const vehicleNotice =
          await getVehicleLabelForOwnerNotice(plateForInsert);
        if (vehicleNotice && vehicleNotice.ownerId) {
          const vehicleLabel = `${vehicleNotice.brandName} ${vehicleNotice.modelName}`;
          const reasonText = String(title || "").trim();
          const ownerMessage =
            `A report was submitted regarding your ${vehicleLabel} ` +
            `(plate ${vehicleNotice.licensePlate}). ` +
            `Reason: ${reasonText}. Status: Open. ` +
            `Nova Rents support will review the report.`;

          await createNotification(
            vehicleNotice.ownerId,
            parsedRentalId,
            "vehicle_report",
            "Vehicle Report Received",
            ownerMessage.slice(0, 255),
          );

          if (vehicleNotice.ownerEmail) {
            try {
              // DB-authoritative submitted time (set by MySQL on INSERT).
              const createdRows = await doQuery(
                `SELECT createdAt FROM complaints WHERE complaintId = ? LIMIT 1`,
                [insertResult.insertId],
              );
              const submittedAt = createdRows[0]?.createdAt ?? null;

              await sendOwnerVehicleReportEmail({
                to: vehicleNotice.ownerEmail,
                ownerFirstName: vehicleNotice.ownerFirstName,
                brandName: vehicleNotice.brandName,
                modelName: vehicleNotice.modelName,
                licensePlate: vehicleNotice.licensePlate,
                title: reasonText,
                description: String(description || "").trim(),
                submittedAt,
                complaintId: insertResult.insertId,
                rentalId: parsedRentalId,
              });
            } catch (emailError) {
              console.error(
                "Failed to email vehicle owner about complaint:",
                emailError.message,
              );
            }
          }
        }
      } catch (notifyError) {
        console.error(
          "Failed to notify vehicle owner about complaint:",
          notifyError.message,
        );
      }
    }

    // Owner complaints: notify the reported owner from the eligible rental's
    // vehicle.ownerId (authoritative). Never include reporter identity.
    // Failure must not undo the committed complaint.
    if (complaintType === "owner" && eligibleRental?.ownerId != null) {
      try {
        const reportedOwnerId = eligibleRental.ownerId;
        const reportedOwner = await getUserById(reportedOwnerId);
        if (reportedOwner?.userId) {
          const reasonText = String(title || "").trim();
          const ownerMessage =
            `A report was submitted regarding your account. ` +
            `Reason: ${reasonText}. Status: Open. ` +
            `Nova Rents support will review the report.`;

          await createNotification(
            reportedOwner.userId,
            parsedRentalId,
            "owner_report",
            "Account Report Received",
            ownerMessage.slice(0, 255),
          );

          if (reportedOwner.email) {
            try {
              const createdRows = await doQuery(
                `SELECT createdAt FROM complaints WHERE complaintId = ? LIMIT 1`,
                [insertResult.insertId],
              );
              const submittedAt = createdRows[0]?.createdAt ?? null;

              await sendReportedOwnerReportEmail({
                to: reportedOwner.email,
                ownerFirstName: reportedOwner.firstName,
                title: reasonText,
                description: String(description || "").trim(),
                submittedAt,
                complaintId: insertResult.insertId,
                rentalId: parsedRentalId,
              });
            } catch (emailError) {
              console.error(
                "Failed to email reported owner about complaint:",
                emailError.message,
              );
            }
          }
        }
      } catch (notifyError) {
        console.error(
          "Failed to notify reported owner about complaint:",
          notifyError.message,
        );
      }
    }

    return res.status(STATUS_CODE.CREATED).json({
      message: "Complaint submitted successfully",
      complaintId: insertResult.insertId,
    });
  } catch (error) {
    if (complaintCommitted && !res.headersSent) {
      console.error(
        "Complaint follow-up failed after commit:",
        error.message,
      );
      return res.status(STATUS_CODE.CREATED).json({
        message:
          "Complaint submitted successfully, but some notifications could not be completed.",
        complaintId: insertResult.insertId,
      });
    }
    return next(error);
  } finally {
    if (!complaintCommitted) {
      clearFailedUploads(req.files);
    }
  }
}
async function updateComplaintStatus_controller(req, res, next) {
  let statusUpdateCommitted = false;
  let committedStatusChanged = false;

  try {
    if (
      validateAuthenticatedUser(req, res, "Unauthorized, Login first!") !==
      true
    )
      return;
    if (req.session.user.role !== "admin") {
      return res
        .status(STATUS_CODE.FORBIDDEN)
        .json({ message: "You are not authorized to update complaint status" });
    }
    const complaintId = Number(req.params.complaintId);
    const { status, responseToUser, resolutionMessage, adminNotes } = req.body;

    const allowedStatuses = ["open", "in_review", "resolved", "closed"];

    if (!Number.isInteger(complaintId) || complaintId <= 0) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid complaint ID",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid complaint status",
      });
    }

    // Public resolution: prefer resolutionMessage; accept legacy responseToUser.
    const rawResolution =
      typeof resolutionMessage === "string"
        ? resolutionMessage
        : typeof responseToUser === "string"
          ? responseToUser
          : "";

    // Terminal statuses need a public decision; in_review / open may omit it.
    const requiresResolution = status === "resolved" || status === "closed";
    if (requiresResolution && !rawResolution.trim()) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message:
          "A response to the user / resolution is required when resolving or closing a complaint",
      });
    }

    const trimmedResolution = rawResolution.trim();
    const trimmedAdminNotes =
      typeof adminNotes === "string" ? adminNotes.trim() : "";

    let statusEventName = "complaint_status_updated";
    let statusOperation = "update";
    if (status === "in_review") {
      statusEventName = "complaint_moved_to_review";
    } else if (status === "resolved") {
      statusEventName = "complaint_resolved";
      statusOperation = "resolve";
    } else if (status === "closed") {
      statusEventName = "complaint_closed";
    }

    let mutation;
    try {
      mutation = await withTransaction(async (connection) => {
        const complaint = await getComplaintReporterByIdForUpdateOnConnection(
          connection,
          complaintId,
        );
        if (!complaint) {
          const error = new Error("Complaint not found");
          error.code = "COMPLAINT_NOT_FOUND";
          throw error;
        }

        const statusChanged = complaint.status !== status;
        const result = await updateComplaintStatusOnConnection(
          connection,
          complaintId,
          status,
          trimmedResolution || null,
          trimmedAdminNotes || null,
        );

        if (!result || result.affectedRows !== 1) {
          const error = new Error("Complaint not found");
          error.code = "COMPLAINT_NOT_FOUND";
          throw error;
        }

        await createSystemHistoryOnConnection(
          connection,
          req.session.user.userId,
          "admin",
          statusOperation,
          statusEventName,
          "complaint",
          String(complaintId),
          null,
          null,
          `Complaint #${complaintId} status updated to ${status}`.slice(
            0,
            255,
          ),
        );

        const respondedAt = await getComplaintRespondedAtOnConnection(
          connection,
          complaintId,
        );

        return { complaint, respondedAt, statusChanged };
      });
    } catch (transactionError) {
      if (transactionError.code === "COMPLAINT_NOT_FOUND") {
        return res.status(STATUS_CODE.NOT_FOUND).json({
          message: "Complaint not found",
        });
      }
      throw transactionError;
    }

    statusUpdateCommitted = true;
    committedStatusChanged = mutation.statusChanged;
    const { complaint, respondedAt, statusChanged } = mutation;

    // Lifecycle side effects only on an actual status transition.
    // Same-status resubmit may still update adminNotes/respondedAt above,
    // but must not resend notifications or emails.
    if (!statusChanged) {
      return res.status(STATUS_CODE.OK).json({
        message:
          "Complaint updated. No status-change email sent (status unchanged).",
        emailSent: false,
        statusChanged: false,
      });
    }

    // In-app notifications (statusChanged === true).
    // Failure must not undo the DB update.
    let vehicleNotice = null;
    let reportedOwner = null;
    try {
      const statusLabel = formatComplaintStatusLabel(status);
      const rentalIdForNotify = complaint.rentalId ?? null;
      const safeTitle = String(complaint.title || "your complaint").trim();

      let reporterNotifMessage = `Your complaint #${complaintId} ("${safeTitle}") is now ${statusLabel}.`;
      if (trimmedResolution) {
        reporterNotifMessage += ` Admin response: ${trimmedResolution}`;
      }

      await createNotification(
        complaint.reporterId,
        rentalIdForNotify,
        "complaint_update",
        "Complaint Status Updated",
        reporterNotifMessage.slice(0, 255),
      );

      if (
        complaint.complaintType === "vehicle" &&
        complaint.vehicleLicensePlate != null
      ) {
        vehicleNotice = await getVehicleLabelForOwnerNotice(
          complaint.vehicleLicensePlate,
        );
        if (
          vehicleNotice?.ownerId &&
          vehicleNotice.ownerId !== complaint.reporterId
        ) {
          const vehicleLabel = `${vehicleNotice.brandName} ${vehicleNotice.modelName}`;
          let ownerNotifMessage = `Vehicle report updated — ${vehicleLabel}.`;
          if (status === "in_review") {
            ownerNotifMessage = `Vehicle report under review — ${vehicleLabel}.`;
          } else if (status === "resolved") {
            ownerNotifMessage =
              `Vehicle report resolved — ${vehicleLabel}. ` +
              `Nova Rents completed the review.`;
          } else if (status === "closed") {
            ownerNotifMessage =
              `Vehicle report closed — ${vehicleLabel}. ` +
              `Nova Rents closed the case.`;
          }

          await createNotification(
            vehicleNotice.ownerId,
            rentalIdForNotify,
            "vehicle_report",
            "Vehicle Report Updated",
            ownerNotifMessage.slice(0, 255),
          );
        }
      }

      if (
        complaint.complaintType === "owner" &&
        complaint.ownerId != null &&
        Number(complaint.ownerId) !== Number(complaint.reporterId)
      ) {
        reportedOwner = await getUserById(complaint.ownerId);
        if (reportedOwner?.userId) {
          let reportedNotifMessage = "Account report updated.";
          if (status === "in_review") {
            reportedNotifMessage =
              "Account report under review. Nova Rents started the review.";
          } else if (status === "resolved") {
            reportedNotifMessage =
              "Account report resolved. Nova Rents completed the review.";
          } else if (status === "closed") {
            reportedNotifMessage =
              "Account report closed. Nova Rents closed the case.";
          }

          await createNotification(
            reportedOwner.userId,
            rentalIdForNotify,
            "owner_report",
            "Account Report Updated",
            reportedNotifMessage.slice(0, 255),
          );
        }
      }
    } catch (notifyError) {
      console.error(
        "Failed to send complaint status notifications:",
        notifyError.message,
      );
    }

    let emailSent = false;
    try {
      await sendComplaintResponseEmail({
        to: complaint.reporterEmail,
        firstName: complaint.reporterFirstName,
        complaintId: complaint.complaintId,
        complaintType: complaint.complaintType,
        complaintTitle: complaint.title,
        status,
        responseToUser: trimmedResolution,
        respondedAt,
      });
      emailSent = true;
    } catch (emailError) {
      console.error("Complaint response email could not be sent", {
        complaintId,
        errorCode: emailError.code || "EMAIL_SEND_FAILED",
      });
    }

    // Vehicle-owner lifecycle email (no reporter identity).
    // Controller requires resolution for resolved/closed only.
    if (
      complaint.complaintType === "vehicle" &&
      complaint.vehicleLicensePlate != null &&
      ["in_review", "resolved", "closed"].includes(status)
    ) {
      try {
        if (!vehicleNotice) {
          vehicleNotice = await getVehicleLabelForOwnerNotice(
            complaint.vehicleLicensePlate,
          );
        }
        if (
          vehicleNotice?.ownerEmail &&
          vehicleNotice.ownerId !== complaint.reporterId
        ) {
          await sendOwnerVehicleReportStatusEmail({
            to: vehicleNotice.ownerEmail,
            ownerFirstName: vehicleNotice.ownerFirstName,
            brandName: vehicleNotice.brandName,
            modelName: vehicleNotice.modelName,
            licensePlate: vehicleNotice.licensePlate,
            title: complaint.title,
            status,
            resolutionMessage: trimmedResolution,
            respondedAt,
            complaintId: complaint.complaintId,
            rentalId: complaint.rentalId ?? null,
          });
        }
      } catch (ownerEmailError) {
        console.error(
          "Failed to email vehicle owner about complaint status:",
          ownerEmailError.message,
        );
      }
    }

    // Reported-owner lifecycle email for owner complaints (no reporter identity).
    if (
      complaint.complaintType === "owner" &&
      complaint.ownerId != null &&
      Number(complaint.ownerId) !== Number(complaint.reporterId) &&
      ["in_review", "resolved", "closed"].includes(status)
    ) {
      try {
        if (!reportedOwner) {
          reportedOwner = await getUserById(complaint.ownerId);
        }
        if (reportedOwner?.email) {
          await sendReportedOwnerReportStatusEmail({
            to: reportedOwner.email,
            ownerFirstName: reportedOwner.firstName,
            title: complaint.title,
            status,
            resolutionMessage: trimmedResolution,
            respondedAt,
            complaintId: complaint.complaintId,
            rentalId: complaint.rentalId ?? null,
          });
        }
      } catch (reportedOwnerEmailError) {
        console.error(
          "Failed to email reported owner about complaint status:",
          reportedOwnerEmailError.message,
        );
      }
    }

    if (!emailSent) {
      return res.status(STATUS_CODE.OK).json({
        message: "Complaint updated, but the email could not be sent.",
        emailSent: false,
        statusChanged: true,
      });
    }

    return res.status(STATUS_CODE.OK).json({
      message: "Complaint updated and email sent successfully",
      emailSent: true,
      statusChanged: true,
    });
  } catch (error) {
    if (statusUpdateCommitted && !res.headersSent) {
      console.error(
        "Complaint status follow-up failed after commit:",
        error.message,
      );
      return res.status(STATUS_CODE.OK).json({
        message:
          "Complaint updated, but some follow-up actions could not be completed.",
        emailSent: false,
        statusChanged: committedStatusChanged,
      });
    }
    return next(error);
  }
}

async function getMyComplaints_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;

    // Identity always from the session — never from client params.
    const userId = req.session.user.userId;
    const { startDate, endDate } = req.query;
    const status = req.query.status || "all";
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const offset = (page - 1) * limit;

    const allowedStatuses = ["all", "open", "in_review", "resolved", "closed"];
    if (!allowedStatuses.includes(status)) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid complaint status",
      });
    }

    if (!startDate || !endDate) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "startDate and endDate are required",
      });
    }

    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);

    if (!start || !end) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid date format, use YYYY-MM-DD",
      });
    }

    if (start > end) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "startDate must be before endDate",
      });
    }

    const filters = { status, startDate, endDate, limit, offset };
    const complaints = await getComplaintsByUserId(userId, filters);
    const totalComplaints = await countComplaintsByUserId(userId, {
      status,
      startDate,
      endDate,
    });

    return res.status(STATUS_CODE.OK).json({
      message: "Complaints fetched successfully",
      complaints,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalComplaints / limit) || 1,
        totalComplaints,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getAllComplaints_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;

    if (req.session.user.role !== "admin") {
      return res.status(STATUS_CODE.FORBIDDEN).json({
        message: "Admin access only",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;
    const status = req.query.status || "all";

    const complaints = await getAllComplaints(status, limit, offset);
    const totalComplaints = await countAllComplaints(status);
    const stats = await getComplaintStats();

    return res.status(STATUS_CODE.OK).json({
      message: "Complaints fetched successfully",
      complaints,
      stats,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalComplaints / limit),
        totalComplaints,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Complaints submitted over time (by createdAt), zero-filled per period,
// for the admin Complaint Trends chart. Uses the same bucketing policy as
// the other report charts. Not affected by pagination.
async function getComplaintTrends_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;

    if (req.session.user.role !== "admin") {
      return res.status(STATUS_CODE.FORBIDDEN).json({
        message: "Admin access only",
      });
    }

    const { startDate, endDate } = req.query;
    const status = req.query.status || "all";

    if (!startDate || !endDate) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "startDate and endDate are required",
      });
    }

    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);

    if (!start || !end) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid date format, use YYYY-MM-DD",
      });
    }

    if (start > end) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "startDate must be before endDate",
      });
    }

    const { granularity, dateFormat } = resolveGranularity(start, end);

    const rows = await getComplaintTrendsByRange(
      startDate,
      endDate,
      status,
      dateFormat,
    );

    const countsByPeriod = new Map(
      rows.map((row) => [row.periodKey, Number(row.complaints)]),
    );
    const chartData = buildPeriodKeys(start, end, granularity).map(
      (period) => ({
        period,
        complaints: countsByPeriod.get(period) || 0,
      }),
    );

    return res.status(STATUS_CODE.OK).json({
      message: "Complaint trends fetched successfully",
      granularity,
      chartData,
    });
  } catch (error) {
    next(error);
  }
}

async function getOwnerVehicleReports_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!")) {
      return;
    }

    // Owner scope always from session — never from client ownerId.
    const ownerId = req.session.user.userId;
    const reports = await getActiveVehicleComplaintsForOwner(ownerId);

    return res.status(STATUS_CODE.OK).json({
      message: "Active vehicle reports fetched successfully",
      count: reports.length,
      reports,
    });
  } catch (error) {
    next(error);
  }
}

async function getOwnerVehicleReportHistory_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!")) {
      return;
    }

    const licensePlate = String(req.params.licensePlate || "").trim();
    if (!/^\d{7,8}$/.test(licensePlate)) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Enter a valid Israeli license plate (7 or 8 digits).",
      });
    }

    // Ownership always comes from the session and is enforced in the query.
    const ownerId = req.session.user.userId;
    const reports = await getVehicleComplaintsForOwnerByPlate(
      ownerId,
      licensePlate,
    );

    return res.status(STATUS_CODE.OK).json({
      message: "Vehicle report history fetched successfully",
      count: reports.length,
      reports,
    });
  } catch (error) {
    next(error);
  }
}

async function getComplaintsAboutMe_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!")) {
      return;
    }

    // Reported-owner scope always from session — never from client ownerId.
    const ownerId = req.session.user.userId;
    const parsedPage = Number.parseInt(req.query.page, 10);
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const requestedPage = parsedPage > 0 ? parsedPage : 1;
    const limit = parsedLimit > 0 ? Math.min(parsedLimit, 50) : 5;

    const totalReports = await countComplaintsAboutOwner(ownerId);
    const totalPages = Math.max(Math.ceil(totalReports / limit), 1);
    const currentPage = Math.min(requestedPage, totalPages);
    const offset = (currentPage - 1) * limit;
    const reports = await getComplaintsAboutOwner(ownerId, { limit, offset });

    return res.status(STATUS_CODE.OK).json({
      message: "Reports about you fetched successfully",
      count: totalReports,
      reports,
      pagination: {
        currentPage,
        totalPages,
        totalReports,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getComplaintsAboutMyVehicles_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!")) {
      return;
    }

    // Vehicle-owner scope always comes from the session. Never accept an
    // ownerId or license plate from the client for this history endpoint.
    const ownerId = req.session.user.userId;
    const parsedPage = Number.parseInt(req.query.page, 10);
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const requestedPage = parsedPage > 0 ? parsedPage : 1;
    const limit = parsedLimit > 0 ? Math.min(parsedLimit, 50) : 5;

    const totalReports = await countComplaintsAboutOwnerVehicles(ownerId);
    const totalPages = Math.max(Math.ceil(totalReports / limit), 1);
    const currentPage = Math.min(requestedPage, totalPages);
    const offset = (currentPage - 1) * limit;
    const reports = await getComplaintsAboutOwnerVehicles(ownerId, {
      limit,
      offset,
    });

    return res.status(STATUS_CODE.OK).json({
      message: "Reports about your vehicles fetched successfully",
      count: totalReports,
      reports,
      pagination: {
        currentPage,
        totalPages,
        totalReports,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createComplaint_controller,
  getComplaintEvidence_controller,
  updateComplaintStatus_controller,
  getMyComplaints_controller,
  getAllComplaints_controller,
  getComplaintTrends_controller,
  getOwnerVehicleReports_controller,
  getOwnerVehicleReportHistory_controller,
  getComplaintsAboutMe_controller,
  getComplaintsAboutMyVehicles_controller,
};
