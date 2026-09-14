import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";
import { logAuditEvent } from "@/lib/audit";
import { broadcastEvent } from "@/lib/sse";

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const teamId = (body.teamId || "").trim().toUpperCase();

    if (!teamId) {
      return jsonError("Team ID is required to declare a winner.", 400);
    }

    const finalist = await prisma.finalist.findUnique({
      where: { teamId },
      include: { team: true },
    });

    if (!finalist) {
      return jsonError(`Team '${teamId}' is not among the qualified 5 finalists.`, 400);
    }

    const now = new Date();

    // Create or update Winner
    const winner = await prisma.winner.upsert({
      where: { teamId },
      update: {
        declaredBy: admin.username,
        declaredAt: now,
      },
      create: {
        teamId,
        finalistPosition: finalist.position,
        declaredBy: admin.username,
        declaredAt: now,
      },
      include: { team: true },
    });

    // Update event status to FINISHED
    await prisma.event.updateMany({
      data: {
        status: "FINISHED",
        winnerTeamId: teamId,
      },
    });

    // Update all teams' state to FINISHED
    await prisma.teamProgress.updateMany({
      data: {
        state: "FINISHED",
      },
    });

    await logAuditEvent(
      "WINNER_DECLARED",
      `🏆 VICTORY! Team ${teamId} (${winner.team.teamName}) has been officially declared WINNER of ANVESHIPIN KANDETHUM!`,
      teamId,
      {
        declaredBy: admin.username,
        finalistPosition: finalist.position,
        timestamp: now.toISOString(),
      }
    );

    // Broadcast celebration to all participant and admin screens
    broadcastEvent("WINNER_DECLARED", {
      teamId: winner.teamId,
      teamName: winner.team.teamName,
      position: winner.finalistPosition,
      declaredBy: admin.username,
      declaredAt: now.toISOString(),
    });

    return jsonSuccess({
      message: `Team ${teamId} (${winner.team.teamName}) officially declared WINNER!`,
      winner: {
        teamId: winner.teamId,
        teamName: winner.team.teamName,
        position: winner.finalistPosition,
        declaredBy: winner.declaredBy,
        declaredAt: winner.declaredAt,
      },
    });
  } catch (error) {
    console.error("Declare winner error:", error);
    return jsonError("Server error declaring winner.", 500);
  }
}
