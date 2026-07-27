const STATUS_CODE = require("../constants/statusCodes");
const doQuery = require("../database/query");

const {
  getVehicleByLicensePlate,
} = require("../database/queries/vehicleQueries");

const {
  createComplaint,
  getComplaintsByUserId,
  getAllComplaints,
  countAllComplaints,
  getComplaintStats,
  updateComplaintStatus,
  getComplaintReporterById,
} = require("../database/queries/complaintQueries");

const { createActivity } = require("../database/queries/activityQueries");
const {
  createSystemHistory,
} = require("../database/queries/systemHistoryQueries");

const {
  validateAuthenticatedUser,
  validateComplaintFields,
} = require("../utils/validsController");

const { getUserByEmail } = require("../database/queries/userQueries");
const { sendComplaintResponseEmail } = require("../services/emailService");
async function createComplaint_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!")) {
      return;
    }

    const userId = req.session.user.userId;

    const {
      complaintType,
      vehicleLicensePlate,
      ownerEmail,
      title,
      description,
    } = req.body;

    const images =
      req.files && req.files.length > 0
        ? JSON.stringify(req.files.map((file) => file.filename))
        : null;

    if (!validateComplaintFields(req.body, res)) {
      return;
    }

    // Validate vehicle complaint
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

    // Validate owner complaint
    let resolvedOwnerId = null;

    if (complaintType === "owner") {
      const owner = await getUserByEmail(ownerEmail);

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

    // Create the complaint
    const result = await createComplaint(
      userId,
      complaintType,
      complaintType === "vehicle" ? vehicleLicensePlate : null,
      complaintType === "owner" ? resolvedOwnerId : null,
      title,
      description,
      images,
    );

    if (!result || result.affectedRows === 0) {
      return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({
        message: "Failed to create complaint",
      });
    }

    // Build readable user name
    const fullName = `${req.session.user.firstName || ""} ${
      req.session.user.lastName || ""
    }`.trim();
    
    const actorName = fullName
      ? `${fullName} (${req.session.user.email})`
      : req.session.user.email || "A user";

    // Choose "a" or "an"
    // vehicle -> a vehicle complaint
    // owner   -> an owner complaint
    const typeArticle = /^[aeiou]/i.test(complaintType) ? "an" : "a";

    const userActivityDescription = `You filed ${typeArticle} ${complaintType} complaint: ${title}`;

    const adminHistoryDescription = `${actorName} filed ${typeArticle} ${complaintType} complaint: ${title}`;

    // Personal user activity
    await createActivity(
      userId,
      "complaint_created",
      userActivityDescription,
      result.insertId,
    );

    // System-wide history for admin analytics
    await createSystemHistory(
      userId, // actorUserId
      "complaint", // category
      "create", // operation
      "complaint_created", // eventName
      "complaint", // entityType
      String(result.insertId), // entityId = complaint ID
      null, // rentalId
      complaintType === "vehicle" ? vehicleLicensePlate : null,
      adminHistoryDescription,
    );

    // Notify all admins
    const admins = await doQuery(
      "SELECT userId FROM users WHERE role = 'admin'",
    );

    for (const admin of admins) {
      await doQuery(
        `
          INSERT INTO notifications
          (userId, type, title, message)
          VALUES (?, ?, ?, ?)
        `,
        [
          admin.userId,
          "system",
          "New Complaint Received",
          adminHistoryDescription,
        ],
      );
    }

    return res.status(STATUS_CODE.CREATED).json({
      message: "Complaint submitted successfully",
      complaintId: result.insertId,
    });
  } catch (error) {
    next(error);
  }
}
async function updateComplaintStatus_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    if (req.session.user.role !== "admin") {
      return res
        .status(STATUS_CODE.FORBIDDEN)
        .json({ message: "You are not authorized to update complaint status" });
    }
    const complaintId = Number(req.params.complaintId);
    const { status, responseToUser } = req.body;

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

    if (typeof responseToUser !== "string" || !responseToUser.trim()) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "A response to the user is required",
      });
    }

    const complaint = await getComplaintReporterById(complaintId);
    if (!complaint) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "Complaint not found",
      });
    }

    const result = await updateComplaintStatus(
      complaintId,
      status,
      responseToUser.trim(),
    );

    if (result.affectedRows === 0) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "Complaint not found",
      });
    }

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

    await createSystemHistory(
      req.session.user.userId,
      "admin",
      statusOperation,
      statusEventName,
      "complaint",
      String(complaintId),
      null,
      null,
      `Complaint #${complaintId} status updated to ${status}`,
    );

    try {
      await sendComplaintResponseEmail({
        to: complaint.reporterEmail,
        firstName: complaint.reporterFirstName,
        complaintId: complaint.complaintId,
        complaintType: complaint.complaintType,
        complaintTitle: complaint.title,
        status,
        responseToUser: responseToUser.trim(),
        respondedAt: complaint?.respondedAt,
      });
    } catch (emailError) {
      console.error("Complaint response email could not be sent", {
        complaintId,
        errorCode: emailError.code || "EMAIL_SEND_FAILED",
      });

      return res.status(STATUS_CODE.OK).json({
        message: "Complaint updated, but the email could not be sent.",
        emailSent: false,
      });
    }

    return res.status(STATUS_CODE.OK).json({
      message: "Complaint updated and email sent successfully",
      emailSent: true,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyComplaints_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;

    const userId = req.session.user.userId;
    const complaints = await getComplaintsByUserId(userId);

    return res.status(STATUS_CODE.OK).json({
      message: "Complaints fetched successfully",
      count: complaints.length,
      complaints,
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

module.exports = {
  createComplaint_controller,
  updateComplaintStatus_controller,
  getMyComplaints_controller,
  getAllComplaints_controller,
};
