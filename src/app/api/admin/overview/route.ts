import { NextRequest } from "next/server";
import prisma, { withRetry } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) {
      return jsonError("Unauthorized. Admin access required.", 401);
    }

    const [event, teams, finalists, winner, recentLogs] = await withRetry(() =>
      Promise.all([
        prisma.event.findFirst(),
        prisma.team.findMany({
          include: {
            progress: true,
            finalist: true,
            winner: true,
          },
          orderBy: { teamId: "asc" },
        }),
        prisma.finalist.findMany({
          include: { team: { select: { teamId: true, teamName: true } } },
          orderBy: { position: "asc" },
        }),
        prisma.winner.findFirst({
          include: { team: true },
        }),
        prisma.auditLog.findMany({
          take: 25,
          orderBy: { createdAt: "desc" },
        }),
      ])
    );

    // Calculate round distribution
    const distribution = {
      qualifier: 0,
      round1: 0,
      round2: 0,
      round3: 0,
      round4: 0,
      finalists: finalists.length,
      finished: 0,
      disqualified: 0,
    };

    teams.forEach((t) => {
      if (t.isDisqualified) {
        distribution.disqualified++;
        return;
      }
      const r = t.progress?.currentRound ?? 0;
      if (r === 0) distribution.qualifier++;
      else if (r === 1) distribution.round1++;
      else if (r === 2) distribution.round2++;
      else if (r === 3) distribution.round3++;
      else if (r === 4) distribution.round4++;
      else if (r === 5) {
        if (t.winner) distribution.finished++;
      }
    });

    return jsonSuccess({
      event: {
        id: event?.id,
        name: event?.name,
        status: event?.status || "ACTIVE",
        isLocked: event?.isLocked || false,
        finalStartedAt: event?.finalStartedAt,
      },
      stats: {
        totalTeams: teams.length,
        activeTeams: teams.filter((t) => t.isActive && !t.isDisqualified).length,
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
            declaredBy: winner.declaredBy,
            declaredAt: winner.declaredAt,
          }
        : null,
      teams: teams.map((t) => ({
        id: t.id,
        teamId: t.teamId,
        teamName: t.teamName,
        isActive: t.isActive,
        isDisqualified: t.isDisqualified,
        currentRound: t.progress?.currentRound ?? 0,
        state: t.progress?.state ?? "QUALIFIER_ACTIVE",
        totalAttempts: t.progress?.totalAttempts ?? 0,
        lastActivityAt: t.progress?.lastActivityAt,
        isFinalist: !!t.finalist,
        finalistPosition: t.finalist?.position ?? null,
      })),
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        eventType: l.eventType,
        teamId: l.teamId,
        message: l.message,
        details: l.details ? JSON.parse(l.details) : null,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return jsonError("Server error loading admin overview.", 500);
  }
}
