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

    const [team, event] = await Promise.all([
      withRetry(() =>
        prisma.team.findUnique({
          where: { teamId: session.teamId },
          include: {
            progress: true,
            finalist: true,
            winner: true,
          },
        })
      ),
      prisma.event.findFirst(),
    ]);

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

    const currentRound = progress.currentRound;

    // Check if team has completed the hunt:
    // A team has completed ONLY if they reached Round 5, OR Round 4 is marked FINISHED/FINAL_WAITING/FINAL_ACTIVE,
    // OR whole event is FINISHED (and team completed Round 4), OR team is declared winner.
    const isHuntComplete =
      currentRound >= 5 ||
      (currentRound === 4 && (progress.state === "FINISHED" || progress.state === "FINAL_WAITING" || progress.state === "FINAL_ACTIVE")) ||
      (event?.status === "FINISHED" && currentRound >= 4) ||
      !!team.winner;

    if (isHuntComplete) {
      let myPosition: number | null = team.finalist?.position ?? null;
      if (!myPosition && progress.round4CompletedAt) {
        const earlierCompletions = await prisma.teamProgress.count({
          where: {
            round4CompletedAt: {
              lt: progress.round4CompletedAt,
            },
            teamId: { not: team.teamId },
          },
        });
        myPosition = earlierCompletions + 1;
      }

      // Fetch official winner details
      const winner = await prisma.winner.findFirst({
        include: {
          team: {
            include: { progress: true },
          },
        },
      });

      let winnerInfo = null;
      if (winner) {
        winnerInfo = {
          teamId: winner.team.teamId,
          teamName: winner.team.teamName,
          position: winner.finalistPosition,
          declaredAt: winner.declaredAt.toISOString(),
          completedAt: (winner.team.progress?.round4CompletedAt || winner.declaredAt).toISOString(),
          startedAt: (winner.team.progress?.qualifierCompletedAt || winner.team.createdAt).toISOString(),
        };
      } else {
        // If not officially declared yet, find position 1 finisher
        const firstFinisher = await prisma.finalist.findFirst({
          where: { position: 1 },
          include: {
            team: {
              include: { progress: true },
            },
          },
        });
        if (firstFinisher) {
          winnerInfo = {
            teamId: firstFinisher.team.teamId,
            teamName: firstFinisher.team.teamName,
            position: 1,
            declaredAt: null,
            completedAt: (firstFinisher.team.progress?.round4CompletedAt || firstFinisher.qualifiedAt).toISOString(),
            startedAt: (firstFinisher.team.progress?.qualifierCompletedAt || firstFinisher.team.createdAt).toISOString(),
          };
        }
      }

      const now = new Date();
      return jsonSuccess({
        state: "COMPLETED",
        isHuntComplete: true,
        isFinished: true,
        roundNumber: 5,
        title: "All Stages Cleared",
        myPosition: myPosition ?? (team.finalist ? team.finalist.position : null),
        completedAt: (progress.round4CompletedAt || team.finalist?.qualifiedAt || progress.completedAt || progress.lastActivityAt)?.toISOString(),
        startedAt: (progress.qualifierCompletedAt || team.createdAt)?.toISOString(),
        winner: winnerInfo,
        totalAttempts: progress.totalAttempts,
        eventStatus: event?.status || "ACTIVE",
        serverTime: now.toISOString(),
      });
    }

    // Fetch config for Rounds 0 to 4 in a single query
    const configs = await prisma.roundConfig.findMany({
      where: {
        roundNumber: currentRound,
        OR: [{ teamId: team.teamId }, { teamId: null }],
      },
    });

    const config = configs.find((c) => c.teamId === team.teamId) || configs.find((c) => c.teamId === null);

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

    const isLocationVerified = currentRound === 0 || progress.currentStep >= 1;

    return jsonSuccess({
      state: progress.state,
      roundNumber: currentRound,
      currentStep: progress.currentStep,
      isLocationVerified,
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
