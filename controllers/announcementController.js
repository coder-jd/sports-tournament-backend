const prisma = require("../prismaClient");
const admin  = require("../firebaseAdmin");

exports.saveToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token required" });

    await prisma.notificationToken.upsert({
      where: { token },
      update: { updatedAt: new Date() },
      create: { token, userId: req.user?.uid || "anonymous" },
    });
    res.json({ message: "Token saved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendNotification = async (title, body) => {
  try {
    const tokens = await prisma.notificationToken.findMany();
    if (tokens.length === 0) return;

    const tokenList = tokens.map(t => t.token);
    const message = {
      notification: { title, body },
      tokens: tokenList,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ Notification sent to ${response.successCount} devices`);
  } catch (err) {
    console.error("Notification error:", err.message);
  }
};