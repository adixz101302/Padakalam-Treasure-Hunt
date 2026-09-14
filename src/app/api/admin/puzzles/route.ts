import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return jsonError("Unauthorized", 401);

    const roundConfigs = await prisma.roundConfig.findMany({
      orderBy: [{ roundNumber: "asc" }, { teamId: "asc" }],
    });

    const finalKeys = await prisma.finalKey.findMany();

    return jsonSuccess({
      roundConfigs: roundConfigs.map((c) => ({
        ...c,
        acceptedAnswers: JSON.parse(c.acceptedAnswers || "[]"),
        locationAnswers: c.locationAnswers ? JSON.parse(c.locationAnswers) : [],
        subQuestions: c.subQuestions ? JSON.parse(c.subQuestions) : null,
      })),
      finalKeys,
    });
  } catch (error) {
    console.error("Get puzzles error:", error);
    return jsonError("Server error fetching puzzle configurations.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const roundNumber = Number(body.roundNumber);
    const teamId = body.teamId ? body.teamId.trim().toUpperCase() : null;

    if (isNaN(roundNumber) || roundNumber < 0 || roundNumber > 5) {
      return jsonError("Invalid round number (must be 0-5).", 400);
    }

    const acceptedAnswersArray = Array.isArray(body.acceptedAnswers)
      ? body.acceptedAnswers.filter((a: string) => typeof a === "string" && a.trim().length > 0)
      : typeof body.acceptedAnswers === "string"
      ? body.acceptedAnswers.split(",").map((a: string) => a.trim()).filter((a: string) => a.length > 0)
      : [];

    const locationAnswersArray = Array.isArray(body.locationAnswers)
      ? body.locationAnswers.filter((a: string) => typeof a === "string" && a.trim().length > 0)
      : typeof body.locationAnswers === "string"
      ? body.locationAnswers.split(",").map((a: string) => a.trim()).filter((a: string) => a.length > 0)
      : [];

    const subQuestionsJson = body.subQuestions
      ? JSON.stringify(body.subQuestions)
      : null;

    // Check if record exists for this teamId (or null) and roundNumber
    const existing = await prisma.roundConfig.findFirst({
      where: { teamId, roundNumber },
    });

    let config;
    if (existing) {
      config = await prisma.roundConfig.update({
        where: { id: existing.id },
        data: {
          title: body.title || `Round ${roundNumber}`,
          clueType: body.clueType || "TEXT",
          locationText: body.locationText || null,
          clueText: body.clueText || null,
          clueTransform: body.clueTransform || "NORMAL",
          encodedNumbers: body.encodedNumbers || null,
          imagePath: body.imagePath || null,
          acceptedAnswers: JSON.stringify(acceptedAnswersArray),
          locationAnswers: JSON.stringify(locationAnswersArray),
          subQuestions: subQuestionsJson,
          attemptLimit: Number(body.attemptLimit || 0),
          penaltySeconds: Number(body.penaltySeconds || 0),
          hint: body.hint || null,
        },
      });
    } else {
      config = await prisma.roundConfig.create({
        data: {
          teamId,
          roundNumber,
          title: body.title || `Round ${roundNumber}`,
          clueType: body.clueType || "TEXT",
          locationText: body.locationText || null,
          clueText: body.clueText || null,
          clueTransform: body.clueTransform || "NORMAL",
          encodedNumbers: body.encodedNumbers || null,
          imagePath: body.imagePath || null,
          acceptedAnswers: JSON.stringify(acceptedAnswersArray),
          locationAnswers: JSON.stringify(locationAnswersArray),
          subQuestions: subQuestionsJson,
          attemptLimit: Number(body.attemptLimit || 0),
          penaltySeconds: Number(body.penaltySeconds || 0),
          hint: body.hint || null,
        },
      });
    }

    await logAuditEvent(
      "ADMIN_ACTION",
      `Admin updated puzzle configuration for Round ${roundNumber} (${teamId ? `Team ${teamId}` : "Global Master"})`,
      teamId
    );

    return jsonSuccess({
      message: "Puzzle configuration saved successfully.",
      config: {
        ...config,
        acceptedAnswers: acceptedAnswersArray,
        locationAnswers: locationAnswersArray,
        subQuestions: body.subQuestions,
      },
    });
  } catch (error) {
    console.error("Save puzzle config error:", error);
    return jsonError("Server error saving puzzle configuration.", 500);
  }
}
