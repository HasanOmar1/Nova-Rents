const STATUS_CODE = require("../constants/statusCodes");

// Global error-handling middleware: formats errors into a unified JSON response
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
