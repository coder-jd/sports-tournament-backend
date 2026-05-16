const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/auth");
const requireRole    = require("../middleware/requireRole");
const c              = require("../controllers/announcementController");

router.get   ("/announcements",      c.getAnnouncements);
router.post  ("/announcements",      authMiddleware, requireRole("ADMIN"), c.createAnnouncement);
router.delete("/announcements/:id",  authMiddleware, requireRole("ADMIN"), c.deleteAnnouncement);

module.exports = router;