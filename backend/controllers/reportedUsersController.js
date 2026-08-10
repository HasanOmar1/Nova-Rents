const STATUS_CODE = require("../constants/statusCodes");
const { withTransaction } = require("../database/withTransaction");
const {
  getReportedUsers, getReportsForUser, getWarningHistory, lockTargetUser,
  countWarningsOnConnection, insertWarningOnConnection, blockUserOnConnection,
  removeLatestWarningOnConnection,
} = require("../database/queries/reportedUserQueries");
const { createNotification } = require("../database/queries/notificationQueries");
const { createActivity } = require("../database/queries/activityQueries");
const { createSystemHistory } = require("../database/queries/systemHistoryQueries");
const { sendAccountWarningEmail } = require("../services/emailService");

const VALID_ACCOUNT_STATUSES = new Set(["all", "active", "blocked"]);
const VALID_COMPLAINT_STATUSES = new Set(["all", "open", "in_review", "resolved", "closed"]);
const validId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
const validDate = (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);

async function listReportedUsers(req, res, next) {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
    const accountStatus = req.query.accountStatus || "all";
    const complaintStatus = req.query.complaintStatus || "all";
    const search = String(req.query.search || "").trim().slice(0, 100);
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;
    if (!VALID_ACCOUNT_STATUSES.has(accountStatus) || !VALID_COMPLAINT_STATUSES.has(complaintStatus) ||
        !validDate(startDate) || !validDate(endDate) || (startDate && endDate && startDate > endDate)) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({ message: "Invalid filters" });
    }
    const { rows, total } = await getReportedUsers({ page, limit, search, accountStatus, complaintStatus, startDate, endDate });
    return res.status(STATUS_CODE.OK).json({ users: rows, pagination: {
      currentPage: page, totalPages: Math.max(Math.ceil(total / limit), 1), totalUsers: total, limit,
    }});
  } catch (error) { next(error); }
}

async function listUserReports(req, res, next) {
  try {
    if (!validId(req.params.userId)) return res.status(STATUS_CODE.BAD_REQUEST).json({ message: "Invalid user ID" });
    const reports = await getReportsForUser(Number(req.params.userId));
    return res.status(STATUS_CODE.OK).json({ reports });
  } catch (error) { next(error); }
}

async function listWarnings(req, res, next) {
  try {
    if (!validId(req.params.userId)) return res.status(STATUS_CODE.BAD_REQUEST).json({ message: "Invalid user ID" });
    const warnings = await getWarningHistory(Number(req.params.userId));
    return res.status(STATUS_CODE.OK).json({ warnings });
  } catch (error) { next(error); }
}

async function warnUser(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const adminId = Number(req.session.user.userId);
    const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
    if (!validId(userId) || !validId(adminId)) return res.status(STATUS_CODE.BAD_REQUEST).json({ message: "Invalid user ID" });
    if (reason.length < 5 || reason.length > 500) return res.status(STATUS_CODE.BAD_REQUEST).json({ message: "Reason must be 5-500 characters" });

    const result = await withTransaction(async (connection) => {
      const user = await lockTargetUser(connection, userId);
      if (!user) { const error = new Error("User not found"); error.status = STATUS_CODE.NOT_FOUND; throw error; }
      if (user.role === "admin") { const error = new Error("Administrators cannot be warned"); error.status = STATUS_CODE.FORBIDDEN; throw error; }
      const currentCount = await countWarningsOnConnection(connection, userId);
      if (currentCount >= 3) { const error = new Error("This user already has the maximum of 3 warnings"); error.status = STATUS_CODE.CONFLICT; throw error; }
      await insertWarningOnConnection(connection, userId, adminId, reason);
      const warningCount = currentCount + 1;
      const blocked = warningCount === 3;
      if (blocked) await blockUserOnConnection(connection, userId);
      return { user, warningCount, blocked };
    });

    const title = result.blocked ? "Account Blocked" : "Account Warning";
    const message = result.blocked
      ? "Your account has reached 3 warnings and has been blocked."
      : `Your account received warning ${result.warningCount}/3. Accounts with 3 warnings are blocked.`;
    await createNotification(userId, null, "system", title, message);
    await createActivity(adminId, "Warned User", `Warning issued to user ${userId}: ${reason}`.slice(0, 255), userId);
    await createSystemHistory(adminId, "user", "update", "user_warned", "user", String(userId), null, null,
      `Warning ${result.warningCount}/3 issued to user ${userId}: ${reason}`.slice(0, 255));
    if (result.blocked) await createSystemHistory(adminId, "user", "block", "user_blocked_after_warnings", "user",
      String(userId), null, null, "User automatically blocked after third warning");

    let emailSent = true;
    try {
      await sendAccountWarningEmail({ to: result.user.email, firstName: result.user.firstName, reason,
        warningCount: result.warningCount, blocked: result.blocked });
    } catch (emailError) {
      emailSent = false;
      console.error(`[email] Warning saved for user ${userId}, but delivery failed:`, emailError.message);
    }
    return res.status(STATUS_CODE.CREATED).json({ message: result.blocked ? "Third warning issued; user blocked" : "Warning issued",
      warningCount: result.warningCount, blocked: result.blocked, emailSent });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
}

async function removeLatestWarning(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const adminId = Number(req.session.user.userId);
    if (!validId(userId) || !validId(adminId)) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({ message: "Invalid user ID" });
    }

    const removed = await withTransaction(async (connection) => {
      const user = await lockTargetUser(connection, userId);
      if (!user) { const error = new Error("User not found"); error.status = STATUS_CODE.NOT_FOUND; throw error; }
      if (user.role === "admin") { const error = new Error("Administrator warnings cannot be changed"); error.status = STATUS_CODE.FORBIDDEN; throw error; }
      const warning = await removeLatestWarningOnConnection(connection, userId, adminId);
      if (!warning) { const error = new Error("This user has no warnings to remove"); error.status = STATUS_CODE.CONFLICT; throw error; }
      const warningCount = await countWarningsOnConnection(connection, userId);
      return { warning, warningCount };
    });

    await createActivity(adminId, "Removed User Warning", `Removed warning ${removed.warning.warningId} from user ${userId}`,
      userId);
    await createSystemHistory(adminId, "user", "update", "user_warning_removed", "user", String(userId), null, null,
      `Removed warning ${removed.warning.warningId} from user ${userId}`);
    return res.status(STATUS_CODE.OK).json({
      message: "Latest warning removed successfully",
      warningCount: removed.warningCount,
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
}

module.exports = { listReportedUsers, listUserReports, listWarnings, warnUser, removeLatestWarning };
