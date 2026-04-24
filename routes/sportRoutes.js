const express = require("express");
const router  = express.Router();
const c       = require("../controllers/sportController");

router.post  ("/sports",     c.createSport);
router.get   ("/sports",     c.getAllSports);
router.get   ("/sports/:id", c.getSportById);
router.delete("/sports/:id", c.deleteSport);

module.exports = router;