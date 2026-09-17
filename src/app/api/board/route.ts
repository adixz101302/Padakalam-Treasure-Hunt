import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { jsonSuccess, jsonError } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const [event, teams, finalists, winner] = await Promise.all([
      prisma.event.findFirst(),
      prisma.team.findMany({
        select: {
          teamId: true,
          teamName: true,
          isActive: true,
          isDisqualified: true,
          progress: {
            select: {
              currentRound: true,
              currentStep: true,
              state: true,
              totalAttempts: true,
              lastActivityAt: true,
              round1CompletedAt: true,
              round2CompletedAt: true,
              round3CompletedAt: true,
              round4CompletedAt: true,
              completedAt: true,
            },
          },
          finalist: {
            select: {
              position: true,
              qualifiedAt: true,
            },
          },
          winner: {
            select: {
              finalistPosition: true,
              declaredAt: true,
            },
          },
        },
        orderBy: { teamId: "asc" },
      }),
      prisma.finalist.findMany({
        include: { team: { select: { teamId: true, teamName: true } } },
        orderBy: { position: "asc" },
      }),
      prisma.winner.findFirst({
        include: { team: { select: { teamId: true, teamName: true } } },
      }),
    ]);

    let totalTeams = teams.length;
    let activeTeams = 0;
    let disqualifiedCount = 0;
    const distribution = {
      qualifier: 0,
      round1: 0,
      round2: 0,
      round3: 0,
      round4: 0,
      finalists: finalists.length,
      finished: winner ? 1 : 0,
    };

    const formattedTeams = teams.map((t) => {
      const r = t.progress?.currentRound ?? 0;
      const isDisq = t.isDisqualified;
      if (isDisq) {
        disqualifiedCount++;
      } else {
        activeTeams++;
        if (r === 0) distribution.qualifier++;
        else if (r === 1) distribution.round1++;
        else if (r === 2) distribution.round2++;
        else if (r === 3) distribution.round3++;
        else if (r === 4) distribution.round4++;
      }

      return {
        teamId: t.teamId,
        teamName: t.teamName,
        isActive: t.isActive,
        isDisqualified: t.isDisqualified,
        currentRound: r,
        currentStep: t.progress?.currentStep ?? 0,
        state: t.progress?.state ?? "QUALIFIER_ACTIVE",
        totalAttempts: t.progress?.totalAttempts ?? 0,
        lastActivityAt: t.progress?.lastActivityAt,
        isFinalist: !!t.finalist,
        finalistPosition: t.finalist?.position ?? null,
        qualifiedAt: t.finalist?.qualifiedAt ?? null,
        isWinner: !!t.winner,
        winnerDeclaredAt: t.winner?.declaredAt ?? null,
      };
    });

    return jsonSuccess({
      event: {
        name: event?.name || "Padakalam 2.0 // Anveshipin Kandethum",
        status: event?.status || "ACTIVE",
        isLocked: event?.isLocked || false,
      },
      stats: {
        totalTeams,
        activeTeams,
        disqualifiedCount,
        distribution,
      },
      finalists: finalists.map((f) => ({
        position: f.position,
        teamId: f.teamId,
        teamName: f.team.teamName,
        qualifiedAt: f.qualifiedAt,
      })),
      winner: winner
        ? {
            teamId: winner.teamId,
            teamName: winner.team.teamName,
            position: winner.finalistPosition,
            declaredAt: winner.declaredAt,
          }
        : null,
      teams: formattedTeams,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Board API error:", err);
    return jsonError("Failed to fetch live board data.", 500);
  }
}
