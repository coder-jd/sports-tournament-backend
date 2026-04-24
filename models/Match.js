const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
    sportName: { type: String, required: true },
    teamA: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    teamB: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    venue: { type: String, required: true },
    score: {
        teamA: { type: Number, default: 0 },
        teamB: { type: Number, default: 0 }
    }
});

module.exports = mongoose.model("Match", matchSchema);