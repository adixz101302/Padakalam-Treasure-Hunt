import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { getTeamFromRequest, getAdminFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const roleParam = req.nextUrl.searchParams.get("role");
    const adminSession = getAdminFromRequest(req);
    const teamSession = getTeamFromRequest(req);

    // If explicit admin check
    if (roleParam === "admin") {
      if (adminSession) {
        return jsonSuccess({
          role: "admin",
          admin: { username: adminSession.username },
        });
      }
      return jsonSuccess({ role: "guest" });
    }

    // If team session exists, return team details
    if (teamSession) {
      const team = await prisma.team.findUnique({
        where: { teamId: teamSession.teamId },
        include: {
          progress: true,
          finalist: true,
          winner: true,
        },
      });

      if (team) {
        const event = await prisma.event.findFirst();
        return jsonSuccess({
          role: "team",
          team: {
            id: team.id,
            teamId: team.teamId,
            teamName: team.teamName,
            isActive: team.isActive,
            isDisqualified: team.isDisqualified,
            progress: team.progress,
            finalist: team.finalist,
            winner: team.winner,
          },
          event: {
            status: event?.status || "ACTIVE",
            isLocked: event?.isLocked || false,
            finalStartedAt: event?.finalStartedAt || null,
          },
        });
      }
    }

    // If admin session exists and no team session
    if (adminSession) {
      return jsonSuccess({
        role: "admin",
        admin: {
          username: adminSession.username,
        },
      });
    }

    return jsonSuccess({ role: "guest" });
  } catch (error) {
    console.error("Session check error:", error);
    return jsonError("Server error checking session.", 500);
  }
}
