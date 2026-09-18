import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../lib/db";
import { advanceTeamRound } from "../lib/state-machine";

describe("MANDATORY CONCURRENCY TEST: First-Five Finalists Selection", () => {
  const TOTAL_TEAMS = 25;
  const teamIds = Array.from(
    { length: TOTAL_TEAMS },
    (_, i) => `CONC_TEAM_${String(i + 1).padStart(2, "0")}`
  );

  beforeAll(async () => {
    // 1. Clean previous test finalists & test teams safely
    await prisma.finalist.deleteMany({
      where: { teamId: { in: teamIds } },
    });
    await prisma.winner.deleteMany({
      where: { teamId: { in: teamIds } },
    });
    await prisma.submissionAttempt.deleteMany({
      where: { teamId: { in: teamIds } },
    });
    await prisma.teamProgress.deleteMany({
      where: { teamId: { in: teamIds } },
    });
    await prisma.team.deleteMany({
      where: { teamId: { in: teamIds } },
    });

    // 2. Create 25 teams ready at Round 4 in parallel
    await Promise.all(
      teamIds.map((tid) =>
        prisma.team.create({
          data: {
            teamId: tid,
            teamName: `Concurrent Team ${tid}`,
            progress: {
              create: { state: "ROUND_4_ACTIVE", currentRound: 4 },
            },
          },
        })
      )
    );

    await prisma.event.upsert({
      where: { id: "test-event-id" },
      update: { status: "ACTIVE", isLocked: false, finalStartedAt: null },
      create: { id: "test-event-id", name: "Test Event", status: "ACTIVE" },
    });
  }, 60000);

  it("should atomically select EXACTLY 5 finalists from 25 simultaneous submissions", async () => {
    // Execute 25 simultaneous Round 4 completions in parallel
    const submissionPromises = teamIds.map((tid) => advanceTeamRound(tid, 4));
    const results = await Promise.all(submissionPromises);

    // 1. Check results array
    const finalistResults = results.filter((r) => r.isFinalist === true);
    const rejectedResults = results.filter((r) => r.isFinalist === false);

    expect(finalistResults.length).toBe(5);
    expect(rejectedResults.length).toBe(20);

    // 2. Verify all finalist positions are unique from 1 to 5
    const positions = finalistResults.map((r) => r.position).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(positions).toEqual([1, 2, 3, 4, 5]);

    // 3. Verify Database records strictly match
    const dbFinalists = await prisma.finalist.findMany({
      where: { teamId: { in: teamIds } },
      orderBy: { position: "asc" },
    });
    expect(dbFinalists.length).toBe(5);

    const dbPositions = dbFinalists.map((f) => f.position);
    expect(dbPositions).toEqual([1, 2, 3, 4, 5]);

    // 4. Verify no duplicate team IDs
    const uniqueTeamIds = new Set(dbFinalists.map((f) => f.teamId));
    expect(uniqueTeamIds.size).toBe(5);
  }, 90000);

  it("should handle idempotent re-submission from an existing finalist without increasing count", async () => {
    const dbFinalists = await prisma.finalist.findMany({
      where: { teamId: { in: teamIds } },
    });
    const existingFinalistTeamId = dbFinalists[0].teamId;

    const resubmission = await advanceTeamRound(existingFinalistTeamId, 4);
    expect(resubmission.isFinalist).toBe(true);
    expect(resubmission.position).toBe(dbFinalists[0].position);

    const totalFinalistsAfter = await prisma.finalist.count({
      where: { teamId: { in: teamIds } },
    });
    expect(totalFinalistsAfter).toBe(5);
  }, 30000);

  afterAll(async () => {
    // Clean up all concurrency test teams and test finalists
    await prisma.finalist.deleteMany({
      where: { teamId: { in: teamIds } },
    });
    await prisma.submissionAttempt.deleteMany({
      where: { teamId: { in: teamIds } },
    });
    await prisma.teamProgress.deleteMany({
      where: { teamId: { in: teamIds } },
    });
    await prisma.team.deleteMany({
      where: { teamId: { in: teamIds } },
    });
  }, 60000);
});
