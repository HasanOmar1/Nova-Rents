const express = require("express");
const router = express.Router();
const govQueries = require("../controllers/govController");

router.get("/localities", govQueries.getLocalities);

module.exports = router;
