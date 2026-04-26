const express = require("express");
const cors    = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ─── ROUTES ──────────────────────────────────────────────
app.use("/api", require("./routes/sportRoutes"));
app.use("/api", require("./routes/teamRoutes"));
app.use("/api", require("./routes/matchRoutes"));
app.use("/api", require("./routes/authRoutes"));

// ─── HEALTH CHECK ────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ message: "Sports Tournament Backend Running", version: "2.0" });
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));