// Express routes for user-related actions: register, login, profile, logout
const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin } = require("../middleWare/authMiddleware");
const userQueries = require("../controllers/usersController");

router.get("/", userQueries.getAllUsers);
router.get("/details", isAuthenticated, userQueries.getUserDetailsByEmail);
router.post("/register", userQueries.register);
router.post("/login", userQueries.login);
router.get("/profile", isAuthenticated, userQueries.getProfile);
router.post("/logout", isAuthenticated, userQueries.logout);
router.post("/block/:email", isAdmin, userQueries.blockUserByEmail);
router.post("/unblock/:email", isAdmin, userQueries.unblockUserByEmail);
router.put("/profile", isAuthenticated, userQueries.updateUserProfile);
// router.post("/verify-code", isAuthenticated, userQueries.verifyCode);
module.exports = router;
