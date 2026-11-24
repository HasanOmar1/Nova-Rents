/** Express route definitions for payments endpoints.
 * Maps HTTP requests and access checks to the corresponding controllers. */
const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleWare/authMiddleware");
const paymentsController = require("../controllers/paymentsController");

router.get(
  "/:paymentToken",
  isAuthenticated,
  paymentsController.getPayment,
);
router.post(
  "/:paymentToken/pay",
  isAuthenticated,
  paymentsController.completeTestPayment,
);

module.exports = router;
