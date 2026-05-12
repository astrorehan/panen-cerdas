const express = require("express");
const axios = require("axios");

const router = express.Router();

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

router.get("/", async (_req, res) => {
  let mlStatus = "down";
  let mlDetail = null;
  try {
    const { data } = await axios.get(`${ML_URL}/api/health`, { timeout: 2000 });
    mlStatus = data?.status === "healthy" ? "ok" : "degraded";
    mlDetail = data;
  } catch (err) {
    mlDetail = { error: err.code || err.message };
  }
  res.json({
    express: "ok",
    ml: mlStatus,
    ml_service_url: ML_URL,
    ml_detail: mlDetail,
  });
});

module.exports = router;
