import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return jsonError("Unauthorized", 401);

    const teams = await prisma.team.findMany({
      include: {
        progress: true,
        finalist: true,
        winner: true,
        submissions: {
          take: 10,
          orderBy: { submittedAt: "desc" },
        },
      },
      orderBy: { teamId: "asc" },
    });

    return jsonSuccess({ teams });
  } catch (error) {
    console.error("List teams error:", error);
    return jsonError("Server error fetching teams.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return jsonError("Unauthorized", 401);

    const body = await req.json();

    // Check if batch import or single team creation
    if (Array.isArray(body.teams)) {
      const createdTeams = [];

      for (const item of body.teams) {
        const teamId = (item.teamId || "").trim().toUpperCase();
        const teamName = (item.teamName || "").trim();
        const pin = (item.pin || "1234").trim();

        if (!teamId || !teamName) continue;

        const team = await prisma.team.upsert({
          where: { teamId },
          update: { teamName, pin },
          create: {
            teamId,
            teamName,
            pin,
            progress: {
              create: {
                state: "QUALIFIER_ACTIVE",
                currentRound: 0,
              },
            },
          },
        });
        createdTeams.push(team);
      }

      await logAuditEvent(
        "ADMIN_ACTION",
        `Admin imported ${createdTeams.length} teams in batch`,
        null,
        { count: createdTeams.length }
      );

      return jsonSuccess({
        message: `Imported ${createdTeams.length} teams successfully.`,
        teams: createdTeams,
      });
    }

    // Single team creation
    const teamId = (body.teamId || "").trim().toUpperCase();
    const teamName = (body.teamName || "").trim();
    const pin = (body.pin || "1234").trim();

    if (!teamId || !teamName) {
      return jsonError("Team ID and Team Name are required.", 400);
    }

    const existing = await prisma.team.findUnique({ where: { teamId } });
    if (existing) {
      return jsonError(`Team ID '${teamId}' already exists.`, 409);
    }

    const newTeam = await prisma.team.create({
      data: {
        teamId,
        teamName,
        pin,
        progress: {
          create: {
            state: "QUALIFIER_ACTIVE",
            currentRound: 0,
          },
        },
      },
      include: { progress: true },
    });

    await logAuditEvent("ADMIN_ACTION", `Admin created team ${teamId} (${teamName})`, teamId);

    return jsonSuccess({ message: "Team created successfully.", team: newTeam });
  } catch (error) {
    console.error("Create team error:", error);
    return jsonError("Server error creating team.", 500);
  }
}
