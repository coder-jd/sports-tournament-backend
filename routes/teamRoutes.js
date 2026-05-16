const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/auth");
const requireRole    = require("../middleware/requireRole");
const c              = require("../controllers/teamController");

router.post  ("/teams",                         authMiddleware, c.createTeam);
router.get   ("/teams",                         c.getAllTeams);
router.get   ("/teams/:id",                     c.getTeamById);
router.patch ("/teams/:id/status",              authMiddleware, requireRole("ADMIN"), c.updateTeamStatus);
router.post  ("/teams/:id/players",             authMiddleware, requireRole("ADMIN", "CAPTAIN"), c.addPlayer);
router.delete("/teams/:id/players/:playerId",   authMiddleware, requireRole("ADMIN", "CAPTAIN"), c.removePlayer);
router.delete("/teams/:id",                     authMiddleware, requireRole("ADMIN"), c.deleteTeam);

module.exports = router;