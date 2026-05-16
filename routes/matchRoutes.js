const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/auth");
const requireRole    = require("../middleware/requireRole");
const c              = require("../controllers/matchController");

router.post  ("/matches",                    authMiddleware, requireRole("ADMIN"), c.createMatch);
router.post  ("/matches/generate",           authMiddleware, requireRole("ADMIN"), c.generateFixtures);
router.get   ("/matches",                    c.getAllMatches);
router.get   ("/matches/:id",                c.getMatchById);
router.patch ("/matches/:id/score",          authMiddleware, requireRole("ADMIN", "CAPTAIN"), c.updateMatchScore);
router.delete("/matches/:id",                authMiddleware, requireRole("ADMIN"), c.deleteMatch);

router.get   ("/standings/:sportId",         c.getStandings);
router.get   ("/bracket/:sportId",           c.getBracket);

module.exports = router;
