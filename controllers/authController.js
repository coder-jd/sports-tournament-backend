const prisma = require("../prismaClient");

exports.getMe = async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;

    let user = await prisma.user.findUnique({ where: { uid } });

    if (!user) {
      const count = await prisma.user.count();
      user = await prisma.user.create({
        data: {
          uid,
          email,
          name:   name   || email.split("@")[0],
          avatar: picture || "",
          role:   count === 0 ? "ADMIN" : "STUDENT",
        },
      });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    const valid = ["ADMIN", "CAPTAIN", "STUDENT"];
    if (!valid.includes(role))
      return res.status(400).json({ error: "Invalid role" });

    const user = await prisma.user.update({
      where: { id: userId },
      data:  { role },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllUsers = async (_req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};