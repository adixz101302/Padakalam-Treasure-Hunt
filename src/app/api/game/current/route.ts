import { NextRequest } from "next/server";
import prisma, { withRetry } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";
import { applyClueTransformation, SubQuestion } from "@/lib/answer-validator";

export async function GET(req: NextRequest) {
  try {
    const session = getTeamFromRequest(req);
    if (!session) {
      return jsonError("Unauthorized. Please log in with your Team ID.", 401);
    }

    const team = await withRetry(() => prisma.team.findUnique({
      where: { teamId: session.teamId },
      include: {
        progress: true,
        finalist: true,
        winner: true,
      },
    }));

    if (!team || !team.isActive) {
      return jsonError("Team not found or inactive.", 403);
    }

    if (team.isDisqualified) {
      return jsonSuccess({
        isDisqualified: true,
        message: "Your team has been disqualified.",
      });
    }

    const progress = team.progress;
    if (!progress) {
      return jsonError("Progress record not initialized.", 500);
    }

    const event = await prisma.event.findFirst();
    const currentRound = progress.currentRound;

    // Check if whole event is completed or winner declared
    if (event?.status === "FINISHED" || team.winner) {
      const winner = await prisma.winner.findFirst({
        include: { team: true },
      });
      return jsonSuccess({
        state: "FINISHED",
        isFinished: true,
        winner: winner
          ? {
              teamId: winner.team.teamId,
              teamName: winner.team.teamName,
              position: winner.finalistPosition,
              declaredAt: winner.declaredAt,
            }
          : null,
      });
    }

    // Special handling for Final Round (Round 5)
    if (currentRound === 5) {
      const finalist = team.finalist;

      if (!finalist) {
        return jsonSuccess({
          state: "FINISHED",
          isFinalist: false,
          message: "You completed Round 4, but the 5 finalist slots were already filled.",
        });
      }

      const now = new Date();
      const finalStartAt = event?.finalStartedAt;
      const isStarted = finalStartAt && now >= new Date(finalStartAt);

      if (!isStarted) {
        const totalFinalists = await prisma.finalist.count();
        return jsonSuccess({
          state: "FINAL_WAITING",
          isFinalist: true,
          position: finalist.position,
          totalFinalists,
          finalStartAt: finalStartAt ? finalStartAt.toISOString() : null,
          serverTime: now.toISOString(),
          message:
            totalFinalists < 5
              ? `Waiting for remaining teams... (${totalFinalists}/5 qualified)`
              : "All 5 finalists assembled! Final round starts shortly.",
        });
      }

      // Final round is LIVE
      // Fetch Final Round Config (per-team or default)
      const finalConfig =
        (await prisma.roundConfig.findFirst({
          where: { teamId: team.teamId, roundNumber: 5 },
        })) ||
        (await prisma.roundConfig.findFirst({
          where: { teamId: null, roundNumber: 5 },
        }));

      // Fetch team-specific or shared final key assignment
      const keyInfo =
        (await prisma.finalKey.findUnique({
          where: { teamId: team.teamId },
        })) ||
        (await prisma.finalKey.findFirst({
          where: { teamId: null },
        }));

      return jsonSuccess({
        state: "FINAL_ACTIVE",
        roundNumber: 5,
        title: finalConfig?.title || "The Grand Finale: Claim the Treasure",
        clueText: finalConfig?.clueText || keyInfo?.clueText || "Find the hidden golden key to unlock the physical treasure chest!",
        locationText: finalConfig?.locationText || keyInfo?.location || "Central Pavilion",
        finalistPosition: finalist.position,
        serverTime: now.toISOString(),
        instructions:
          "This is the physical finale. Follow the clue, find the hidden key, and unlock the treasure chest before any other team!",
      });
    }

    // Fetch config for Rounds 0 to 4
    let config = await prisma.roundConfig.findFirst({
      where: { teamId: team.teamId, roundNumber: currentRound },
    });

    if (!config) {
      config = await prisma.roundConfig.findFirst({
        where: { teamId: null, roundNumber: currentRound },
      });
    }

    if (!config) {
      return jsonError(`Round ${currentRound} configuration not found.`, 404);
    }

    // Build secure sanitized response without leaking answers
    let sanitizedClueText = config.clueText || "";

    // Apply transformation if configured (Round 2)
    if (config.clueTransform && config.clueTransform !== "NORMAL") {
      sanitizedClueText = applyClueTransformation(sanitizedClueText, config.clueTransform);
    }

    // Parse subQuestions for Round 3 or Qualifier, stripping acceptedAnswers
    let sanitizedSubQuestions = null;
    if (config.subQuestions) {
      try {
        const parsed = JSON.parse(config.subQuestions) as SubQuestion[];
        sanitizedSubQuestions = parsed.map((q) => ({
          id: q.id,
          question: q.question,
        }));
      } catch (e) {
        console.error("Error parsing subQuestions:", e);
      }
    }

    return jsonSuccess({
      state: progress.state,
      roundNumber: currentRound,
      title: config.title,
      clueType: config.clueType,
      locationText: config.locationText,
      clueText: sanitizedClueText,
      clueTransform: config.clueTransform,
      encodedNumbers: config.encodedNumbers,
      imagePath: config.imagePath,
      subQuestions: sanitizedSubQuestions,
      attemptLimit: config.attemptLimit,
      totalAttempts: progress.totalAttempts,
      penaltySeconds: config.penaltySeconds,
      eventStatus: event?.status || "ACTIVE",
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get current round error:", error);
    return jsonError("Server error loading current mission.", 500);
  }
}
