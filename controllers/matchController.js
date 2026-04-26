// ─── PATCH /matches/:id/score  — update live score ───────
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

    // Auto-set winner when match is completed
    if (updateData.status === "COMPLETED") {
      const sA = updateData.scoreA ?? match.scoreA;
      const sB = updateData.scoreB ?? match.scoreB;
      if (sA > sB)      updateData.winnerId = match.teamAId;
      else if (sB > sA) updateData.winnerId = match.teamBId;
      else              updateData.winnerId = null; // draw
    }

    const updated = await prisma.match.update({
      where: { id: req.params.id },
      data: updateData,
      include: { teamA: true, teamB: true, sport: true },
    });

    // ─── AUTO BRACKET PROGRESSION ────────────────────────
    if (updateData.status === "COMPLETED" && updateData.winnerId && match.sport.format !== "ROUND_ROBIN") {
      await advanceBracket(match, updateData.winnerId);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── BRACKET PROGRESSION HELPER ──────────────────────────
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

    // Check if all matches in this round are completed
    const allCompleted = roundMatches.every(m =>
      m.status === "COMPLETED" || m.id === completedMatch.id
    );

    if (!allCompleted) return; // Wait for all matches in round to finish

    // Get all winners of this round
    const winners = roundMatches.map(m =>
      m.id === completedMatch.id ? winnerId : m.winnerId
    ).filter(Boolean);

    if (winners.length < 2) return; // Need at least 2 winners for next round

    // Determine next round name
    const nextRound = getNextRound(round, winners.length);
    if (!nextRound) return; // Tournament is over

    // Check if next round matches already exist
    const existing = await prisma.match.findFirst({
      where: { sportId, round: nextRound }
    });
    if (existing) return; // Already created

    // Create next round matches
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

function getNextRound(currentRound, winnerCount) {
  if (winnerCount === 2) return "Final";
  if (winnerCount === 4) return "Semifinal";
  if (winnerCount === 8) return "Quarterfinal";
  if (currentRound === "Round 1") return "Round 2";
  if (currentRound === "Round 2") return "Quarterfinal";
  if (currentRound === "Quarterfinal") return "Semifinal";
  if (currentRound === "Semifinal") return "Final";
  if (currentRound === "Final") return null; // Tournament over!
  return null;
}
function getNextDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}