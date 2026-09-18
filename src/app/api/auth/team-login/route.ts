import { NextRequest, NextResponse } from "next/server";
import prisma, { withRetry } from "@/lib/db";
import { signTeamToken, COOKIE_NAMES } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { jsonError, jsonSuccess } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const teamId = (body.teamId || "").trim().toUpperCase();
    const pin = (body.pin || "").trim();

    if (!teamId) {
      return jsonError("Team ID is required.", 400);
    }

    const team = await withRetry(() =>
      prisma.team.findUnique({
        where: { teamId },
        include: {
          progress: true,
          finalist: true,
          winner: true,
        },
      })
    );

    if (!team) {
      return jsonError("Invalid Team ID. Please check your credentials.", 401);
    }

    if (!team.isActive) {
      return jsonError("This team has been deactivated by event organizers.", 403);
    }

    if (team.isDisqualified) {
      return jsonError("This team has been disqualified from the hunt.", 403);
    }

    // Optional PIN verification if team has a PIN set
    if (team.pin && pin && team.pin !== pin) {
      return jsonError("Invalid PIN for this team.", 401);
    }

    // Generate JWT token
    const token = signTeamToken({
      teamId: team.teamId,
      teamName: team.teamName,
    });

    await logAuditEvent("LOGIN", `Team ${team.teamId} (${team.teamName}) logged in`, team.teamId);

    const response = jsonSuccess({
      message: "Authentication successful",
      team: {
        id: team.id,
        teamId: team.teamId,
        teamName: team.teamName,
        progress: team.progress,
        finalist: team.finalist,
        winner: team.winner,
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: COOKIE_NAMES.TEAM,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Team login error:", error);
    return jsonError("Unable to authenticate at this time. Please try again.", 500);
  }
}
