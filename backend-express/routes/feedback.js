const express = require("express");
const axios = require("axios");

const router = express.Router();

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS) || 5000;

router.post("/", async (req, res) => {
  try {
    const { data } = await axios.post(`${ML_URL}/feedback`, req.body, {
      timeout: TIMEOUT_MS,
      headers: { "Content-Type": "application/json" },
    });
    res.json(data);
  } catch (err) {
    if (!err.response) {
      console.warn(`[feedback] ML unreachable (${err.code || "no response"})`);
      return res.status(503).json({
        status: "error",
        message: "Feedback tidak tersimpan - ML service tidak tersedia. Coba lagi nanti.",
      });
    }
    res.status(err.response.status).json(err.response.data);
  }
});

module.exports = router;
