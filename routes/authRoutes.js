const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/auth");
const requireRole    = require("../middleware/requireRole");
const c              = require("../controllers/authController");

router.get  ("/auth/me",    authMiddleware, c.getMe);
router.get  ("/auth/users", authMiddleware, requireRole("ADMIN"), c.getAllUsers);
router.patch("/auth/role",  authMiddleware, requireRole("ADMIN"), c.updateRole);

module.exports = router;