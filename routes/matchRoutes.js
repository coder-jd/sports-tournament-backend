const express = require("express");
const router  = express.Router();
const c       = require("../controllers/matchController");

router.post  ("/matches",                    c.createMatch);
router.post  ("/matches/generate",           c.generateFixtures);
router.get   ("/matches",                    c.getAllMatches);
router.get   ("/matches/:id",                c.getMatchById);
router.patch ("/matches/:id/score",          c.updateMatchScore);
router.delete("/matches/:id",                c.deleteMatch);

router.get   ("/standings/:sportId",         c.getStandings);
router.get   ("/bracket/:sportId",           c.getBracket);

module.exports = router;
