const prisma = require("../prismaClient");

// GET /cricket/match/:matchId — get all stats for a match
exports.getMatchStats = async (req, res) => {
  try {
    const stats = await prisma.cricketStat.findMany({
      where: { matchId: req.params.matchId },
      include: { player: true },
    });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /cricket/stats — save player stat
exports.savePlayerStat = async (req, res) => {
  try {
    const {
      matchId, playerId, teamId,
      runs, balls, fours, sixes, dismissalType,
      overs, maidens, runsGiven, wickets,
      catches, runOuts
    } = req.body;

    if (!matchId || !playerId || !teamId)
      return res.status(400).json({ error: "matchId, playerId, teamId required" });

    const stat = await prisma.cricketStat.upsert({
      where: { matchId_playerId: { matchId, playerId } },
      update: {
        runs:         runs         ?? 0,
        balls:        balls        ?? 0,
        fours:        fours        ?? 0,
        sixes:        sixes        ?? 0,
        dismissalType: dismissalType || null,
        overs:        overs        || null,
        maidens:      maidens      ?? 0,
        runsGiven:    runsGiven    ?? 0,
        wickets:      wickets      ?? 0,
        catches:      catches      ?? 0,
        runOuts:      runOuts      ?? 0,
      },
      create: {
        matchId, playerId, teamId,
        runs:         runs         ?? 0,
        balls:        balls        ?? 0,
        fours:        fours        ?? 0,
        sixes:        sixes        ?? 0,
        dismissalType: dismissalType || null,
        overs:        overs        || null,
        maidens:      maidens      ?? 0,
        runsGiven:    runsGiven    ?? 0,
        wickets:      wickets      ?? 0,
        catches:      catches      ?? 0,
        runOuts:      runOuts      ?? 0,
      },
      include: { player: true },
    });

    res.json(stat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /cricket/player/:playerId — get player's career stats
exports.getPlayerStats = async (req, res) => {
  try {
    const stats = await prisma.cricketStat.findMany({
      where: { playerId: req.params.playerId },
      include: { player: true },
    });

    // Calculate career totals
    const career = {
      matches:     stats.length,
      totalRuns:   stats.reduce((a, s) => a + s.runs, 0),
      totalBalls:  stats.reduce((a, s) => a + s.balls, 0),
      totalFours:  stats.reduce((a, s) => a + s.fours, 0),
      totalSixes:  stats.reduce((a, s) => a + s.sixes, 0),
      totalWickets: stats.reduce((a, s) => a + s.wickets, 0),
      totalCatches: stats.reduce((a, s) => a + s.catches, 0),
      totalRunOuts: stats.reduce((a, s) => a + s.runOuts, 0),
      highScore:   Math.max(...stats.map(s => s.runs), 0),
      bestBowling: Math.max(...stats.map(s => s.wickets), 0),
    };

    // Strike rate
    career.strikeRate = career.totalBalls > 0
      ? ((career.totalRuns / career.totalBalls) * 100).toFixed(2)
      : "0.00";

    res.json({ career, matches: stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /cricket/tournament/:sportId — top scorers and bowlers
exports.getTournamentStats = async (req, res) => {
  try {
    const { sportId } = req.params;

    // Get all matches for this sport
    const matches = await prisma.match.findMany({
      where: { sportId },
      select: { id: true }
    });
    const matchIds = matches.map(m => m.id);

    const stats = await prisma.cricketStat.findMany({
      where: { matchId: { in: matchIds } },
      include: { player: { include: { team: true } } },
    });

    // Top batsmen
    const batsmen = {};
    stats.forEach(s => {
      if (!batsmen[s.playerId]) {
        batsmen[s.playerId] = {
          player: s.player,
          runs: 0, balls: 0, fours: 0, sixes: 0, matches: 0
        };
      }
      batsmen[s.playerId].runs   += s.runs;
      batsmen[s.playerId].balls  += s.balls;
      batsmen[s.playerId].fours  += s.fours;
      batsmen[s.playerId].sixes  += s.sixes;
      batsmen[s.playerId].matches++;
    });

    // Top bowlers
    const bowlers = {};
    stats.forEach(s => {
      if (s.wickets > 0 || s.runsGiven > 0) {
        if (!bowlers[s.playerId]) {
          bowlers[s.playerId] = {
            player: s.player,
            wickets: 0, runsGiven: 0, matches: 0
          };
        }
        bowlers[s.playerId].wickets   += s.wickets;
        bowlers[s.playerId].runsGiven += s.runsGiven;
        bowlers[s.playerId].matches++;
      }
    });

    const topBatsmen = Object.values(batsmen)
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 10);

    const topBowlers = Object.values(bowlers)
      .sort((a, b) => b.wickets - a.wickets)
      .slice(0, 10);

    res.json({ topBatsmen, topBowlers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};