const prisma = require("../prismaClient");

// POST /sports  — create a sport
exports.createSport = async (req, res) => {
  try {
    const { name, format } = req.body;
    if (!name) return res.status(400).json({ error: "Sport name is required" });

    const sport = await prisma.sport.create({
      data: { name: name.trim(), format: format || "KNOCKOUT" },
    });
    res.status(201).json(sport);
  } catch (err) {
    if (err.code === "P2002")
      return res.status(400).json({ error: "Sport already exists" });
    res.status(500).json({ error: err.message });
  }
};

// GET /sports  — list all sports with team & match counts
exports.getAllSports = async (_req, res) => {
  try {
    const sports = await prisma.sport.findMany({
      include: {
        _count: { select: { teams: true, matches: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json(sports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /sports/:id  — single sport with teams and matches
exports.getSportById = async (req, res) => {
  try {
    const sport = await prisma.sport.findUnique({
      where: { id: req.params.id },
      include: {
        teams: { include: { players: true } },
        matches: {
          include: { teamA: true, teamB: true },
          orderBy: { date: "asc" },
        },
      },
    });
    if (!sport) return res.status(404).json({ error: "Sport not found" });
    res.json(sport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /sports/:id
exports.deleteSport = async (req, res) => {
  try {
    await prisma.sport.delete({ where: { id: req.params.id } });
    res.json({ message: "Sport deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};