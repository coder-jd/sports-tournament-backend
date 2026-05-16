const prisma = require("../prismaClient");

exports.getAllTournaments = async (_req, res) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        sports: {
          include: {
            _count: { select: { teams: true, matches: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTournamentById = async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: {
        sports: {
          include: {
            _count: { select: { teams: true, matches: true } }
          }
        }
      },
    });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    res.json(tournament);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createTournament = async (req, res) => {
  try {
    const { name, year, description, startDate, endDate, status } = req.body;
    if (!name || !year || !startDate || !endDate)
      return res.status(400).json({ error: "name, year, startDate, endDate are required" });
    const tournament = await prisma.tournament.create({
      data: { name, year, description, startDate, endDate, status: status || "UPCOMING" },
    });
    res.status(201).json(tournament);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTournament = async (req, res) => {
  try {
    const allowed = ["name", "year", "description", "startDate", "endDate", "status"];
    const data = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
    const tournament = await prisma.tournament.update({
      where: { id: req.params.id },
      data,
    });
    res.json(tournament);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTournament = async (req, res) => {
  try {
    await prisma.tournament.delete({ where: { id: req.params.id } });
    res.json({ message: "Tournament deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};