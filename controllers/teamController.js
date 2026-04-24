const prisma = require("../prismaClient");

// POST /teams  — register a team (starts as PENDING)
exports.createTeam = async (req, res) => {
  try {
    const { sportId, teamName, department, captain, players = [] } = req.body;

    if (!sportId || !teamName || !department || !captain)
      return res.status(400).json({ error: "sportId, teamName, department, captain are required" });

    // Check sport exists
    const sport = await prisma.sport.findUnique({ where: { id: sportId } });
    if (!sport) return res.status(404).json({ error: "Sport not found" });

    // Validate players (no duplicate jersey numbers)
    const jerseys = players.map((p) => p.jerseyNo);
    if (new Set(jerseys).size !== jerseys.length)
      return res.status(400).json({ error: "Duplicate jersey numbers in team" });

    const team = await prisma.team.create({
      data: {
        sportId,
        teamName: teamName.trim(),
        department: department.trim(),
        captain: captain.trim(),
        players: {
          create: players.map((p) => ({
            name: p.name,
            jerseyNo: Number(p.jerseyNo),
          })),
        },
      },
      include: { players: true, sport: true },
    });

    res.status(201).json(team);
  } catch (err) {
    if (err.code === "P2002")
      return res.status(400).json({ error: "Team name already registered for this sport" });
    res.status(500).json({ error: err.message });
  }
};

// GET /teams  — all teams, optional ?sportId=&status= filters
exports.getAllTeams = async (req, res) => {
  try {
    const { sportId, status } = req.query;
    const where = {};
    if (sportId) where.sportId = sportId;
    if (status)  where.status  = status.toUpperCase();

    const teams = await prisma.team.findMany({
      where,
      include: { players: true, sport: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /teams/:id
exports.getTeamById = async (req, res) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: { players: true, sport: true },
    });
    if (!team) return res.status(404).json({ error: "Team not found" });
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /teams/:id/status  — admin approves or rejects
exports.updateTeamStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["PENDING", "APPROVED", "REJECTED"];
    if (!valid.includes(status))
      return res.status(400).json({ error: `Status must be one of: ${valid.join(", ")}` });

    const team = await prisma.team.update({
      where: { id: req.params.id },
      data:  { status },
      include: { players: true, sport: true },
    });
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /teams/:id/players  — add a player to existing team
exports.addPlayer = async (req, res) => {
  try {
    const { name, jerseyNo } = req.body;
    if (!name || jerseyNo === undefined)
      return res.status(400).json({ error: "name and jerseyNo are required" });

    const player = await prisma.player.create({
      data: { name, jerseyNo: Number(jerseyNo), teamId: req.params.id },
    });
    res.status(201).json(player);
  } catch (err) {
    if (err.code === "P2002")
      return res.status(400).json({ error: "Jersey number already taken in this team" });
    res.status(500).json({ error: err.message });
  }
};

// DELETE /teams/:id/players/:playerId
exports.removePlayer = async (req, res) => {
  try {
    await prisma.player.delete({ where: { id: req.params.playerId } });
    res.json({ message: "Player removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /teams/:id
exports.deleteTeam = async (req, res) => {
  try {
    await prisma.team.delete({ where: { id: req.params.id } });
    res.json({ message: "Team deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};