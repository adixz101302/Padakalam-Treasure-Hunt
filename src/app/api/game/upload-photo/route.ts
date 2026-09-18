import { NextRequest } from "next/server";
import prisma, { withRetry } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";
import { broadcastEvent } from "@/lib/sse";

export async function POST(req: NextRequest) {
  try {
    const session = getTeamFromRequest(req);
    if (!session) {
      return jsonError("Unauthorized. Please log in.", 401);
    }

    const body = await req.json();
    const roundNumber = Number(body.roundNumber || 2);
    const photoData = typeof body.photoData === "string" ? body.photoData : "";

    if (!photoData || !photoData.startsWith("data:image")) {
      return jsonError("Invalid photo format. Please capture/upload a valid photo.", 400);
    }

    // Verify team progress
    const team = await withRetry(() =>
      prisma.team.findUnique({
        where: { teamId: session.teamId },
        include: { progress: true },
      })
    );

    if (!team || !team.isActive) {
      return jsonError("Team not active.", 403);
    }

    if (team.progress?.currentRound !== roundNumber) {
      return jsonError(`You are currently on Round ${team.progress?.currentRound || 0}, not Round ${roundNumber}.`, 400);
    }

    // Upsert photo submission record with status PENDING
    const existing = await withRetry(() =>
      prisma.photoSubmission.findFirst({
        where: {
          teamId: session.teamId,
          roundNumber,
          status: "PENDING",
        },
      })
    );

    let submission;
    if (existing) {
      submission = await withRetry(() =>
        prisma.photoSubmission.update({
          where: { id: existing.id },
          data: {
            imageUrl: photoData,
            submittedAt: new Date(),
            rejectReason: null,
          },
        })
      );
    } else {
      submission = await withRetry(() =>
        prisma.photoSubmission.create({
          data: {
            teamId: session.teamId,
            roundNumber,
            imageUrl: photoData,
            status: "PENDING",
          },
        })
      );
    }

    // Create Audit Log
    await withRetry(() =>
      prisma.auditLog.create({
        data: {
          eventType: "PHOTO_SUBMITTED",
          teamId: session.teamId,
          message: `Team ${session.teamId} uploaded a photo for Round ${roundNumber} verification.`,
        },
      })
    );

    // Broadcast SSE update so admin panel updates live!
    broadcastEvent("PHOTO_SUBMITTED", {
      teamId: session.teamId,
      roundNumber,
      submissionId: submission.id,
    });

    return jsonSuccess({
      submissionId: submission.id,
      status: "PENDING",
      message: "Photo uploaded successfully! Waiting for organizer review...",
    });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return jsonError("Server error uploading photo. Please try again.", 500);
  }
}
