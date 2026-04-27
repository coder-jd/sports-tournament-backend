const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/auth");
const c              = require("../controllers/announcementController");

router.get   ("/announcements",      c.getAnnouncements);
router.post  ("/announcements",      authMiddleware, c.createAnnouncement);
router.delete("/announcements/:id",  authMiddleware, c.deleteAnnouncement);

module.exports = router;