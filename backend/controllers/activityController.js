const {
  getActivitiesByUserId,
} = require("../database/queries/activityQueries");
const STATUS_CODE = require("../constants/statusCodes");
const { validateAuthenticatedUser } = require("../utils/validsController");


async function getActivitiesByUserId_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const userId = req.session.user.userId;
    const activities = await getActivitiesByUserId(userId);
    return res.status(STATUS_CODE.OK).json({
      message: "Activities fetched successfully",
      count: activities.length,
      activities,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getActivitiesByUserId_controller };
