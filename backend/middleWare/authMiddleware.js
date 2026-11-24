/** Express middleware for auth concerns.
 * Validates or transforms requests before control reaches route handlers. */
// Middleware to ensure the user is logged in before accessing protected routes
const STATUS_CODE = require("../constants/statusCodes");

/** Checks whether authenticated.
 * Accepts req, res, and next; returns a response or delegates to the next middleware. */
const isAuthenticated = (req, res, next) => {
  console.log(req.session);
  if (req.session.user) {
    return next();
  } else {
    console.error("User not logged in");
    return res
      .status(STATUS_CODE.UNAUTHORIZED)
      .json({ message: "Login to do this action!" });
  }
};

/** Checks whether admin.
 * Accepts req, res, and next; returns a response or delegates to the next middleware. */
const isAdmin = (req, res, next) => {
  console.log(req.session);
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  } else {
    console.error("User not logged in");
    return res
      .status(STATUS_CODE.UNAUTHORIZED)
      .json({ message: "You must be an admin to do this action!" });
  }
};

/** Checks whether user.
 * Accepts req, res, and next; returns a response or delegates to the next middleware. */
const isUser = (req, res, next) => {
  if (req.session.user?.role === "user") {
    return next();
  }

  return res
    .status(STATUS_CODE.FORBIDDEN)
    .json({ message: "Only user accounts can rent vehicles." });
};

module.exports = { isAuthenticated, isAdmin, isUser };
