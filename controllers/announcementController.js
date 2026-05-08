const prisma = require("../prismaClient");
const { sendNotification } = require("./notificationController");

exports.getAnnouncements = async (_req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message, important } = req.body;
    if (!title || !message)
      return res.status(400).json({ error: "Title and message are required" });

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        important: important || false,
        createdBy: req.user.email,
      },
    });

    await sendNotification(`📢 ${announcement.title}`, announcement.message);

    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};