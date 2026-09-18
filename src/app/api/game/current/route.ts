import { NextRequest } from "next/server";
import prisma, { withRetry } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";
import { applyClueTransformation, SubQuestion } from "@/lib/answer-validator";

// ─── In-process caches (survive across warm lambda invocations) ───────────────

// Cache event status for 10s (changes rarely)
let cachedEvent: { status: string } | null = null;
let cachedEventAt = 0;

// Cache round configs for 2 minutes — they never change mid-event
type RoundConfigRow = Awaited<ReturnType<typeof prisma.roundConfig.findMany>>[number];
const roundConfigCache = new Map<string, { data: RoundConfigRow[]; at: number }>();
const ROUND_CONFIG_TTL = 120_000; // 2 minutes

async function getCachedEvent() {
  const now = Date.now();
  if (cachedEvent && now - cachedEventAt < 10000) {
    return cachedEvent;
  }
  try {
    const e = await withRetry(() => prisma.event.findFirst({ select: { status: true } }), 2, 200);
    if (e) {
      cachedEvent = e;
      cachedEventAt = now;
    }
    return cachedEvent || { status: "ACTIVE" };
  } catch {
    return cachedEvent || { status: "ACTIVE" };
  }
}

async function getCachedRoundConfig(teamId: string, roundNumber: number): Promise<RoundConfigRow[]> {
  const cacheKey = `${roundNumber}:${teamId}`;
  const defaultKey = `${roundNumber}:null`;
  const now = Date.now();

  const teamEntry = roundConfigCache.get(cacheKey);
  if (teamEntry && now - teamEntry.at < ROUND_CONFIG_TTL) return teamEntry.data;

  const defaultEntry = roundConfigCache.get(defaultKey);
  if (defaultEntry && now - defaultEntry.at < ROUND_CONFIG_TTL) return defaultEntry.data;

  // Cache miss — fetch both team-specific and default config in one query
  const configs = await withRetry(() =>
    prisma.roundConfig.findMany({
      where: {
        roundNumber,
        OR: [{ teamId }, { teamId: null }],
      },
    })
  );

  roundConfigCache.set(cacheKey, { data: configs, at: now });
  return configs;
}

export async function GET(req: NextRequest) {
  try {
    const session = getTeamFromRequest(req);
    if (!session) {
      return jsonError("Unauthorized. Please log in with your Team ID.", 401);
    }

    // Fetch team (with progress/finalist/winner) and event status in PARALLEL
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
      getCachedEvent(),
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

    // Hunt completion check
    const isHuntComplete =
      currentRound >= 5 ||
      (currentRound === 4 &&
        (progress.state === "FINISHED" ||
          progress.state === "FINAL_WAITING" ||
          progress.state === "FINAL_ACTIVE")) ||
      (event?.status === "FINISHED" && currentRound >= 4) ||
      !!team.winner;

    if (isHuntComplete) {
      // Run position-count and winner lookup in PARALLEL (was 3 sequential queries)
      const needsPositionCount = !team.finalist?.position && !!progress.round4CompletedAt;

      const [earlierCompletions, winner] = await Promise.all([
        needsPositionCount
          ? withRetry(() =>
              prisma.teamProgress.count({
                where: {
                  round4CompletedAt: { lt: progress.round4CompletedAt! },
                  teamId: { not: team.teamId },
                },
              })
            )
          : Promise.resolve(null as number | null),
        withRetry(() =>
          prisma.winner.findFirst({
            include: { team: { include: { progress: true } } },
          })
        ),
      ]);

      const myPosition =
        team.finalist?.position ??
        (earlierCompletions !== null ? earlierCompletions + 1 : null);

      let winnerInfo = null;
      if (winner) {
        winnerInfo = {
          teamId: winner.team.teamId,
          teamName: winner.team.teamName,
          position: winner.finalistPosition,
          declaredAt: winner.declaredAt.toISOString(),
          completedAt: (
            winner.team.progress?.round4CompletedAt || winner.declaredAt
          ).toISOString(),
          startedAt: (
            winner.team.progress?.qualifierCompletedAt || winner.team.createdAt
          ).toISOString(),
        };
      } else {
        // No winner declared yet — check if position 1 finalist exists
        const firstFinisher = await withRetry(() =>
          prisma.finalist.findFirst({
            where: { position: 1 },
            include: { team: { include: { progress: true } } },
          })
        );
        if (firstFinisher) {
          winnerInfo = {
            teamId: firstFinisher.team.teamId,
            teamName: firstFinisher.team.teamName,
            position: 1,
            declaredAt: null,
            completedAt: (
              firstFinisher.team.progress?.round4CompletedAt ||
              firstFinisher.qualifiedAt
            ).toISOString(),
            startedAt: (
              firstFinisher.team.progress?.qualifierCompletedAt ||
              firstFinisher.team.createdAt
            ).toISOString(),
          };
        }
      }

      return jsonSuccess({
        state: "COMPLETED",
        isHuntComplete: true,
        isFinished: true,
        roundNumber: 5,
        title: "All Stages Cleared",
        myPosition: myPosition ?? (team.finalist ? team.finalist.position : null),
        completedAt: (
          progress.round4CompletedAt ||
          team.finalist?.qualifiedAt ||
          progress.completedAt ||
          progress.lastActivityAt
        )?.toISOString(),
        startedAt: (progress.qualifierCompletedAt || team.createdAt)?.toISOString(),
        winner: winnerInfo,
        totalAttempts: progress.totalAttempts,
        eventStatus: event?.status || "ACTIVE",
        serverTime: new Date().toISOString(),
      });
    }

    // ── Active team: fetch round config from in-process cache ────────────────
    const configs = await getCachedRoundConfig(session.teamId, currentRound);
    const config =
      configs.find((c) => c.teamId === team.teamId) ||
      configs.find((c) => c.teamId === null);

    if (!config) {
      return jsonError(`Round ${currentRound} configuration not found.`, 404);
    }

    // Build sanitized response (no answer leaking)
    let sanitizedClueText = config.clueText || "";
    if (config.clueTransform && config.clueTransform !== "NORMAL") {
      sanitizedClueText = applyClueTransformation(sanitizedClueText, config.clueTransform);
    }

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
