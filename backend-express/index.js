require("dotenv").config();
const express = require("express");
const cors = require("cors");

const predictRoute = require("./routes/predict");
const feedbackRoute = require("./routes/feedback");
const healthRoute = require("./routes/health");
const passthroughRoute = require("./routes/passthrough");

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || "127.0.0.1";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({ origin: [FRONTEND_URL, "http://127.0.0.1:3000"], credentials: true }));
app.use(express.json());

app.use("/api/predict", predictRoute);
app.use("/api/feedback", feedbackRoute);
app.use("/api/health", healthRoute);

// Pemerintah dashboard endpoints — forward to FastAPI unchanged so frontend
// keeps a single base URL on :4400.
app.use("/api/dashboard", passthroughRoute);
app.use("/api/predictions", passthroughRoute);
app.use("/api/regions", passthroughRoute);
app.use("/api/weather", passthroughRoute);

app.get("/", (_req, res) => {
  res.json({
    service: "PanenCerdas Express Gateway",
    version: "0.1.0",
    status: "ok",
    ml_service: process.env.ML_SERVICE_URL || "http://localhost:8000",
  });
});

app.listen(PORT, HOST, () => {
  console.log(`[express] listening on http://${HOST}:${PORT}`);
  console.log(`[express] proxying ML at ${process.env.ML_SERVICE_URL || "http://localhost:8000"}`);
});
