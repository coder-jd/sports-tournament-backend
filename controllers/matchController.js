const prisma = require("../prismaClient");

// ─── HELPERS ─────────────────────────────────────────────

// Shuffle array (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── POST /matches  — create a single match manually ─────
exports.createMatch = async (req, res) => {
  try {
    const { sportId, teamAId, teamBId, date, time, venue, round } = req.body;

    if (!sportId || !teamAId || !teamBId || !date || !time || !venue)
      return res.status(400).json({ error: "sportId, teamAId, teamBId, date, time, venue are required" });

    if (teamAId === teamBId)
      return res.status(400).json({ error: "Both teams cannot be the same" });

    // Validate teams exist and belong to this sport
    const [teamA, teamB] = await Promise.all([
      prisma.team.findUnique({ where: { id: teamAId } }),
      prisma.team.findUnique({ where: { id: teamBId } }),
    ]);
    if (!teamA || !teamB)
      return res.status(404).json({ error: "One or both teams not found" });
    if (teamA.sportId !== sportId || teamB.sportId !== sportId)
      return res.status(400).json({ error: "Both teams must belong to the same sport" });

    // Duplicate match check (same teams, same date+time)
    const existing = await prisma.match.findFirst({
      where: { teamAId, teamBId, date, time },
    });
    if (existing)
      return res.status(400).json({ error: "This match already exists" });

    const match = await prisma.match.create({
      data: { sportId, teamAId, teamBId, date, time, venue, round: round || null },
      include: { teamA: true, teamB: true, sport: true },
    });

    res.status(201).json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /matches/generate  — auto-generate fixtures ────
// Body: { sportId, startDate, venue, matchIntervalMinutes }
exports.generateFixtures = async (req, res) => {
  try {
    const { sportId, startDate, venue = "Main Ground", matchIntervalMinutes = 90 } = req.body;
    if (!sportId || !startDate)
      return res.status(400).json({ error: "sportId and startDate are required" });

    const sport = await prisma.sport.findUnique({
      where: { id: sportId },
      include: { teams: { where: { status: "APPROVED" } } },
    });
    if (!sport) return res.status(404).json({ error: "Sport not found" });

    const teams = sport.teams;
    if (teams.length < 2)
      return res.status(400).json({ error: "Need at least 2 approved teams to generate fixtures" });

    let fixtureData = [];
    const base = new Date(startDate);

    if (sport.format === "KNOCKOUT" || sport.format === "GROUP_KNOCKOUT") {
      // Single elimination — seed randomly, pair teams
      const seeded = shuffle(teams);
      // Pad to power of 2 if needed (bye rounds simplified here)
      let matchIndex = 0;
      for (let i = 0; i < seeded.length - 1; i += 2) {
        const matchTime = new Date(base.getTime() + matchIndex * matchIntervalMinutes * 60000);
        fixtureData.push({
          sportId,
          teamAId: seeded[i].id,
          teamBId: seeded[i + 1].id,
          date: matchTime.toISOString().split("T")[0],
          time: matchTime.toTimeString().slice(0, 5),
          venue,
          round: "Round 1",
          status: "UPCOMING",
        });
        matchIndex++;
      }
    } else {
      // ROUND_ROBIN — every team plays every other team once
      let matchIndex = 0;
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const matchTime = new Date(base.getTime() + matchIndex * matchIntervalMinutes * 60000);
          fixtureData.push({
            sportId,
            teamAId: teams[i].id,
            teamBId: teams[j].id,
            date: matchTime.toISOString().split("T")[0],
            time: matchTime.toTimeString().slice(0, 5),
            venue,
            round: `Match Day ${matchIndex + 1}`,
            status: "UPCOMING",
          });
          matchIndex++;
        }
      }
    }

    // Bulk insert
    await prisma.match.createMany({ data: fixtureData });

    // Return with relations
    const matches = await prisma.match.findMany({
      where: { sportId },
      include: { teamA: true, teamB: true },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });

    res.status(201).json({ generated: fixtureData.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /matches  — list matches, optional filters ──────
exports.getAllMatches = async (req, res) => {
  try {
    const { sportId, status, date } = req.query;
    const where = {};
    if (sportId) where.sportId = sportId;
    if (status)  where.status  = status.toUpperCase();
    if (date)    where.date    = date;

    const matches = await prisma.match.findMany({
      where,
      include: { teamA: true, teamB: true, sport: true },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /matches/:id ────────────────────────────────────
exports.getMatchById = async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: { teamA: { include: { players: true } }, teamB: { include: { players: true } }, sport: true },
    });
    if (!match) return res.status(404).json({ error: "Match not found" });
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── PATCH /matches/:id/score  — update live score ───────
exports.updateMatchScore = async (req, res) => {
  try {
    const { scoreA, scoreB, status } = req.body;

    const updateData = {};
    if (scoreA !== undefined) updateData.scoreA = Number(scoreA);
    if (scoreB !== undefined) updateData.scoreB = Number(scoreB);
    if (status)               updateData.status  = status.toUpperCase();

    // Auto-set winner when match is completed
    if (updateData.status === "COMPLETED") {
      const sA = updateData.scoreA ?? (await prisma.match.findUnique({ where: { id: req.params.id }, select: { scoreA: true } })).scoreA;
      const sB = updateData.scoreB ?? (await prisma.match.findUnique({ where: { id: req.params.id }, select: { scoreB: true } })).scoreB;
      const match = await prisma.match.findUnique({ where: { id: req.params.id } });
      if (sA > sB)       updateData.winnerId = match.teamAId;
      else if (sB > sA)  updateData.winnerId = match.teamBId;
      else               updateData.winnerId = null; // draw
    }

    const updated = await prisma.match.update({
      where: { id: req.params.id },
      data:  updateData,
      include: { teamA: true, teamB: true, sport: true },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /standings/:sportId  — round-robin standings ────
exports.getStandings = async (req, res) => {
  try {
    const { sportId } = req.params;

    const [teams, matches] = await Promise.all([
      prisma.team.findMany({ where: { sportId, status: "APPROVED" } }),
      prisma.match.findMany({ where: { sportId, status: "COMPLETED" } }),
    ]);

    // Build standings map
    const table = {};
    teams.forEach((t) => {
      table[t.id] = { teamId: t.id, teamName: t.teamName, department: t.department, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
    });

    matches.forEach(({ teamAId, teamBId, scoreA, scoreB }) => {
      if (!table[teamAId] || !table[teamBId]) return;

      table[teamAId].played++;
      table[teamBId].played++;
      table[teamAId].goalsFor     += scoreA;
      table[teamAId].goalsAgainst += scoreB;
      table[teamBId].goalsFor     += scoreB;
      table[teamBId].goalsAgainst += scoreA;

      if (scoreA > scoreB) {
        table[teamAId].won++;   table[teamAId].points += 3;
        table[teamBId].lost++;
      } else if (scoreB > scoreA) {
        table[teamBId].won++;   table[teamBId].points += 3;
        table[teamAId].lost++;
      } else {
        table[teamAId].drawn++; table[teamAId].points++;
        table[teamBId].drawn++; table[teamBId].points++;
      }
    });

    const standings = Object.values(table).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      return gdB - gdA;
    });

    res.json(standings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /bracket/:sportId  — knockout bracket tree ──────
exports.getBracket = async (req, res) => {
  try {
    const { sportId } = req.params;
    const matches = await prisma.match.findMany({
      where: { sportId },
      include: { teamA: true, teamB: true },
      orderBy: [{ round: "asc" }, { date: "asc" }],
    });

    // Group by round
    const bracket = matches.reduce((acc, m) => {
      const r = m.round || "Unknown";
      if (!acc[r]) acc[r] = [];
      acc[r].push(m);
      return acc;
    }, {});

    res.json(bracket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── DELETE /matches/:id ─────────────────────────────────
exports.deleteMatch = async (req, res) => {
  try {
    await prisma.match.delete({ where: { id: req.params.id } });
    res.json({ message: "Match deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};