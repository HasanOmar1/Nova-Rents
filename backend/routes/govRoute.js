const express = require("express");
const router = express.Router();
const govQueries = require("../controllers/govController");

router.get("/cities", govQueries.getCities);

module.exports = router;
