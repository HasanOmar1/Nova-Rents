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
  validateAuthenticatedUser,
  validateComplaintFields,
} = require("../utils/validsController");

const { getUserByEmail } = require("../database/queries/userQueries");
const { sendComplaintResponseEmail } = require("../services/emailService");

async function createComplaint_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;

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

    if (!validateComplaintFields(req.body, res)) return;

    if (complaintType === "vehicle") {
      const vehicle = await getVehicleByLicensePlate(vehicleLicensePlate);

      if (!vehicle) {
        return res
          .status(STATUS_CODE.NOT_FOUND)
          .json({ message: "Vehicle not found" });
      }

      if (vehicle.ownerId === userId) {
        return res
          .status(STATUS_CODE.FORBIDDEN)
          .json({ message: "You cannot complain against your own vehicle" });
      }
    }

    let resolvedOwnerId = null;
    if (complaintType === "owner") {
      const ownerRows = await getUserByEmail(ownerEmail);
      if (!ownerRows) {
        return res
          .status(STATUS_CODE.NOT_FOUND)
          .json({ message: "Owner not found" });
      }
      resolvedOwnerId = ownerRows.userId;
      if (Number(resolvedOwnerId) === Number(userId)) {
        return res
          .status(STATUS_CODE.FORBIDDEN)
          .json({ message: "You cannot complain against yourself" });
      }
    }

    const result = await createComplaint(
      userId,
      complaintType,
      complaintType === "vehicle" ? vehicleLicensePlate : null,
      complaintType === "owner" ? resolvedOwnerId : null,
      title,
      description,
      images,
    );

    if (result.affectedRows === 0) {
      return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({
        message: "Failed to create complaint",
      });
    }

    await createActivity(
      userId,
      "complaint_created",
      `Filed ${complaintType} complaint: ${title}`,
    );

    // --- NEW: Notify all Admins ---
    const admins = await doQuery(
      "SELECT userId FROM users WHERE role = 'admin'",
    );
    for (let admin of admins) {
      await doQuery(
        "INSERT INTO notifications (userId, type, title, message) VALUES (?, ?, ?, ?)",
        [
          admin.userId,
          "system",
          "New Complaint Received",
          `A new ${complaintType} complaint requires your review.`,
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
