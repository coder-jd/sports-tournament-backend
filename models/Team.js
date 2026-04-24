const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    jerseyNo: { type: Number, required: true }
});

const teamSchema = new mongoose.Schema({
    sportName: { type: String, required: true },
    teamName: { type: String, required: true },
    captain: { type: String, required: true },
    players: { type: [playerSchema], default: [] }
});

module.exports = mongoose.model("Team", teamSchema);