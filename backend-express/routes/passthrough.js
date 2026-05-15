const express = require("express");
const axios = require("axios");

const router = express.Router({ mergeParams: true });

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS) || 20000;

router.all(/.*/, async (req, res) => {
  const upstreamPath = req.baseUrl + (req.path === "/" ? "" : req.path);
  const url = `${ML_URL}${upstreamPath}`;
  try {
    const upstream = await axios({
      method: req.method,
      url,
      params: req.query,
      data: ["GET", "HEAD", "DELETE"].includes(req.method) ? undefined : req.body,
      timeout: TIMEOUT_MS,
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
    });
    res.status(upstream.status).json(upstream.data);
  } catch (err) {
    console.warn(
      `[passthrough] ${req.method} ${url} -> ${err.code || err.message}`,
    );
    res.status(502).json({
      error: "ML service unreachable",
      code: err.code || null,
      detail: err.message,
    });
  }
});

module.exports = router;
