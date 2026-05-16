const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/auth");
const requireRole    = require("../middleware/requireRole");
const c              = require("../controllers/tournamentController");

router.get   ("/tournaments",     c.getAllTournaments);
router.get   ("/tournaments/:id", c.getTournamentById);
router.post  ("/tournaments",     authMiddleware, requireRole("ADMIN"), c.createTournament);
router.patch ("/tournaments/:id", authMiddleware, requireRole("ADMIN"), c.updateTournament);
router.delete("/tournaments/:id", authMiddleware, requireRole("ADMIN"), c.deleteTournament);

module.exports = router;