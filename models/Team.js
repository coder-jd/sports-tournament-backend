const mongoose = require("mongoose");

const TeamSchema = new mongoose.Schema({
    name: String,
    sport: String,
    players: Number
});

module.exports = mongoose.model("Team", TeamSchema);