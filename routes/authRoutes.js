const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/auth");
const c              = require("../controllers/authController");

router.get  ("/auth/me",    authMiddleware, c.getMe);
router.get  ("/auth/users", authMiddleware, c.getAllUsers);
router.patch("/auth/role",  authMiddleware, c.updateRole);

module.exports = router;