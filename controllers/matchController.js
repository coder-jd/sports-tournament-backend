const { sendNotification } = require("./notificationController");
const prisma = require("../prismaClient");

// ─── HELPERS ─────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getNextDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function getNextRound(currentRound, winnerCount) {
  if (winnerCount === 2) return "Final";
  if (winnerCount === 4) return "Semifinal";
  if (winnerCount === 8) return "Quarterfinal";

  const r = (currentRound || "").toLowerCase();
  if (r.includes("semi")) return "Final";
  if (r.includes("quarter")) return "Semifinal";
  if (r.includes("final") && !r.includes("semi")) return null;
  if (r.includes("1") || r === "round 1") return "Round 2";
  if (r.includes("2") || r === "round 2") return "Quarterfinal";
  return "Next Round";
}

async function advanceBracket(completedMatch, winnerId) {
  try {
    const { sportId, round } = completedMatch;

    const roundMatches = await prisma.match.findMany({
      where: { sportId, round },
      orderBy: { createdAt: "asc" },
    });

    const updatedMatches = roundMatches.map(m =>
      m.id === completedMatch.id ? { ...m, status: "COMPLETED", winnerId } : m
    );

    const allCompleted = updatedMatches.every(m => m.status === "COMPLETED");
    if (!allCompleted) {
      console.log(`⏳ Waiting for all ${round} matches to complete`);
      return;
    }

    const winners = updatedMatches.map(m => m.winnerId).filter(Boolean);
    console.log(`🏆 ${round} done. Winners: ${winners.length}`);

    if (winners.length < 2) return;

    const nextRound = getNextRound(round, winners.length);
    if (!nextRound) {
      console.log("🎉 Tournament is over!");
      return;
    }

    const existing = await prisma.match.findFirst({
      where: { sportId, round: nextRound }
    });
    if (existing) {
      console.log(`⚠️ ${nextRound} already exists`);
      return;
    }

    const nextMatches = [];
    for (let i = 0; i < winners.length - 1; i += 2) {
      nextMatches.push({
        sportId,
        teamAId: winners[i],
        teamBId: winners[i + 1],
        date: getNextDate(),
        time: "10:00",
        venue: completedMatch.venue || "Main Ground",
        round: nextRound,
        status: "UPCOMING",
      });
    }

    await prisma.match.createMany({ data: nextMatches });
    console.log(`✅ Created ${nextMatches.length} matches for ${nextRound}`);
  } catch (err) {
    console.error("Bracket progression error:", err.message);
  }
}

// ─── POST /matches ────────────────────────────────────────
exports.createMatch = async (req, res) => {
  try {
    const { sportId, teamAId, teamBId, date, time, venue, round } = req.body;

    if (!sportId || !teamAId || !teamBId || !date || !time || !venue)
      return res.status(400).json({ error: "sportId, teamAId, teamBId, date, time, venue are required" });

    if (teamAId === teamBId)
      return res.status(400).json({ error: "Both teams cannot be the same" });

    const [teamA, teamB] = await Promise.all([
      prisma.team.findUnique({ where: { id: teamAId } }),
      prisma.team.findUnique({ where: { id: teamBId } }),
    ]);
    if (!teamA || !teamB)
      return res.status(404).json({ error: "One or both teams not found" });
    if (teamA.sportId !== sportId || teamB.sportId !== sportId)
      return res.status(400).json({ error: "Both teams must belong to the same sport" });

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

// ─── POST /matches/generate ───────────────────────────────
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
      const seeded = shuffle(teams);
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

    await prisma.match.createMany({ data: fixtureData });

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

// ─── GET /matches ─────────────────────────────────────────
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

// ─── GET /matches/:id ─────────────────────────────────────
exports.getMatchById = async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: {
        teamA: { include: { players: true } },
        teamB: { include: { players: true } },
        sport: true
      },
    });
    if (!match) return res.status(404).json({ error: "Match not found" });
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── PATCH /matches/:id/score ─────────────────────────────
exports.updateMatchScore = async (req, res) => {
  try {
    const { scoreA, scoreB, status } = req.body;
    const updateData = {};
    if (scoreA !== undefined) updateData.scoreA = Number(scoreA);
    if (scoreB !== undefined) updateData.scoreB = Number(scoreB);
    if (status) updateData.status = status.toUpperCase();

    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: { sport: true }
    });
    if (!match) return res.status(404).json({ error: "Match not found" });

    if (updateData.status === "COMPLETED") {
      const sA = updateData.scoreA ?? match.scoreA;
      const sB = updateData.scoreB ?? match.scoreB;
      if (sA > sB)      updateData.winnerId = match.teamAId;
      else if (sB > sA) updateData.winnerId = match.teamBId;
      else              updateData.winnerId = null;
    }

    const updated = await prisma.match.update({
      where: { id: req.params.id },
      data: updateData,
      include: { teamA: true, teamB: true, sport: true },
    });

    if (updateData.status === "COMPLETED" && updateData.winnerId && match.sport.format !== "ROUND_ROBIN") {
      await advanceBracket(match, updateData.winnerId);
    }

    // ✅ Notifications inside the function
    if (updateData.status === "LIVE") {
      await sendNotification(
        "🔴 Match Live!",
        `${updated.teamA?.teamName} vs ${updated.teamB?.teamName} is now live!`
      );
    }
    if (updateData.status === "COMPLETED") {
      const winner = updateData.winnerId === updated.teamAId
        ? updated.teamA?.teamName
        : updated.teamB?.teamName;
      if (winner) await sendNotification("🏆 Match Result!", `${winner} wins!`);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
  await sendNotification(
    "🔴 Match Live!",
    `${updated.teamA?.teamName} vs ${updated.teamB?.teamName} is now live!`
  );
}
if (updateData.status === "COMPLETED") {
  const winner = updateData.winnerId === updated.teamAId ? updated.teamA?.teamName : updated.teamB?.teamName;
  if (winner) await sendNotification("🏆 Match Result!", `${winner} wins!`);
}

// ─── GET /standings/:sportId ──────────────────────────────
exports.getStandings = async (req, res) => {
  try {
    const { sportId } = req.params;

    const [teams, matches] = await Promise.all([
      prisma.team.findMany({ where: { sportId, status: "APPROVED" } }),
      prisma.match.findMany({ where: { sportId, status: "COMPLETED" } }),
    ]);

    const table = {};
    teams.forEach((t) => {
      table[t.id] = {
        teamId: t.id, teamName: t.teamName, department: t.department,
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, points: 0
      };
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
      return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
    });

    res.json(standings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /bracket/:sportId ────────────────────────────────
exports.getBracket = async (req, res) => {
  try {
    const { sportId } = req.params;
    const matches = await prisma.match.findMany({
      where: { sportId },
      include: { teamA: true, teamB: true },
      orderBy: [{ round: "asc" }, { date: "asc" }],
    });

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

// ─── DELETE /matches/:id ──────────────────────────────────
exports.deleteMatch = async (req, res) => {
  try {
    await prisma.match.delete({ where: { id: req.params.id } });
    res.json({ message: "Match deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};