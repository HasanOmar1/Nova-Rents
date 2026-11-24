/** Express middleware for error concerns.
 * Validates or transforms requests before control reaches route handlers. */
const STATUS_CODE = require("../constants/statusCodes");

// Global error-handling middleware: formats errors into a unified JSON response
/** Formats unhandled Express errors as a consistent JSON response.
 * Accepts err, req, res, and next; returns the resulting error response. */
const errorHandler = (err, req, res, next) => {
  const statusCode =
    res.statusCode === STATUS_CODE.OK
      ? STATUS_CODE.INTERNAL_SERVER_ERROR
      : res.statusCode;

  res.status(statusCode);

  res.send({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
    ok: false,
    data: {},
  });
};

module.exports = errorHandler;
