const express        = require("express");
const router         = express.Router();
const c              = require("../controllers/notificationController");

router.post("/notifications/token", c.saveToken);

module.exports = router;