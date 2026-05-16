const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/auth");
const requireRole    = require("../middleware/requireRole");
const c              = require("../controllers/sportController");

router.get   ("/sports",     c.getAllSports);
router.get   ("/sports/:id", c.getSportById);
router.post  ("/sports",     authMiddleware, requireRole("ADMIN"), c.createSport);
router.delete("/sports/:id", authMiddleware, requireRole("ADMIN"), c.deleteSport);

module.exports = router;