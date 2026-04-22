// Middleware to ensure the user is logged in before accessing protected routes
const STATUS_CODE = require("../constants/statusCodes");

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
module.exports = { isAuthenticated, isAdmin };
