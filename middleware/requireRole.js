const prisma = require("../prismaClient");

/**
 * Middleware: checks that the authenticated user has one of the allowed roles.
 * Must be used AFTER the auth middleware (which sets req.user).
 *
 * Usage: router.post("/sports", auth, requireRole("ADMIN"), controller.create);
 */
module.exports = function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const uid = req.user?.uid;
      if (!uid) return res.status(401).json({ error: "Not authenticated" });

      const user = await prisma.user.findUnique({ where: { uid } });
      if (!user) return res.status(403).json({ error: "User not found" });

      if (!roles.includes(user.role)) {
        return res.status(403).json({
          error: `Requires ${roles.join(" or ")} role`,
        });
      }

      req.dbUser = user;          // attach full user record for downstream use
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
};
