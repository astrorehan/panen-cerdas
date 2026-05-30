require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const log = require("./logger");
const predictRoute = require("./routes/predict");
const feedbackRoute = require("./routes/feedback");
const healthRoute = require("./routes/health");
const passthroughRoute = require("./routes/passthrough");

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || "127.0.0.1";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Behind a proxy/host (Render, etc.) so rate-limit reads the real client IP.
app.set("trust proxy", 1);

// Security headers. crossOriginResourcePolicy relaxed so the frontend on a
// different origin can still read JSON responses during the demo.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: [FRONTEND_URL, "http://127.0.0.1:3000"], credentials: true }));
app.use(express.json());

// Generous limit — protects against abuse without ever tripping a live demo.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
});
app.use("/api", apiLimiter);

app.use("/api/predict", predictRoute);
app.use("/api/feedback", feedbackRoute);
app.use("/api/health", healthRoute);

// Pemerintah dashboard endpoints — forward to FastAPI unchanged so frontend
// keeps a single base URL on :4200.
app.use("/api/dashboard", passthroughRoute);
app.use("/api/predictions", passthroughRoute);
app.use("/api/regions", passthroughRoute);
app.use("/api/weather", passthroughRoute);
app.use("/api/lahan", passthroughRoute);
app.use("/api/varieties", passthroughRoute);
app.use("/api/model", passthroughRoute);

app.get("/", (_req, res) => {
  res.json({
    service: "PanenCerdas Express Gateway",
    version: "0.1.0",
    status: "ok",
    ml_service: process.env.ML_SERVICE_URL || "http://localhost:8000",
  });
});

// 404 — unknown route returns clean JSON instead of Express' HTML default.
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

// Central error handler — never leak a stack trace to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  log.error("error", `${req.method} ${req.originalUrl} -> ${err.message}`);
  res.status(err.status || 500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  log.info("express", `listening on port ${PORT} (host ${HOST})`);
  log.info("express", `proxying ML at ${process.env.ML_SERVICE_URL || "http://localhost:8000"}`);
});
