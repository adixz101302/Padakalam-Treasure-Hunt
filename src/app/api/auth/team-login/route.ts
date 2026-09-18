import { NextRequest } from "next/server";
import prisma, { withRetry } from "@/lib/db";
import { signTeamToken, COOKIE_NAMES } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { jsonError, jsonSuccess } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let sanitizedTeamId = "UNKNOWN";

  try {
    const body = await req.json();
    sanitizedTeamId = (body.teamId || "").trim().toUpperCase();
    const pin = (body.pin || "").trim();

    if (!sanitizedTeamId) {
      return jsonError("Team ID is required.", 400);
    }

    // Wrap query in retry with fast backoff for transient connection resilience
    const team = await withRetry(
      () =>
        prisma.team.findUnique({
          where: { teamId: sanitizedTeamId },
          include: {
            progress: true,
            finalist: true,
            winner: true,
          },
        }),
      2,
      250
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

    // Record login audit event asynchronously to not delay authentication
    logAuditEvent("LOGIN", `Team ${team.teamId} (${team.teamName}) logged in`, team.teamId).catch((err) => {
      console.warn("[Auth AuditLog] Non-critical background audit log skipped:", err?.message || err);
    });

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
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorCode = error?.code || "UNKNOWN";
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isDbTimeout =
      errorCode === "P2024" ||
      errorMsg.toLowerCase().includes("connection pool") ||
      errorMsg.toLowerCase().includes("pool timeout") ||
      errorMsg.toLowerCase().includes("timed out fetching a new connection");

    if (isDbTimeout) {
      console.error(
        `[Auth DB Connection Failure] Route: /api/auth/team-login | Team: ${sanitizedTeamId} | PrismaCode: ${errorCode} | Duration: ${duration}ms | Reason: Connection pool timeout`
      );
      return jsonError(
        "Database connection is currently busy. Please wait a moment and try logging in again.",
        503
      );
    }

    console.error(
      `[Auth Error] Route: /api/auth/team-login | Team: ${sanitizedTeamId} | Code: ${errorCode} | Duration: ${duration}ms:`,
      errorMsg
    );
    return jsonError("Unable to authenticate at this time. Please try again.", 500);
  }
}
