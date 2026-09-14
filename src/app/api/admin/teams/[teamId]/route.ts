import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";
import { logAuditEvent } from "@/lib/audit";
import { broadcastEvent } from "@/lib/sse";
import { ROUND_STATE_MAP } from "@/lib/state-machine";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return jsonError("Unauthorized", 401);

    const { teamId } = await params;
    const body = await req.json();
    const action = body.action; // "ADVANCE", "RESET_ROUND", "DISQUALIFY", "RESTORE", "UPDATE"

    const team = await prisma.team.findUnique({
      where: { teamId },
      include: { progress: true, finalist: true },
    });

    if (!team) return jsonError("Team not found.", 404);

    if (action === "DISQUALIFY") {
      await prisma.team.update({
        where: { teamId },
        data: { isDisqualified: true },
      });
      await logAuditEvent("DISQUALIFIED", `Admin disqualified team ${teamId}`, teamId);
      broadcastEvent("TEAM_STATUS", { teamId, isDisqualified: true });
      return jsonSuccess({ message: `Team ${teamId} has been disqualified.` });
    }

    if (action === "RESTORE") {
      await prisma.team.update({
        where: { teamId },
        data: { isDisqualified: false, isActive: true },
      });
      await logAuditEvent("RESTORED", `Admin restored team ${teamId}`, teamId);
      broadcastEvent("TEAM_STATUS", { teamId, isDisqualified: false, isActive: true });
      return jsonSuccess({ message: `Team ${teamId} has been restored.` });
    }

    if (action === "ADVANCE") {
      const current = team.progress?.currentRound ?? 0;
      const targetRound = Math.min(5, current + 1);
      const nextState = ROUND_STATE_MAP[targetRound]?.active || "FINAL_ACTIVE";

      await prisma.teamProgress.update({
        where: { teamId },
        data: {
          currentRound: targetRound,
          state: nextState,
          lastActivityAt: new Date(),
        },
      });

      await logAuditEvent(
        "ADMIN_ACTION",
        `Admin manually advanced team ${teamId} from Round ${current} to Round ${targetRound}`,
        teamId
      );

      broadcastEvent("TEAM_PROGRESS", {
        teamId,
        currentRound: targetRound,
        state: nextState,
      });

      return jsonSuccess({
        message: `Advanced team ${teamId} to Round ${targetRound}.`,
      });
    }

    if (action === "RESET_ROUND") {
      const targetRound = Number(body.targetRound ?? 0);
      const targetState = ROUND_STATE_MAP[targetRound]?.active || "QUALIFIER_ACTIVE";

      // If team was a finalist, remove finalist record on reset
      if (team.finalist) {
        await prisma.finalist.delete({ where: { teamId } });
      }

      await prisma.teamProgress.update({
        where: { teamId },
        data: {
          currentRound: targetRound,
          state: targetState,
          lastActivityAt: new Date(),
        },
      });

      await logAuditEvent(
        "ADMIN_ACTION",
        `Admin reset team ${teamId} to Round ${targetRound}`,
        teamId
      );

      broadcastEvent("TEAM_PROGRESS", {
        teamId,
        currentRound: targetRound,
        state: targetState,
      });

      return jsonSuccess({ message: `Reset team ${teamId} to Round ${targetRound}.` });
    }

    if (action === "UPDATE") {
      const updated = await prisma.team.update({
        where: { teamId },
        data: {
          teamName: body.teamName !== undefined ? body.teamName : team.teamName,
          pin: body.pin !== undefined ? body.pin : team.pin,
          isActive: body.isActive !== undefined ? body.isActive : team.isActive,
        },
      });

      return jsonSuccess({ message: "Team updated successfully.", team: updated });
    }

    return jsonError("Unknown action requested.", 400);
  } catch (error) {
    console.error("Update team error:", error);
    return jsonError("Server error updating team.", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return jsonError("Unauthorized", 401);

    const { teamId } = await params;

    await prisma.team.delete({ where: { teamId } });
    await logAuditEvent("ADMIN_ACTION", `Admin deleted team ${teamId}`, teamId);

    return jsonSuccess({ message: `Team ${teamId} deleted successfully.` });
  } catch (error) {
    console.error("Delete team error:", error);
    return jsonError("Server error deleting team.", 500);
  }
}
