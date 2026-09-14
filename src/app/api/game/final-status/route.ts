import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { getTeamFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const session = getTeamFromRequest(req);
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    const team = await prisma.team.findUnique({
      where: { teamId: session.teamId },
      include: {
        progress: true,
        finalist: true,
      },
    });

    if (!team || !team.progress) {
      return jsonError("Team not found.", 404);
    }

    const event = await prisma.event.findFirst();
    const finalists = await prisma.finalist.findMany({
      include: { team: { select: { teamId: true, teamName: true } } },
      orderBy: { position: "asc" },
    });

    const now = new Date();
    const finalStartAt = event?.finalStartedAt;
    const isLive = finalStartAt && now >= new Date(finalStartAt);

    return jsonSuccess({
      isFinalist: !!team.finalist,
      myPosition: team.finalist?.position || null,
      totalFinalists: finalists.length,
      finalists: finalists.map((f) => ({
        position: f.position,
        teamId: f.teamId,
        teamName: f.team.teamName,
        qualifiedAt: f.qualifiedAt,
      })),
      finalStartAt: finalStartAt ? finalStartAt.toISOString() : null,
      serverTime: now.toISOString(),
      isLive: !!isLive,
    });
  } catch (error) {
    console.error("Final status error:", error);
    return jsonError("Server error loading final status.", 500);
  }
}
