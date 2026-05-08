const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/auth");
const c              = require("../controllers/tournamentController");

router.get   ("/tournaments",     c.getAllTournaments);
router.get   ("/tournaments/:id", c.getTournamentById);
router.post  ("/tournaments",     authMiddleware, c.createTournament);
router.patch ("/tournaments/:id", authMiddleware, c.updateTournament);
router.delete("/tournaments/:id", authMiddleware, c.deleteTournament);

module.exports = router;