const express = require("express");
const router = express.Router();
const Team = require("../models/Team");

router.post("/create-team", async (req, res) => {
    try {
        const team = new Team(req.body);
        await team.save();
        res.status(201).json(team);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.get("/teams", async (req, res) => {
    const teams = await Team.find();
    res.json(teams);
});

module.exports = router;