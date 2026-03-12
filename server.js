const express = require("express");
const app = express();

// database connection
require("./db");

// middleware
app.use(express.json());

// import routes
const teamRoutes = require("./routes/teamRoutes");

// use routes
app.use("/api", teamRoutes);

// root route
app.get("/", (req, res) => {
    res.send("Sports Tournament API Running");
});

// port
const PORT = 5000;

// start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});