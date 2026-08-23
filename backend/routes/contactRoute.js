const express = require("express");
const { isAuthenticated, isUser } = require("../middleWare/authMiddleware");
const { sendContactMessage } = require("../controllers/contactController");

const router = express.Router();

router.post("/", isAuthenticated, isUser, sendContactMessage);

module.exports = router;
