// Express routes for user-related actions: register, login, profile, logout
const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleWare/authMiddleware");
const userQueries = require("../controllers/usersController");

router.get("/", userQueries.getAllUsers);
router.get("/details", userQueries.getUserDetailsByEmail);
router.post("/register", userQueries.register);
router.post("/login", userQueries.login);
router.get("/profile", isAuthenticated, userQueries.getProfile);
router.post("/logout", isAuthenticated, userQueries.logout);
router.post("/block", isAdmin, userQueries.blockUserByEmail);

module.exports = router;
