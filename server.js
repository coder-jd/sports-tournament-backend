const express = require("express");
const cors    = require("cors");

const sportRoutes = require("./routes/sportRoutes");
const teamRoutes  = require("./routes/teamRoutes");
const matchRoutes = require("./routes/matchRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// ─── ROUTES ──────────────────────────────────────────────
app.use("/api", sportRoutes);
app.use("/api", teamRoutes);
app.use("/api", matchRoutes);

// ─── HEALTH CHECK ────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ message: "Sports Tournament Backend Running", version: "2.0" });
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));