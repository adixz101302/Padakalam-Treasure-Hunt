import { NextRequest } from "next/server";
import prisma, { withRetry } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";
import { broadcastEvent } from "@/lib/sse";

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) {
      return jsonError("Unauthorized admin action.", 401);
    }

    const body = await req.json();
    const submissionId = typeof body.submissionId === "string" ? body.submissionId : "";
    const action = typeof body.action === "string" ? body.action.toUpperCase() : "";
    const rejectReason = typeof body.rejectReason === "string" ? body.rejectReason.trim() : "";

    if (!submissionId || !["APPROVE", "REJECT"].includes(action)) {
      return jsonError("Invalid submissionId or action.", 400);
    }

    const submission = await withRetry(() =>
      prisma.photoSubmission.findUnique({
        where: { id: submissionId },
        include: { team: true },
      })
    );

    if (!submission) {
      return jsonError("Photo submission record not found.", 404);
    }

    if (action === "APPROVE") {
      // Mark submission as APPROVED and clear heavy base64 string to keep DB ultra-light!
      await withRetry(() =>
        prisma.photoSubmission.update({
          where: { id: submissionId },
          data: {
            status: "APPROVED",
            imageUrl: "[APPROVED_CLEARED]", // Clear image data after approval to save DB space
            reviewedAt: new Date(),
            reviewedBy: admin.username,
          },
        })
      );

      // Advance team to Round 3!
      await withRetry(() =>
        prisma.teamProgress.update({
          where: { teamId: submission.teamId },
          data: {
            currentRound: 3,
            currentStep: 0,
            round2CompletedAt: new Date(),
            state: "ROUND2_COMPLETED",
            lastActivityAt: new Date(),
          },
        })
      );

      // Create Audit Log
      await withRetry(() =>
        prisma.auditLog.create({
          data: {
            eventType: "ROUND_DONE",
            teamId: submission.teamId,
            message: `Admin approved photo for Team ${submission.teamId}. Team advanced to Round 3!`,
          },
        })
      );

      // Broadcast SSE event for real-time UI updates
      broadcastEvent("TEAM_PROGRESS", { teamId: submission.teamId, currentRound: 3 });
      broadcastEvent("PHOTO_VERIFIED", { teamId: submission.teamId, status: "APPROVED" });

      return jsonSuccess({
        success: true,
        message: `Photo APPROVED! Team ${submission.teamId} advanced to Round 3.`,
      });
    } else {
      // Mark submission as REJECTED and clear image payload
      await withRetry(() =>
        prisma.photoSubmission.update({
          where: { id: submissionId },
          data: {
            status: "REJECTED",
            imageUrl: "[REJECTED_CLEARED]",
            rejectReason: rejectReason || "Incorrect location or image unclear. Please capture a clear photo of your target location.",
            reviewedAt: new Date(),
            reviewedBy: admin.username,
          },
        })
      );

      // Create Audit Log
      await withRetry(() =>
        prisma.auditLog.create({
          data: {
            eventType: "ADMIN_ACTION",
            teamId: submission.teamId,
            message: `Admin rejected photo for Team ${submission.teamId}: "${rejectReason || "No reason specified"}"`,
          },
        })
      );

      // Broadcast SSE event
      broadcastEvent("PHOTO_VERIFIED", {
        teamId: submission.teamId,
        status: "REJECTED",
        rejectReason,
      });

      return jsonSuccess({
        success: true,
        message: `Photo REJECTED for Team ${submission.teamId}.`,
      });
    }
  } catch (error) {
    console.error("Error verifying photo:", error);
    return jsonError("Server error processing photo verification.", 500);
  }
}
