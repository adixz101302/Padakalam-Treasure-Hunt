import prisma from "./db";
import { logAuditEvent } from "./audit";
import { broadcastEvent } from "./sse";

export type GameState =
  | "QUALIFIER_ACTIVE"
  | "QUALIFIER_COMPLETE"
  | "ROUND_1_ACTIVE"
  | "ROUND_1_COMPLETE"
  | "ROUND_2_ACTIVE"
  | "ROUND_2_COMPLETE"
  | "ROUND_3_ACTIVE"
  | "ROUND_3_COMPLETE"
  | "ROUND_4_ACTIVE"
  | "ROUND_4_COMPLETE"
  | "FINAL_WAITING"
  | "FINAL_ACTIVE"
  | "FINISHED"
  | "DISQUALIFIED";

export const ROUND_STATE_MAP: Record<number, { active: GameState; next: GameState; nextRound: number }> = {
  0: { active: "QUALIFIER_ACTIVE", next: "ROUND_1_ACTIVE", nextRound: 1 },
  1: { active: "ROUND_1_ACTIVE", next: "ROUND_2_ACTIVE", nextRound: 2 },
  2: { active: "ROUND_2_ACTIVE", next: "ROUND_3_ACTIVE", nextRound: 3 },
  3: { active: "ROUND_3_ACTIVE", next: "ROUND_4_ACTIVE", nextRound: 4 },
  4: { active: "ROUND_4_ACTIVE", next: "FINAL_WAITING", nextRound: 5 },
  5: { active: "FINAL_ACTIVE", next: "FINISHED", nextRound: 5 },
};

/**
 * Validates whether the team is eligible to submit an answer for the given round
 */
export async function validateSubmissionEligibility(teamId: string, roundNumber: number) {
  // 1. Check Event Status
  const event = await prisma.event.findFirst();
  if (event?.status === "PAUSED") {
    return { allowed: false, reason: "The hunt is currently PAUSED by organizers. Submissions are temporarily frozen." };
  }
  if (event?.status === "FINISHED") {
    return { allowed: false, reason: "The hunt has concluded." };
  }
  if (event?.isLocked) {
    return { allowed: false, reason: "The game is currently locked." };
  }

  // 2. Check Team Status & Progress
  const team = await prisma.team.findUnique({
    where: { teamId },
    include: { progress: true },
  });

  if (!team || !team.isActive) {
    return { allowed: false, reason: "Invalid or inactive team." };
  }

  if (team.isDisqualified) {
    return { allowed: false, reason: "Your team has been disqualified. Contact the game organizers." };
  }

  if (!team.progress) {
    return { allowed: false, reason: "Team progress record missing." };
  }

  if (team.progress.currentRound !== roundNumber) {
    return {
      allowed: false,
      reason: `Out of sequence. Your current active mission is Round ${team.progress.currentRound}.`,
    };
  }

  return { allowed: true, team, progress: team.progress, event };
}

/**
 * Advances a team to the next round atomically
 */
export async function advanceTeamRound(teamId: string, currentRoundNumber: number) {
  const now = new Date();

  // If completing Round 4 -> Must execute atomic First-5 selection
  if (currentRoundNumber === 4) {
    return await handleRound4AtomicQualification(teamId, now);
  }

  const nextConfig = ROUND_STATE_MAP[currentRoundNumber];
  if (!nextConfig) {
    throw new Error(`Invalid round transition from ${currentRoundNumber}`);
  }

  const updateData: Record<string, unknown> = {
    state: nextConfig.next,
    currentRound: nextConfig.nextRound,
    currentStep: 0,
    lastActivityAt: now,
  };

  if (currentRoundNumber === 0) updateData.qualifierCompletedAt = now;
  if (currentRoundNumber === 1) updateData.round1CompletedAt = now;
  if (currentRoundNumber === 2) updateData.round2CompletedAt = now;
  if (currentRoundNumber === 3) updateData.round3CompletedAt = now;

  const updatedProgress = await prisma.teamProgress.update({
    where: { teamId },
    data: updateData,
  });

  await logAuditEvent(
    currentRoundNumber === 0 ? "QUALIFIER_COMPLETE" : (`ROUND_${currentRoundNumber}_COMPLETE` as any),
    `Team ${teamId} completed Round ${currentRoundNumber} and advanced to Round ${nextConfig.nextRound}`,
    teamId,
    { completedRound: currentRoundNumber, nextRound: nextConfig.nextRound }
  );

  broadcastEvent("TEAM_PROGRESS", {
    teamId,
    currentRound: nextConfig.nextRound,
    state: nextConfig.next,
    completedAt: now.toISOString(),
  });

  return {
    success: true,
    nextRound: nextConfig.nextRound,
    state: nextConfig.next,
  };
}

// Global promise queue for strict concurrency serialization
let queue: Promise<any> = Promise.resolve();

/**
 * ATOMIC FIRST-FIVE QUALIFICATION TRANSACTION
 * Guarantees strictly 5 finalists with unique positions 1..5 even under massive concurrency
 */
export async function handleRound4AtomicQualification(teamId: string, now: Date) {
  return new Promise<any>((resolve, reject) => {
    queue = queue.then(async () => {
      try {
        // 1. Check if team is already a finalist
        const existingFinalist = await prisma.finalist.findUnique({
          where: { teamId },
        });

        if (existingFinalist) {
          resolve({
            success: true,
            isFinalist: true,
            position: existingFinalist.position,
            state: "FINAL_WAITING" as GameState,
            message: `You are already registered as Finalist #${existingFinalist.position}.`,
          });
          return;
        }

        // 2. Count current finalists
        const finalistCount = await prisma.finalist.count();

        if (finalistCount < 5) {
          const position = finalistCount + 1;

          // Insert new finalist record with unique position
          await prisma.finalist.create({
            data: {
              teamId,
              position,
              qualifiedAt: now,
            },
          });

          // Update team progress to FINAL_WAITING
          await prisma.teamProgress.update({
            where: { teamId },
            data: {
              state: "FINAL_WAITING",
              currentRound: 5,
              round4CompletedAt: now,
              lastActivityAt: now,
            },
          });

          const allFinalistsReady = position === 5;
          if (allFinalistsReady) {
            const finalStartAt = new Date(Date.now() + 30000);
            await prisma.event.updateMany({
              data: {
                finalStartedAt: finalStartAt,
              },
            });

            broadcastEvent("FINAL_COUNTDOWN", {
              finalStartAt: finalStartAt.toISOString(),
              message: "All 5 Finalists have qualified! Final round starts in 30 seconds.",
            });
          }

          await logAuditEvent(
            "FINALIST_QUALIFIED",
            `Team ${teamId} qualified as Finalist #${position} (${position}/5)`,
            teamId,
            { position, totalFinalists: position }
          );

          broadcastEvent("FINALIST_UPDATE", {
            teamId,
            position,
            totalFinalists: position,
            allFinalistsReady,
          });

          resolve({
            success: true,
            isFinalist: true,
            position,
            totalFinalists: position,
            state: "FINAL_WAITING" as GameState,
            allFinalistsReady,
            message: `CONGRATULATIONS! You made the Final Five! Position: ${position}/5.`,
          });
        } else {
          // 5 finalists already selected
          await prisma.teamProgress.update({
            where: { teamId },
            data: {
              state: "FINISHED",
              round4CompletedAt: now,
              lastActivityAt: now,
              metadata: JSON.stringify({ reason: "SLOTS_FULL" }),
            },
          });

          await logAuditEvent(
            "ROUND_4_COMPLETE",
            `Team ${teamId} completed Round 4, but all 5 finalist slots were already filled.`,
            teamId,
            { status: "MISSED_FINAL" }
          );

          resolve({
            success: true,
            isFinalist: false,
            position: null,
            totalFinalists: 5,
            state: "FINISHED" as GameState,
            message: "You successfully completed Round 4! However, the 5 finalist positions have already been claimed.",
          });
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}
