const express = require("express");
const axios = require("axios");

const router = express.Router();

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS) || 5000;

function buildFallback(body) {
  const landArea = Number(body?.land_area_ha) || 1;
  const yieldPerHa = 5;
  return {
    prediction_log_id: -1,
    harvest_days: 15,
    yield_ton_per_ha: yieldPerHa,
    total_yield_ton: yieldPerHa * landArea,
    risk_level: "medium",
    confidence: 0.5,
    recommendations: [
      "ML service tidak tersedia - menggunakan estimasi default.",
    ],
    climate_source: "fallback",
    ndvi_source: "fallback",
  };
}

router.post("/", async (req, res) => {
  try {
    const { data } = await axios.post(`${ML_URL}/api/predict`, req.body, {
      params: req.query,
      timeout: TIMEOUT_MS,
      headers: { "Content-Type": "application/json" },
    });
    res.json(data);
  } catch (err) {
    const isNetworkError =
      err.code === "ECONNREFUSED" ||
      err.code === "ENOTFOUND" ||
      err.code === "ECONNABORTED" ||
      !err.response;

    if (isNetworkError) {
      console.warn(`[predict] ML unreachable (${err.code || "no response"}) - returning fallback`);
      return res.json(buildFallback(req.body));
    }

    // ML returned an error (e.g., 422 validation). Surface upstream status + body.
    const status = err.response.status;
    console.warn(`[predict] ML returned ${status}`);
    res.status(status).json(err.response.data);
  }
});

module.exports = router;
