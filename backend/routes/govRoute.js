const express = require("express");
const router = express.Router();
const govQueries = require("../services/govController");

router.get("/localities", govQueries.getLocalities);

module.exports = router;
