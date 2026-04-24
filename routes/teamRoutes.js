const express = require("express");
const router  = express.Router();
const c       = require("../controllers/teamController");

router.post  ("/teams",                         c.createTeam);
router.get   ("/teams",                         c.getAllTeams);
router.get   ("/teams/:id",                     c.getTeamById);
router.patch ("/teams/:id/status",              c.updateTeamStatus);
router.post  ("/teams/:id/players",             c.addPlayer);
router.delete("/teams/:id/players/:playerId",   c.removePlayer);
router.delete("/teams/:id",                     c.deleteTeam);

module.exports = router;