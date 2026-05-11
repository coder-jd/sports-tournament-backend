const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/auth");
const c              = require("../controllers/cricketController");

router.get ("/cricket/match/:matchId",      c.getMatchStats);
router.post("/cricket/stats",               authMiddleware, c.savePlayerStat);
router.get ("/cricket/player/:playerId",    c.getPlayerStats);
router.get ("/cricket/tournament/:sportId", c.getTournamentStats);

module.exports = router;